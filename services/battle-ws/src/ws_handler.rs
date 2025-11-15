use crate::battle_models::{
    ClientMessage, ServerMessage, Match, MatchState, Question, MysteryHint,
};
use crate::match_postscript::{self, PostscriptCtx};
use crate::tempo::arousal::{calc_arousal_proxy, tempo_hint, PlayerMetrics};
use crate::ai_answer_planner::compute_signed_streak;
use chrono::Utc;
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
        // 優先嘗試從 seed_questions 表獲取官方題目
        let questions = match crate::pve_api_client::fetch_seed_questions(
            subject.as_deref(),
            None, // 不指定難度，隨機選擇
            10,   // numQuestions
        ).await {
            Ok(qs) => {
                info!("✅ Successfully fetched {} seed questions from database", qs.len());
                qs
            }
            Err(e) => {
                warn!("Failed to fetch seed questions: {}, trying PVE questions API", e);
                // 回退方案 1：嘗試 PVE questions API（從題包獲取）
                match crate::pve_api_client::fetch_pve_questions(
                    &user_id,
                    subject.as_deref(),
                    true, // focusOnWeakness
                    10,   // numQuestions
                ).await {
                    Ok(qs) => {
                        info!("✅ Successfully fetched {} questions from PVE API", qs.len());
                        qs
                    }
                    Err(e2) => {
                        warn!("Failed to fetch PVE questions: {}, falling back to mock questions", e2);
                        // 回退方案 2：使用 mock questions
                        self.generate_mock_questions(time_limit)
                    }
                }
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
                info!("[WSHandler] 🔵 CONFIRM_LOBBY received: match={}, user={}", match_id, user_id);
                
                let mut matches = self.matches.write().await;
                if let Some(match_record) = matches.get_mut(&match_id) {
                    // 更新確認狀態
                    let was_player1_confirmed = match_record.player1_confirmed;
                    let was_player2_confirmed = match_record.player2_confirmed;
                    
                    if match_record.player1_id == user_id {
                        match_record.player1_confirmed = true;
                        info!("[WSHandler] ✅ Player1 ({}) confirmed", user_id);
                    } else if match_record.player2_id == user_id {
                        match_record.player2_confirmed = true;
                        info!("[WSHandler] ✅ Player2 ({}) confirmed", user_id);
                    } else {
                        warn!("[WSHandler] ⚠️ User {} is not player1 or player2 in match {}", user_id, match_id);
                    }
                    
                    // PVE 模式：如果 player2_id 是 "AI"，只需要 player1 確認即可
                    let is_pve = match_record.player2_id == "AI" 
                        || match_record.match_type == "PVE_TRAINING" 
                        || match_record.match_type == "PVE_CHALLENGE";
                    
                    // 檢查是否雙方都已確認（PVE 模式只需要 player1）
                    let both_confirmed = if is_pve {
                        match_record.player1_confirmed
                    } else {
                        match_record.player1_confirmed && match_record.player2_confirmed
                    };
                    
                    info!("[WSHandler] Match {} status: PVE={}, player1_confirmed={} (was {}), player2_confirmed={} (was {}), both_confirmed={}", 
                        match_id, is_pve, match_record.player1_confirmed, was_player1_confirmed, 
                        match_record.player2_confirmed, was_player2_confirmed, both_confirmed);
                    
                    // P5: 檢查是否雙方都已確認（計時器會自動處理提前結束）
                    // 但如果是 PVE 模式且 player1 已確認，計時器會在下次循環時處理
                    // 這裡只返回當前狀態，計時器會自動發送 LOBBY_CONFIRMED
                    if both_confirmed {
                        // 雙方都已確認（或 PVE 模式下 player1 已確認），計時器會自動發送 LOBBY_CONFIRMED
                        // 這裡不需要返回消息，計時器會處理
                        info!("[WSHandler] ✅ Match {} confirmed (PVE: {}, player1: {}, player2: {}), timer will send LOBBY_CONFIRMED", 
                            match_id, is_pve, match_record.player1_confirmed, match_record.player2_confirmed);
                        None
                    } else {
                        // 還未全部確認，返回當前倒數狀態
                        info!("[WSHandler] ⏳ Match {} not fully confirmed yet, returning LOBBY_CONFIRMING with countdown {}", 
                            match_id, match_record.confirm_countdown.unwrap_or(15));
                        Some(ServerMessage::LobbyConfirming {
                            match_id: match_id.clone(),
                            countdown: match_record.confirm_countdown.unwrap_or(15),
                            players: vec![match_record.player1_id.clone(), match_record.player2_id.clone()],
                        })
                    }
                } else {
                    warn!("[WSHandler] ❌ Match {} not found when confirming lobby", match_id);
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
            ClientMessage::LeaveBattle { match_id } => {
                info!("Leave battle request: match={}, user={}", match_id, user_id);
                
                let mut matches = self.matches.write().await;
                if let Some(mut match_record) = matches.get_mut(&match_id) {
                    // 標記玩家為投降（對手獲勝）
                    match_record.state = crate::battle_models::MatchState::Finished;
                    let winner = if user_id == match_record.player1_id {
                        match_record.player2_id.clone()
                    } else {
                        match_record.player1_id.clone()
                    };
                    
                    // 生成戰鬥結果事件
                    let battle_result_event = crate::match_logic::generate_battle_result_event(
                        &match_record,
                        match_record.match_type.clone(),
                    );
                    
                    // 發送 BATTLE_END 消息
                    Some(ServerMessage::BattleEnd {
                        winner,
                        final_score: crate::match_logic::get_final_score(&match_record),
                        battle_result_event,
                        retest_suggestions: vec![],
                        recall_overlay: crate::battle_models::RecallOverlayPayload {
                            duration_sec: 30,
                            items: vec![],
                        },
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
                        
                        // Update Elo rankings (PVP only, async, non-blocking)
                        // Note: We use default Elo (1000) for calculation, actual Elo is fetched from DB in API
                        let match_id_clone = match_record.id.clone();
                        let player1_id_clone = match_record.player1_id.clone();
                        let player2_id_clone = match_record.player2_id.clone();
                        let player1_score = match_record.player1_score;
                        let player2_score = match_record.player2_score;
                        let is_pvp = match_record.mode == crate::battle_models::MatchMode::Pvp;
                        
                        if is_pvp {
                            // For PVP matches, update Elo
                            // The API will fetch actual Elo from DB and calculate changes
                            tokio::spawn(async move {
                                if let Err(e) = crate::elo_api_client::update_elo_rankings(
                                    match_id_clone,
                                    player1_id_clone,
                                    player2_id_clone,
                                    1000.0, // Placeholder - API fetches actual from DB
                                    1000.0, // Placeholder - API fetches actual from DB
                                    player1_score,
                                    player2_score,
                                ).await {
                                    error!("Failed to update Elo rankings: {}", e);
                                }
                            });
                        }
                        
                        match_record.state = MatchState::Finished;

                        let postscript_ctx = PostscriptCtx {
                            match_record: &match_record,
                            user_id: &match_record.player1_id,
                            now: Utc::now(),
                        };
                        let cards = match_postscript::generate_retest_cards(&postscript_ctx);
                        let retest_suggestions = match_postscript::summarize_cards(&cards);
                        let recall_overlay = match_postscript::recall_overlay(&postscript_ctx);
                        
                        Some(ServerMessage::BattleEnd {
                            winner,
                            final_score,
                            battle_result_event,
                            retest_suggestions,
                            recall_overlay,
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
                        
                        let (tempo_label, arousal_score) = build_tempo_hint(&match_record);
                        match_record.arousal_level = arousal_score;

                        Some(ServerMessage::AnswerResult {
                            player1_score,
                            player2_score,
                            server_timestamp,
                            tempo_hint: tempo_label,
                            arousal_level: arousal_score,
                            mystery_window_hint: MysteryHint { active: false },
                            reward_popup: None,
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
    /// 
    /// ⚠️ 重要：返回的 `Receiver` 必須被保持活躍，否則 channel 會立即關閉！
    /// 使用 `tokio::select!` 同時處理 WebSocket 和 broadcast channel 消息。
    pub async fn register_connection(&self, user_id: String) -> broadcast::Receiver<ServerMessage> {
        let (tx, rx) = broadcast::channel(100);
        self.connections.write().await.insert(user_id.clone(), tx.clone());
        let receiver_count = tx.receiver_count();
        info!("[WSHandler] ✅ Connection registered for user: {} (channel capacity: 100, receivers: {})", user_id, receiver_count);
        info!("[WSHandler] ⚠️ CRITICAL: Receiver must be kept alive! Use tokio::select! to handle both WebSocket and broadcast messages.");
        rx
    }

    /// 移除連接
    /// 
    /// ⚠️ 注意：移除連接前應該等待一小段時間，確保計時器有機會發送消息。
    pub async fn unregister_connection(&self, user_id: String) {
        let connections_guard = self.connections.read().await;
        let had_receivers = connections_guard.get(&user_id)
            .map(|tx| tx.receiver_count() > 0)
            .unwrap_or(false);
        drop(connections_guard);
        
        self.connections.write().await.remove(&user_id);
        if had_receivers {
            warn!("[WSHandler] ⚠️ Unregistered connection for user: {} (had active receivers)", user_id);
        } else {
            info!("[WSHandler] Connection unregistered for user: {}", user_id);
        }
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

fn collect_user_correctness(match_record: &Match) -> Vec<bool> {
    match_record
        .questions
        .iter()
        .enumerate()
        .filter_map(|(idx, q)| {
            match_record.player1_answers.get(idx).and_then(|ans| ans.as_ref()).map(|answer| {
                answer.trim().eq_ignore_ascii_case(q.correct_answer.trim())
            })
        })
        .collect()
}

fn build_tempo_hint(match_record: &Match) -> (String, f32) {
    let mut samples: Vec<f32> = match_record
        .player1_reaction_times
        .iter()
        .filter_map(|rt| *rt)
        .collect();

    let rt_mean = if samples.is_empty() {
        0.0
    } else {
        samples.iter().sum::<f32>() / samples.len() as f32
    };

    let rt_std = if samples.len() > 1 {
        let mean = rt_mean;
        let variance = samples
            .iter()
            .map(|v| {
                let diff = v - mean;
                diff * diff
            })
            .sum::<f32>()
            / samples.len() as f32;
        variance.sqrt()
    } else {
        0.0
    };

    let answered = match_record.player1_answers.iter().filter(|a| a.is_some()).count();
    let total = match_record.questions.len().max(1);
    let skip_ratio = 1.0 - (answered as f32 / total as f32);
    let streak = compute_signed_streak(&collect_user_correctness(match_record));

    let metrics = PlayerMetrics {
        rt_mean,
        rt_std,
        quick_retries_ratio: 0.0,
        skip_ratio,
        streak,
        self_report: None,
    };
    let score = calc_arousal_proxy(&metrics);
    (tempo_hint(score).to_string(), score)
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
    let mut broadcast_rx: Option<tokio::sync::broadcast::Receiver<ServerMessage>> = None;
    let server_clone = server.clone();

    info!("WebSocket connection established");

    // 接收 WebSocket 消息和 broadcast channel 消息
    loop {
        tokio::select! {
            // 從 WebSocket 接收消息
            msg = ws_receiver.next() => {
                match msg {
                    Some(Ok(Message::Text(text))) => {
                        info!("[WSHandler] 📨 Raw message received: {}", text);
                        match serde_json::from_str::<ClientMessage>(&text) {
                            Ok(client_msg) => {
                                info!("[WSHandler] ✅ Message parsed successfully: {:?}", client_msg);
                                // 處理認證
                                if let ClientMessage::Auth { userId } = &client_msg {
                                    // 如果用戶已經連接，先移除舊連接
                                    if user_id.is_some() && user_id.as_ref() != Some(&userId) {
                                        warn!("[WSHandler] ⚠️ User {} reconnecting, removing old connection", userId);
                                        // 等待一小段時間，確保計時器有機會發送消息
                                        tokio::time::sleep(tokio::time::Duration::from_millis(100)).await;
                                        server_clone.unregister_connection(userId.clone()).await;
                                    }
                                    user_id = Some(userId.clone());
                                    // ⚠️ 重要：保持接收者，這樣 channel 才會保持打開
                                    // 接收者將在 tokio::select! 循環中被保持活躍
                                    broadcast_rx = Some(server_clone.register_connection(userId.clone()).await);
                                    let receiver_status = if broadcast_rx.is_some() {
                                        // 檢查接收者是否有效（通過檢查 channel 狀態）
                                        "active"
                                    } else {
                                        "none"
                                    };
                                    info!("[WSHandler] ✅ Authenticated user: {} (connection registered, receiver kept: {})", userId, receiver_status);
                                    info!("[WSHandler] 📡 Broadcast channel receiver is now active and will be kept alive in tokio::select! loop");
                                }

                                // 處理消息並發送響應
                                info!("[WSHandler] 🔄 Processing message for user: {:?}", user_id);
                                if let Some(response) = server_clone.handle_message(
                                    user_id.clone().unwrap_or_default(),
                                    client_msg.clone(),
                                ).await {
                                    let response_json = serde_json::to_string(&response).unwrap();
                                    info!("[WSHandler] 📤 Response JSON: {}", response_json);
                                    if let Err(e) = ws_sender.send(Message::Text(response_json)).await {
                                        error!("[WSHandler] ❌ Failed to send message: {}", e);
                                        break;
                                    }
                                } else {
                                    info!("[WSHandler] ℹ️ No response message (async processing)");
                                }
                            }
                            Err(e) => {
                                warn!("[WSHandler] ❌ Failed to parse message: {}, raw text: {}", e, text);
                                let error_msg = ServerMessage::Error {
                                    message: format!("Invalid message: {}", e),
                                };
                                let error_json = serde_json::to_string(&error_msg).unwrap();
                                let _ = ws_sender.send(Message::Text(error_json)).await;
                            }
                        }
                    }
                    Some(Ok(Message::Close(_))) => {
                        info!("[WSHandler] WebSocket closed by client for user: {:?}", user_id);
                        break;
                    }
                    Some(Ok(Message::Ping(data))) => {
                        let _ = ws_sender.send(Message::Pong(data)).await;
                    }
                    Some(Err(e)) => {
                        error!("[WSHandler] WebSocket error for user {:?}: {}", user_id, e);
                        break;
                    }
                    None => {
                        info!("[WSHandler] WebSocket stream ended");
                        break;
                    }
                    _ => {}
                }
            }
            // 從 broadcast channel 接收消息並轉發到 WebSocket
            // ⚠️ 重要：這個分支保持 broadcast_rx 活躍，防止 channel 關閉
            msg = async {
                if let Some(ref mut rx) = broadcast_rx {
                    match rx.recv().await {
                        Ok(msg) => Some(msg),
                        Err(broadcast::error::RecvError::Closed) => {
                            warn!("[WSHandler] ⚠️ Broadcast channel closed for user: {:?}", user_id);
                            None
                        }
                        Err(broadcast::error::RecvError::Lagged(skipped)) => {
                            warn!("[WSHandler] ⚠️ Broadcast channel lagged, skipped {} messages for user: {:?}", skipped, user_id);
                            None
                        }
                    }
                } else {
                    // 如果還沒有接收者，永遠等待（使用 pending）
                    std::future::pending::<Option<ServerMessage>>().await
                }
            } => {
                if let Some(server_msg) = msg {
                    let response_json = serde_json::to_string(&server_msg).unwrap();
                    let msg_type = match &server_msg {
                        ServerMessage::LobbyConfirmed { .. } => "LOBBY_CONFIRMED",
                        ServerMessage::MatchFound { .. } => "MATCH_FOUND",
                        ServerMessage::LobbyConfirming { .. } => "LOBBY_CONFIRMING",
                        ServerMessage::RoundStarted { .. } => "ROUND_STARTED",
                        ServerMessage::RoundResolved { .. } => "ROUND_RESOLVED",
                        ServerMessage::BattleEnd { .. } => "BATTLE_END",
                        _ => "OTHER",
                    };
                    info!("[WSHandler] 📤 Forwarding broadcast message [{}] to WebSocket for user: {:?}", msg_type, user_id);
                    if let Err(e) = ws_sender.send(Message::Text(response_json)).await {
                        error!("[WSHandler] ❌ Failed to forward broadcast message [{}] to WebSocket: {}", msg_type, e);
                        break;
                    } else {
                        info!("[WSHandler] ✅ Successfully forwarded broadcast message [{}] to WebSocket", msg_type);
                    }
                } else {
                    // Channel 關閉或 lagged，記錄但不中斷連接
                    warn!("[WSHandler] ⚠️ Broadcast channel returned None (may be closed or lagged)");
                }
            }
        }
    }
    
    // 清理連接（延遲移除，確保計時器有時間發送消息）
    if let Some(ref uid) = user_id {
        info!("[WSHandler] 🔄 Cleaning up connection for user: {} (waiting 100ms for pending messages)", uid);
        // 等待一小段時間，確保計時器有機會發送消息
        tokio::time::sleep(tokio::time::Duration::from_millis(100)).await;
        
        // 檢查連接狀態
        let connections_guard = server_clone.connections.read().await;
        let receiver_count = connections_guard.get(uid)
            .map(|tx| tx.receiver_count())
            .unwrap_or(0);
        drop(connections_guard);
        
        if receiver_count > 0 {
            warn!("[WSHandler] ⚠️ Unregistering connection with {} active receivers (messages may be lost)", receiver_count);
        }
        
        server_clone.unregister_connection(uid.clone()).await;
        info!("[WSHandler] ✅ Connection cleanup completed for user: {}", uid);
    }
    
    info!("[WSHandler] 🔌 WebSocket connection closed for user: {:?}", user_id);
}
