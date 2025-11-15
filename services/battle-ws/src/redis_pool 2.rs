use redis::{Client, AsyncCommands, RedisError};
use std::sync::Arc;
use tokio::sync::RwLock;
use tokio::time::{timeout, Duration};
use tracing::{info, warn, error};

// ============================================
// P4: Redis 連接池管理
// ============================================

#[derive(Clone)]
pub struct RedisPool {
    client: Arc<Client>,
}

impl RedisPool {
    /// 創建 Redis 連接池
    pub fn new(redis_url: &str) -> Result<Self, RedisError> {
        let client = Client::open(redis_url)?;
        Ok(Self {
            client: Arc::new(client),
        })
    }

    /// 獲取異步連接（帶超時保護）
    pub async fn get_connection(&self) -> Result<redis::aio::Connection, RedisError> {
        // 設置 5 秒超時
        match timeout(Duration::from_secs(5), self.client.get_async_connection()).await {
            Ok(Ok(conn)) => Ok(conn),
            Ok(Err(e)) => Err(e),
            Err(_) => Err(RedisError::from((redis::ErrorKind::IoError, "Connection timeout"))),
        }
    }

    /// 測試連接（帶超時保護）
    pub async fn ping(&self) -> Result<bool, RedisError> {
        let mut conn = self.get_connection().await?;
        match timeout(Duration::from_secs(2), redis::cmd("PING").query_async::<_, String>(&mut conn)).await {
            Ok(Ok(result)) => Ok(result == "PONG"),
            Ok(Err(e)) => Err(e),
            Err(_) => Err(RedisError::from((redis::ErrorKind::IoError, "Ping timeout"))),
        }
    }
}

// ============================================
// P4: 匹配池操作
// ============================================

#[derive(Clone)]
pub struct MatchPool {
    redis: RedisPool,
}

impl MatchPool {
    pub fn new(redis: RedisPool) -> Self {
        Self { redis }
    }

    /// 生成匹配池 Redis Key
    fn get_pool_key(&self, match_type: &str, subject: Option<&str>) -> String {
        if let Some(subj) = subject {
            format!("matchpool:{}:{}", match_type, subj)
        } else {
            format!("matchpool:{}", match_type)
        }
    }

    /// 生成用戶元數據 Key
    fn get_meta_key(&self, user_id: &str) -> String {
        format!("matchpool:meta:{}", user_id)
    }

    /// 加入匹配隊列（Sorted Set，分數為 Elo）
    /// 
    /// 錯誤處理：返回明確的錯誤，不會導致服務崩潰
    pub async fn add(
        &self,
        user_id: &str,
        elo: f64,
        match_type: &str,
        subject: Option<&str>,
    ) -> Result<(), RedisError> {
        // 設置操作超時（3 秒）
        match timeout(Duration::from_secs(3), async {
            let mut conn = self.redis.get_connection().await?;
            let pool_key = self.get_pool_key(match_type, subject);
            let meta_key = self.get_meta_key(user_id);

            // 存儲用戶元數據到 Hash
            let member_data = serde_json::json!({
                "userId": user_id,
                "matchType": match_type,
                "subject": subject,
                "joinedAt": chrono::Utc::now().timestamp_millis(),
            });

            // 使用 ZADD 將用戶添加到 Sorted Set（分數為 Elo）
            // Redis ZADD 命令：ZADD key score member
            // Rust redis crate: zadd(key, member, score)
            conn.zadd::<_, _, _, ()>(&pool_key, user_id, elo).await?;

            // 存儲元數據到 Hash
            let meta_json = serde_json::to_string(&member_data).unwrap();
            conn.hset::<&str, &str, &str, ()>(&meta_key, "data", &meta_json).await?;
            conn.hset::<&str, &str, &str, ()>(&meta_key, "elo", &elo.to_string()).await?;

            // 設置過期時間（30 分鐘）
            conn.expire::<&str, ()>(&pool_key, 1800).await?;
            conn.expire::<&str, ()>(&meta_key, 1800).await?;

            Ok::<(), RedisError>(())
        }).await {
            Ok(Ok(())) => {
                info!("Added user {} to match pool: {} (Elo: {})", user_id, self.get_pool_key(match_type, subject), elo);
                Ok(())
            }
            Ok(Err(e)) => {
                error!("Redis error adding user {} to match pool: {}", user_id, e);
                Err(e)
            }
            Err(_) => {
                error!("Timeout adding user {} to match pool", user_id);
                Err(RedisError::from((redis::ErrorKind::IoError, "Operation timeout")))
            }
        }
    }

    /// 查找匹配對手（範圍查詢，±100 Elo）
    /// 
    /// 錯誤處理：返回明確的錯誤，不會導致服務崩潰
    pub async fn find_match(
        &self,
        user_id: &str,
        elo: f64,
        match_type: &str,
        subject: Option<&str>,
    ) -> Result<Option<String>, RedisError> {
        // 設置操作超時（3 秒）
        match timeout(Duration::from_secs(3), async {
            let mut conn = self.redis.get_connection().await?;
            let pool_key = self.get_pool_key(match_type, subject);

            // 查找 Elo 範圍內的對手（±100）
            let min_elo = elo - 100.0;
            let max_elo = elo + 100.0;

            // 使用 ZRANGEBYSCORE 查找候選對手
            let candidates: Vec<String> = conn
                .zrangebyscore::<&str, f64, f64, Vec<String>>(&pool_key, min_elo, max_elo)
                .await?;

            // 過濾掉自己，返回第一個對手
            Ok::<Option<String>, RedisError>(candidates.into_iter().find(|id| id != user_id))
        }).await {
            Ok(Ok(Some(opponent))) => {
                info!("Found match: {} vs {} (Elo: {} ± 100)", user_id, opponent, elo);
                Ok(Some(opponent))
            }
            Ok(Ok(None)) => Ok(None),
            Ok(Err(e)) => {
                error!("Redis error finding match for user {}: {}", user_id, e);
                Err(e)
            }
            Err(_) => {
                error!("Timeout finding match for user {}", user_id);
                Err(RedisError::from((redis::ErrorKind::IoError, "Operation timeout")))
            }
        }
    }

    /// 從匹配隊列移除
    /// 
    /// 錯誤處理：即使失敗也不會導致服務崩潰
    pub async fn remove(
        &self,
        user_id: &str,
        match_type: &str,
        subject: Option<&str>,
    ) -> Result<(), RedisError> {
        // 設置操作超時（2 秒）
        match timeout(Duration::from_secs(2), async {
            let mut conn = self.redis.get_connection().await?;
            let pool_key = self.get_pool_key(match_type, subject);
            let meta_key = self.get_meta_key(user_id);

            // 從 Sorted Set 移除
            conn.zrem::<&str, &str, ()>(&pool_key, user_id).await?;

            // 刪除元數據
            conn.del::<&str, ()>(&meta_key).await?;

            Ok::<(), RedisError>(())
        }).await {
            Ok(Ok(())) => {
                info!("Removed user {} from match pool: {}", user_id, self.get_pool_key(match_type, subject));
                Ok(())
            }
            Ok(Err(e)) => {
                warn!("Redis error removing user {} from match pool: {}", user_id, e);
                // 移除操作失敗不應該阻止流程繼續
                Err(e)
            }
            Err(_) => {
                warn!("Timeout removing user {} from match pool", user_id);
                // 超時時返回錯誤，但不會導致服務崩潰
                Err(RedisError::from((redis::ErrorKind::IoError, "Operation timeout")))
            }
        }
    }
}

// ============================================
// 全局 Redis 連接池（單例）
// ============================================

lazy_static::lazy_static! {
    static ref REDIS_POOL: RwLock<Option<RedisPool>> = RwLock::new(None);
}

/// 初始化 Redis 連接池（帶重試機制）
pub async fn init_redis_pool(redis_url: Option<&str>) -> Result<(), RedisError> {
    let url = redis_url.unwrap_or("redis://127.0.0.1:6379/");
    
    // 重試機制：最多重試 3 次
    let mut last_error = None;
    for attempt in 1..=3 {
        match RedisPool::new(url) {
            Ok(pool) => {
                // 測試連接（帶超時）
                match pool.ping().await {
                    Ok(true) => {
                        info!("Redis connection pool initialized successfully (attempt {})", attempt);
                        *REDIS_POOL.write().await = Some(pool);
                        return Ok(());
                    }
                    Ok(false) => {
                        last_error = Some(RedisError::from((redis::ErrorKind::IoError, "Redis ping failed")));
                    }
                    Err(e) => {
                        last_error = Some(e);
                    }
                }
            }
            Err(e) => {
                last_error = Some(e);
            }
        }
        
        if attempt < 3 {
            warn!("Redis initialization attempt {} failed, retrying...", attempt);
            tokio::time::sleep(Duration::from_secs(2)).await;
        }
    }
    
    // 所有重試都失敗
    error!("Failed to initialize Redis pool after 3 attempts");
    Err(last_error.unwrap_or_else(|| RedisError::from((redis::ErrorKind::IoError, "Redis initialization failed"))))
}

/// 獲取 Redis 連接池（用於創建 MatchPool）
pub async fn get_redis_pool() -> Option<RedisPool> {
    REDIS_POOL.read().await.clone()
}

