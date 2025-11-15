mod battle_models;
mod match_logic;
mod ws_handler;
mod lobby_timer;
mod redis_pool;
mod battle_event_sender;
mod ai_answer_planner;
mod ai_answer_handler;
mod score_system;
mod pve_api_client; // PVE API 調用模塊
mod dda;
mod tempo;
mod match_postscript;
mod elo;
mod elo_api_client;

use ws_handler::{BattleServer, handle_websocket};
use redis_pool::init_redis_pool;
use tokio::net::TcpListener;
use tracing::info;
use std::env;

// ============================================
// 主函數
// ============================================

#[tokio::main]
async fn main() -> Result<(), Box<dyn std::error::Error>> {
    // 載入 .env 文件（如果存在）
    dotenvy::dotenv().ok();
    
    // 初始化日誌
    tracing_subscriber::fmt()
        .with_env_filter(tracing_subscriber::EnvFilter::from_default_env())
        .init();

    // P4: 初始化 Redis 連接池
    let redis_url = env::var("REDIS_URL").ok();
    if let Err(e) = init_redis_pool(redis_url.as_deref()).await {
        tracing::warn!("Failed to initialize Redis pool: {}. Matchmaking will use fallback logic.", e);
    }

    let server = BattleServer::new();
    let addr = "0.0.0.0:8080";
    let listener = TcpListener::bind(addr).await?;

    info!("Battle WebSocket server starting on ws://{}/ws/battle", addr);

    // 處理連接
    loop {
        match listener.accept().await {
            Ok((stream, addr)) => {
                info!("New connection from: {}", addr);
                let server_clone = server.clone();
                tokio::spawn(async move {
                    handle_websocket(stream, server_clone).await;
                });
            }
            Err(e) => {
                tracing::error!("Failed to accept connection: {}", e);
            }
        }
    }
}
