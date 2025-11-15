use crate::battle_models::{ClientMessage, ServerMessage, Match, MatchState, Question};
use crate::match_logic::{
    process_answer_submission, check_battle_end, generate_battle_result_event,
    get_final_score, get_winner,
};
use crate::lobby_timer::start_lobby_confirm_timer;
use crate::redis_pool::{get_redis_pool, MatchPool};
use crate::battle_event_sender::send_battle_event_to_api;
use std::collections::HashMap;
use std::sync::Arc;
use tokio::sync::{broadcast, RwLock};
use tokio_tungstenite::tungstenite::Message;
use futures_util::{SinkExt, StreamExt};
use uuid::Uuid;
use tracing::{info, error, warn};

// ============================================
// 連接管理
// ============================================

type Sender = broadcast::Sender<ServerMessage>;
type Connections = Arc<RwLock<HashMap<String, Sender>>>;
type Matches = Arc<RwLock<HashMap<String, Match>>>;

#[derive(Clone)]
pub struct BattleServer {
    connections: Connections,
    matches: Matches,
}

impl BattleServer {
    pub fn new() -> Self {
        Self {
            connections: Arc::new(RwLock::new(HashMap::new())),
            matches: Arc::new(RwLock::new(HashMap::new())),
        }
    }

    /// P4: 處理 StartMatch - 使用 Redis 匹配池
    /// P11: 擴展支持合約金額和 UGC 迷惑模式
    /// PVE Fix: 優先處理 PVE 模式，不需要 Redis 匹配
    async fn handle_start_match(
        &self,
        user_id: String,
        match_type: String,
        subject: Option<String>,
        contract_amount: Option<i32>,
        is_ugc_deceiver_mode: bool,
        time_limit: i32,
    ) -> Option<ServerMessage> {
        // PVE 模式檢測：優先處理，不需要 Redis 匹配
        if match_type == "PVE_TRAINING" || match_type == "PVE_CHALLENGE" {
            info!("PVE mode detected: {}, handling directly", match_type);
            return self.handle_pve_match(user_id, match_type, subject, time_limit).await;
        }

        // PVP 模式：繼續使用 Redis 匹配池
        // 獲取 Redis 連接池並創建 MatchPool
        let redis_pool = match get_redis_pool().await {
            Some(pool) => pool,
            None => {
                warn!("Redis pool not available, using fallback logic");
                return self.handle_start_match_fallback(user_id, match_type, subject, contract_amount, is_ugc_deceiver_mode, time_limit).await;
            }
        };

        let match_pool = MatchPool::new(redis_pool);
        
        // TODO: 獲取用戶 Elo（暫時使用默認值 1000）
        // 未來應該從 Next.js API 或 WebSocket 消息中獲取
        let elo = 1000.0;

        // P4: 嘗試在 Redis 匹配池中查找對手
        match match_pool.find_match(&user_id, elo, &match_type, subject.as_deref()).await {
            Ok(Some(opponent_id)) => {
                // 找到對手，創建對戰
                info!("Match found: {} vs {}", user_id, opponent_id);
                
                // 從匹配池移除雙方
                if let Err(e) = match_pool.remove(&user_id, &match_type, subject.as_deref()).await {
                    warn!("Failed to remove {} from match pool: {}", user_id, e);
                }
                if let Err(e) = match_pool.remove(&opponent_id, &match_type, subject.as_deref()).await {
                    warn!("Failed to remove {} from match pool: {}", opponent_id, e);
                }

                // 創建匹配記錄
                let match_id = Uuid::new_v4().to_string();
                let questions = self.generate_mock_questions(time_limit);
                // P11: 使用帶配置和類型的構造函數
                let match_record = Match::new_with_config_and_type(
                    match_id.clone(),
                    user_id.clone(),
                    opponent_id.clone(),
                    questions.clone(),
                    contract_amount,
                    is_ugc_deceiver_mode,
                    match_type.clone(),
                );
                
                self.matches.write().await.insert(match_id.clone(), match_record);
                
                // P5: 啟動服務端權威計時器
                let matches_clone = self.matches.clone();
                let connections_clone = self.connections.clone();
                let match_id_clone = match_id.clone();
                tokio::spawn(async move {
                    start_lobby_confirm_timer(match_id_clone, matches_clone, connections_clone).await;
                });
                
                Some(ServerMessage::LobbyConfirming {
                    match_id: match_id.clone(),
                    countdown: 15,
                    players: vec![user_id.clone(), opponent_id],
                })
            }
            Ok(None) => {
                // 沒有找到對手，加入匹配池
                info!("No match found, adding {} to match pool", user_id);
                if let Err(e) = match_pool.add(&user_id, elo, &match_type, subject.as_deref()).await {
                    warn!("Failed to add {} to match pool: {}", user_id, e);
                    return Some(ServerMessage::Error {
                        message: format!("Failed to join match pool: {}", e),
                    });
                }
                
                // 返回等待消息
                Some(ServerMessage::LobbyConfirming {
                    match_id: Uuid::new_v4().to_string(),
                    countdown: 0, // 等待匹配中
                    players: vec![user_id],
                })
            }
            Err(e) => {
                error!("Redis error during match finding: {}", e);
                // 回退到模擬邏輯
                self.handle_start_match_fallback(user_id, match_type, subject, contract_amount, is_ugc_deceiver_mode, time_limit).await
            }
        }
    }

    /// 處理 PVE 模式匹配（單人訓練）
    ///
    /// 流程：
    /// 1. 從 Next.js API 獲取題目（通過 /api/play/pve/questions）
    /// 2. 創建 in-memory Match 對象
    /// 3. 寫入 PostgreSQL match_history 表（通過 HTTP API）
    /// 4. 返回 LobbyConfirming 消息，啟動對戰
    async fn handle_pve_match(
        &self,
        user_id: String,
        match_type: String,
        subject: Option<String>,
        time_limit: i32,
    ) -> Option<ServerMessage> {
        info!("Creating PVE match: user={}, type={}, subject={:?}", user_id, match_type, subject);

        let match_id = Uuid::new_v4().to_string();

        // Step 1: 從 Next.js API 獲取題目
        let questions = match crate::pve_api_client::fetch_pve_questions(
            &user_id,
            subject.as_deref(),
            true, // focusOnWeakness
            10,   // numQuestions
        ).await {
            Ok(qs) => {
                info!("Successfully fetched {} questions from API", qs.len());
                qs
            }
            Err(e) => {
                warn!("Failed to fetch questions from API: {}, falling back to mock questions", e);
                // 回退到 mock questions
                self.generate_mock_questions(time_limit)
            }
        };

        // Step 2: 創建 in-memory Match 對象
        let mut match_record = Match::new_with_config_and_type(
            match_id.clone(),
            user_id.clone(),
            "AI".to_string(), // PVE 對手標識
            questions.clone(),
            None, // PVE 不需要合約金額
            false, // PVE 不使用 UGC 迷惑模式
            match_type.clone(),
        );

        // PVE 模式：AI 自動確認，跳過 lobby 確認流程
        match_record.player2_confirmed = true;

        // Step 3: 將 Match 存入 in-memory HashMap
        self.matches.write().await.insert(match_id.clone(), match_record.clone());

        // Step 4: 寫入 PostgreSQL（異步，不阻塞）
        let match_id_clone = match_id.clone();
        let user_id_clone = user_id.clone();
        let match_type_clone = match_type.clone();
        let questions_clone = questions.clone();
        tokio::spawn(async move {
            match crate::pve_api_client::create_pve_match_in_db(
                &match_id_clone,
                &user_id_clone,
                &match_type_clone,
                &questions_clone,
            ).await {
                Ok(_) => {
                    info!("Successfully wrote PVE match {} to PostgreSQL", match_id_clone);
                }
                Err(e) => {
                    warn!("Failed to write PVE match {} to PostgreSQL: {}", match_id_clone, e);
                    // 不阻塞主流程，繼續進行
                }
            }
        });

        // Step 5: 啟動服務端權威計時器（PVE 直接進入對戰）
        let matches_clone = self.matches.clone();
        let connections_clone = self.connections.clone();
        let match_id_clone = match_id.clone();
        tokio::spawn(async move {
            start_lobby_confirm_timer(match_id_clone, matches_clone, connections_clone).await;
        });

        // Step 6: 返回 LobbyConfirming 消息
        Some(ServerMessage::LobbyConfirming {
            match_id: match_id.clone(),
            countdown: 15, // PVE 仍需要確認流程（讓玩家準備）
            players: vec![user_id.clone(), "AI".to_string()],
        })
    }

    /// 回退邏輯（當 Redis 不可用時）
    ///
    /// 錯誤處理：返回明確的錯誤消息給客戶端，或切換到 PVE/模擬對戰
    async fn handle_start_match_fallback(
        &self,
        user_id: String,
        match_type: String,
        _subject: Option<String>,
        contract_amount: Option<i32>,
        is_ugc_deceiver_mode: bool,
        time_limit: i32,
    ) -> Option<ServerMessage> {
        warn!("Using fallback match logic for user: {} (match_type: {})", user_id, match_type);
        
        // 如果是 PVE 模式，允許繼續（不需要匹配）
        if match_type == "PVE_TRAINING" || match_type == "PVE_CHALLENGE" {
            info!("PVE mode detected, creating single-player match");
            
            let match_id = Uuid::new_v4().to_string();
            let questions = self.generate_mock_questions(time_limit);
            
            // PVE 模式：player2_id 設為 "AI" 或空字符串
            // P11: 使用帶配置和類型的構造函數
            let match_record = Match::new_with_config_and_type(
                match_id.clone(),
                user_id.clone(),
                "AI".to_string(), // PVE 對手標識
                questions.clone(),
                contract_amount,
                is_ugc_deceiver_mode,
                match_type.clone(),
            );
            
            // PVE 模式：AI 自動確認
            let mut match_record = match_record;
            match_record.player2_confirmed = true;
            
            self.matches.write().await.insert(match_id.clone(), match_record);
            
            // P5: 啟動服務端權威計時器
            let matches_clone = self.matches.clone();
            let connections_clone = self.connections.clone();
            let match_id_clone = match_id.clone();
            tokio::spawn(async move {
                start_lobby_confirm_timer(match_id_clone, matches_clone, connections_clone).await;
            });
            
            return Some(ServerMessage::LobbyConfirming {
                match_id: match_id.clone(),
                countdown: 15,
                players: vec![user_id.clone(), "AI".to_string()],
            });
        }
        
        // PVP 模式但 Redis 不可用：返回錯誤消息
        error!("Redis unavailable for PVP matchmaking. User: {}, MatchType: {}", user_id, match_type);
        Some(ServerMessage::Error {
            message: "Matchmaking service temporarily unavailable. Please try again later or use PVE mode.".to_string(),
        })
    }

    /// 處理客戶端消息
    pub async fn handle_message(&self, user_id: String, msg: ClientMessage) -> Option<ServerMessage> {
        match msg {
            ClientMessage::Auth { userId } => {
                info!("Auth request from: {}", userId);
                None
            }
            ClientMessage::StartMatch { match_type, subject, contract_amount, is_ugc_deceiver_mode, time_limit } => {
                info!("Start match request: type={}, subject={:?}, contract={:?}, ugc_deceiver={:?}, time_limit={:?}", 
                    match_type, subject, contract_amount, is_ugc_deceiver_mode, time_limit);
                self.handle_start_match(
                    user_id, 
                    match_type, 
                    subject, 
                    contract_amount, 
                    is_ugc_deceiver_mode.unwrap_or(false),
                    time_limit.unwrap_or(20) // 預設 20 秒
                ).await
            }
            ClientMessage::ConfirmLobby { match_id } => {
                info!("Confirm lobby request: match={}, user={}", match_id, user_id);
                
                let mut matches = self.matches.write().await;
                if let Some(match_record) = matches.get_mut(&match_id) {
                    // 更新確認狀態
                    if match_record.player1_id == user_id {
                        match_record.player1_confirmed = true;
                    } else if match_record.player2_id == user_id {
                        match_record.player2_confirmed = true;
                    }
                    
                    // P5: 檢查是否雙方都已確認（計時器會自動處理提前結束）
                    // 這裡只返回當前狀態，計時器會自動發送 LOBBY_CONFIRMED
                    if match_record.player1_confirmed && match_record.player2_confirmed {
                        // 雙方都已確認，計時器會自動發送 LOBBY_CONFIRMED
                        // 這裡不需要返回消息，計時器會處理
                        None
                    } else {
                        // 還未全部確認，返回當前倒數狀態
                        Some(ServerMessage::LobbyConfirming {
                            match_id: match_id.clone(),
                            countdown: match_record.confirm_countdown.unwrap_or(15),
                            players: vec![match_record.player1_id.clone(), match_record.player2_id.clone()],
                        })
                    }
                } else {
                    Some(ServerMessage::Error {
                        message: "Match not found".to_string(),
                    })
                }
            }
            ClientMessage::CancelLobby { match_id } => {
                info!("Cancel lobby request: match={}, user={}", match_id, user_id);
                
                let mut matches = self.matches.write().await;
                if matches.remove(&match_id).is_some() {
                    Some(ServerMessage::LobbyDissolved {
                        reason: "Player cancelled".to_string(),
                    })
                } else {
                    Some(ServerMessage::Error {
                        message: "Match not found".to_string(),
                    })
                }
            }
            ClientMessage::SubmitAnswer { match_id, question_index, answer, client_timestamp } => {
                info!("Answer submitted: match={}, q={}, answer={}", match_id, question_index, answer);
                
                let mut matches = self.matches.write().await;
                if let Some(mut match_record) = matches.get_mut(&match_id) {
                    // 檢查是否已經回答過（競態條件處理）
                    let already_answered = if user_id == match_record.player1_id {
                        match_record.player1_answers.get(question_index).and_then(|a| a.as_ref()).is_some()
                    } else {
                        match_record.player2_answers.get(question_index).and_then(|a| a.as_ref()).is_some()
                    };
                    
                    if already_answered {
                        warn!("Player {} already answered question {}", user_id, question_index);
                        return Some(ServerMessage::Error {
                            message: "Already answered this question".to_string(),
                        });
                    }
                    
                    // 如果是玩家答題且是 PVE 模式，取消 AI 任務（如果 AI 還沒答）
                    let is_pve = match_record.player2_id == "AI" 
                        || match_record.match_type == "PVE_TRAINING" 
                        || match_record.match_type == "PVE_CHALLENGE";
                    
                    if is_pve && user_id == match_record.player1_id {
                        if match_record.player2_answers.get(question_index).and_then(|a| a.as_ref()).is_none() {
                            // AI 還沒答，取消任務
                            if let Some(handle) = match_record.ai_answer_task_handle.take() {
                                handle.abort();
                            }
                            if let Some(abort_tx) = match_record.ai_answer_abort.take() {
                                let _ = abort_tx.send(());
                            }
                        }
                    }
                    
                    // P2: 處理答案提交（包含服務端時間戳和分數計算）
                    let (player1_score, player2_score, server_timestamp) = process_answer_submission(
                        &mut match_record,
                        user_id.clone(),
                        question_index,
                        answer,
                        client_timestamp,
                    );
                    
                    // 更新當前題目的知識點標籤（目前為空，未來從題目數據中提取）
                    match_record.current_topic_tags = Vec::new();
                    
                    // 確保對戰狀態為 InBattle（如果還在 LobbyConfirming 狀態）
                    if match_record.state == MatchState::LobbyConfirming || match_record.state == MatchState::LobbyReady {
                        match_record.state = MatchState::InBattle;
                        info!("Match {} state changed to InBattle", match_id);
                    }
                    
                    // 檢查對戰是否結束（在更新 current_question 之後）
                    info!("Match {}: current_question={}, total_questions={}", match_id, match_record.current_question, match_record.questions.len());
                    
                    if check_battle_end(&match_record) {
                        info!("Match {} ended: current_question={} >= questions.len()={}", match_id, match_record.current_question, match_record.questions.len());
                        
                        // 取消所有 AI 任務
                        if let Some(handle) = match_record.ai_answer_task_handle.take() {
                            handle.abort();
                        }
                        if let Some(abort_tx) = match_record.ai_answer_abort.take() {
                            let _ = abort_tx.send(());
                        }
                        
                        // 生成戰鬥結果事件（P9）
                        let battle_result_event = generate_battle_result_event(
                            &match_record,
                            match_record.match_type.clone(),
                        );
                        
                        // P9: 異步發送戰鬥結果事件到 Next.js API（不阻塞）
                        let event_clone = battle_result_event.clone();
                        tokio::spawn(async move {
                            send_battle_event_to_api(event_clone).await;
                        });
                        
                        let final_score = get_final_score(&match_record);
                        let winner = get_winner(&match_record);
                        
                        match_record.state = MatchState::Finished;
                        
                        Some(ServerMessage::BattleEnd {
                            winner,
                            final_score,
                            battle_result_event,
                        })
                    } else {
                        // 繼續對戰
                        // 如果是 PVE 模式且玩家答題，檢查是否需要啟動下一輪
                        if is_pve && user_id == match_record.player1_id {
                            let next_index = match_record.current_question;
                            let total_questions = match_record.questions.len();
                            
                            if next_index < total_questions {
                                let matches_clone = self.matches.clone();
                                let connections_clone = self.connections.clone();
                                let match_id_clone = match_id.clone();
                                tokio::spawn(async move {
                                    crate::ai_answer_handler::start_round(
                                        match_id_clone,
                                        next_index,
                                        matches_clone,
                                        connections_clone,
                                    ).await;
                                });
                            }
                        }
                        
                        Some(ServerMessage::AnswerResult {
                            player1_score,
                            player2_score,
                            server_timestamp,
                        })
                    }
                } else {
                    Some(ServerMessage::Error {
                        message: "Match not found".to_string(),
                    })
                }
            }
        }
    }

    /// 註冊連接
    pub async fn register_connection(&self, user_id: String) -> broadcast::Receiver<ServerMessage> {
        let (tx, rx) = broadcast::channel(100);
        self.connections.write().await.insert(user_id.clone(), tx.clone());
        info!("Client connected: {}", user_id);
        rx
    }

    /// 移除連接
    pub async fn unregister_connection(&self, user_id: String) {
        self.connections.write().await.remove(&user_id);
        info!("Client disconnected: {}", user_id);
    }

    /// 發送消息給特定用戶
    pub async fn send_to_user(&self, user_id: String, message: ServerMessage) -> Result<(), String> {
        let connections = self.connections.read().await;
        if let Some(tx) = connections.get(&user_id) {
            tx.send(message).map_err(|e| format!("Failed to send: {}", e))?;
            Ok(())
        } else {
            Err(format!("User {} not connected", user_id))
        }
    }

    /// 生成模擬題目（用於開發和測試）
    fn generate_mock_questions(&self, time_limit: i32) -> Vec<Question> {
        vec![
            Question::new_with_time_limit(
                Uuid::new_v4().to_string(),
                "下列哪個是正確的？".to_string(),
                vec![
                    "選項 A".to_string(),
                    "選項 B".to_string(),
                    "選項 C".to_string(),
                    "選項 D".to_string(),
                ],
                "A".to_string(),
                3, // 難度 3
                time_limit, // 使用用戶選擇的時間限制
            ),
            Question::new_with_time_limit(
                Uuid::new_v4().to_string(),
                "第二題的題目內容？".to_string(),
                vec![
                    "選項 A".to_string(),
                    "選項 B".to_string(),
                    "選項 C".to_string(),
                    "選項 D".to_string(),
                ],
                "B".to_string(),
                4, // 難度 4
                time_limit, // 使用用戶選擇的時間限制
            ),
            Question::new_with_time_limit(
                Uuid::new_v4().to_string(),
                "基礎題目範例？".to_string(),
                vec![
                    "選項 A".to_string(),
                    "選項 B".to_string(),
                    "選項 C".to_string(),
                    "選項 D".to_string(),
                ],
                "C".to_string(),
                1, // 難度 1
                time_limit, // 使用用戶選擇的時間限制
            ),
        ]
    }
}

/// 處理 WebSocket 連接
pub async fn handle_websocket(
    stream: tokio::net::TcpStream,
    server: BattleServer,
) {
    use tokio_tungstenite::{accept_hdr_async, tungstenite::handshake::server::{Request, Response, ErrorResponse}};
    
    // WebSocket 握手回調
    fn ws_callback(req: &Request, mut response: Response) -> Result<Response, ErrorResponse> {
        let uri = req.uri();
        info!("WebSocket handshake from: {}", uri);
        info!("WebSocket request headers: {:?}", req.headers());
        
        if uri.path() != "/ws/battle" {
            warn!("Rejected connection to invalid path: {}", uri.path());
            return Err(ErrorResponse::new(Some("Invalid path. Use /ws/battle".to_string())));
        }
        
        // 設置 CORS 頭部（開發環境允許所有來源）
        let headers = response.headers_mut();
        
        // 獲取 Origin 頭部
        let origin = req.headers()
            .get("Origin")
            .and_then(|v| v.to_str().ok())
            .unwrap_or("*");
        
        info!("WebSocket Origin: {}", origin);
        
        // 允許所有來源（開發環境）
        headers.insert(
            "Access-Control-Allow-Origin",
            origin.parse().unwrap_or_else(|_| "*".parse().unwrap()),
        );
        headers.insert(
            "Access-Control-Allow-Credentials",
            "true".parse().unwrap(),
        );
        
        Ok(response)
    }

    let ws_stream = match accept_hdr_async(stream, ws_callback).await {
        Ok(ws) => {
            info!("WebSocket handshake successful");
            ws
        }
        Err(e) => {
            // 檢查是否為普通 HTTP 請求（非 WebSocket）
            let error_msg = e.to_string();
            if error_msg.contains("Connection: upgrade") || error_msg.contains("Upgrade header") {
                warn!("Received non-WebSocket HTTP request (this is normal if accessing via browser). Error: {}", e);
            } else {
            error!("WebSocket handshake failed: {}", e);
            }
            return;
        }
    };

    let (mut ws_sender, mut ws_receiver) = ws_stream.split();
    let mut user_id: Option<String> = None;
    let server_clone = server.clone();

    info!("WebSocket connection established");

    // 接收 WebSocket 消息
    while let Some(msg) = ws_receiver.next().await {
        match msg {
            Ok(Message::Text(text)) => {
                match serde_json::from_str::<ClientMessage>(&text) {
                    Ok(client_msg) => {
                        // 處理認證
                        if let ClientMessage::Auth { userId } = &client_msg {
                            user_id = Some(userId.clone());
                            let _rx = server_clone.register_connection(userId.clone()).await;
                            info!("Authenticated user: {}", userId);
                        }

                        // 處理消息並發送響應
                        if let Some(response) = server_clone.handle_message(
                            user_id.clone().unwrap_or_default(),
                            client_msg.clone(),
                        ).await {
                            let response_json = serde_json::to_string(&response).unwrap();
                            if let Err(e) = ws_sender.send(Message::Text(response_json)).await {
                                error!("Failed to send message: {}", e);
                                break;
                            }
                        }
                    }
                    Err(e) => {
                        warn!("Invalid message format: {}", e);
                        let error_msg = ServerMessage::Error {
                            message: format!("Invalid message: {}", e),
                        };
                        let error_json = serde_json::to_string(&error_msg).unwrap();
                        let _ = ws_sender.send(Message::Text(error_json)).await;
                    }
                }
            }
            Ok(Message::Close(_)) => {
                info!("WebSocket closed by client");
                break;
            }
            Ok(Message::Ping(data)) => {
                let _ = ws_sender.send(Message::Pong(data)).await;
            }
            Err(e) => {
                error!("WebSocket error: {}", e);
                break;
            }
            _ => {}
        }
    }
    
    // 清理連接
    if let Some(ref uid) = user_id {
        server_clone.unregister_connection(uid.clone()).await;
    }
    
    info!("WebSocket connection closed for user: {:?}", user_id);
}
