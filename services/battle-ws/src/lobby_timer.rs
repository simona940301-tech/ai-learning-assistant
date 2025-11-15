use crate::battle_models::{Match, MatchState, ServerMessage};
use crate::match_logic::get_server_timestamp_ms;
use std::sync::Arc;
use tokio::sync::{RwLock, broadcast};
use tokio::time::{sleep, Duration};
use std::collections::HashMap;
use tracing::{info, warn, error};

type Matches = Arc<RwLock<HashMap<String, Match>>>;
type Connections = Arc<RwLock<HashMap<String, broadcast::Sender<ServerMessage>>>>;

// ============================================
// P5: 服務端權威計時器
// ============================================

const LOBBY_CONFIRM_TIMEOUT_SECONDS: i32 = 15;

/// 啟動房間確認計時器
/// 
/// 功能：
/// 1. 每秒推送 LOBBY_CONFIRMING 消息（包含剩餘時間）
/// 2. 15 秒後自動解散房間（如果未全部確認）
/// 3. 如果雙方都確認，提前結束計時器
pub async fn start_lobby_confirm_timer(
    match_id: String,
    matches: Matches,
    connections: Connections,
) {
    let start_time = get_server_timestamp_ms();
    
    // 更新 match 的計時器開始時間
    {
        let mut matches_guard = matches.write().await;
        if let Some(match_record) = matches_guard.get_mut(&match_id) {
            match_record.confirm_timer_start = Some(start_time);
            match_record.state = MatchState::LobbyConfirming;
            match_record.confirm_countdown = Some(LOBBY_CONFIRM_TIMEOUT_SECONDS);
        } else {
            warn!("Match {} not found when starting timer", match_id);
            return;
        }
    }
    
    // 發送初始確認消息
    let mut countdown = LOBBY_CONFIRM_TIMEOUT_SECONDS;
    let mut last_sent_countdown = countdown;
    
    // 獲取玩家列表（用於推送消息）
    let players = {
        let matches_guard = matches.read().await;
        if let Some(match_record) = matches_guard.get(&match_id) {
            vec![match_record.player1_id.clone(), match_record.player2_id.clone()]
        } else {
            warn!("Match {} not found when getting players", match_id);
            return;
        }
    };
    
    // 發送初始消息
    send_lobby_confirming(&match_id, countdown, &players, &connections).await;
    
    // 計時器循環：每秒檢查一次
    loop {
        sleep(Duration::from_secs(1)).await;
        
        // 檢查 match 是否還存在
        let (should_continue, both_confirmed) = {
            let mut matches_guard = matches.write().await;
            if let Some(match_record) = matches_guard.get_mut(&match_id) {
                // PVE 模式：如果 player2_id 是 "AI"，只需要 player1 確認即可
                let is_pve = match_record.player2_id == "AI" 
                    || match_record.match_type == "PVE_TRAINING" 
                    || match_record.match_type == "PVE_CHALLENGE";
                let both_confirmed = if is_pve {
                    match_record.player1_confirmed
                } else {
                    match_record.player1_confirmed && match_record.player2_confirmed
                };
                
                // ⚠️ 關鍵日誌：確認邏輯狀態
                info!("[LobbyTimer] 🔍 Match {} confirmation check: PVE={}, player1_confirmed={}, player2_confirmed={}, both_confirmed={}, countdown={}", 
                    match_id, is_pve, match_record.player1_confirmed, match_record.player2_confirmed, both_confirmed, countdown);
                
                // 防護性檢查：PVE 模式下不應該要求 player2 確認
                if is_pve && !match_record.player1_confirmed && match_record.player2_confirmed {
                    warn!("[LobbyTimer] ⚠️ WARNING: PVE match {} has player2_confirmed=true but player1_confirmed=false (unexpected state)", match_id);
                }
                
                // 檢查是否雙方都已確認（PVE 模式只需要 player1）
                if both_confirmed {
                    // 雙方都已確認（或 PVE 模式下 player1 已確認），提前結束計時器
                    match_record.state = MatchState::InBattle;
                    info!("[LobbyTimer] Match {} started, state changed to InBattle (PVE: {})", match_id, is_pve);
                    match_record.confirm_countdown = None;
                    (false, true)
                } else {
                    // 更新倒數
                    countdown -= 1;
                    match_record.confirm_countdown = Some(countdown);
                    (true, false)
                }
            } else {
                // Match 不存在（可能已被取消）
                warn!("[LobbyTimer] Match {} not found during timer check", match_id);
                (false, false)
            }
        };
        
        if !should_continue {
            if both_confirmed {
                // 雙方都已確認，發送確認完成消息
                info!("[LobbyTimer] Lobby {} confirmed by both players (or PVE player1), sending LOBBY_CONFIRMED", match_id);
                send_lobby_confirmed(&match_id, &players, &connections, &matches).await;
            } else {
                // 計時器結束或 match 不存在
                if countdown <= 0 {
                    // 超時，解散房間
                    info!("[LobbyTimer] Lobby {} timeout, dissolving", match_id);
                    dissolve_lobby(&match_id, "Timeout: Not all players confirmed", &matches, &connections).await;
                }
            }
            break;
        }
        
        // 每秒推送更新（只在倒數變化時發送）
        if countdown != last_sent_countdown {
            send_lobby_confirming(&match_id, countdown, &players, &connections).await;
            last_sent_countdown = countdown;
        }
        
        // 如果倒數結束，退出循環
        if countdown <= 0 {
            break;
        }
    }
}

/// 發送 LOBBY_CONFIRMING 消息給所有玩家
async fn send_lobby_confirming(
    match_id: &str,
    countdown: i32,
    players: &[String],
    connections: &Connections,
) {
    let message = ServerMessage::LobbyConfirming {
        match_id: match_id.to_string(),
        countdown,
        players: players.to_vec(),
    };
    
    let connections_guard = connections.read().await;
    for player_id in players {
        if let Some(tx) = connections_guard.get(player_id) {
            if let Err(e) = tx.send(message.clone()) {
                warn!("Failed to send LOBBY_CONFIRMING to {}: {}", player_id, e);
            }
        }
    }
}

/// 發送 LOBBY_CONFIRMED 消息給所有玩家
/// 同時發送 MATCH_FOUND 消息（包含題目列表）
async fn send_lobby_confirmed(
    match_id: &str,
    players: &[String],
    connections: &Connections,
    matches: &Matches,
) {
    use crate::battle_models::ServerMessage;
    
    info!("[LobbyTimer] send_lobby_confirmed called for match {}", match_id);
    
    // 獲取題目列表
    let question_list = {
        let matches_guard = matches.read().await;
        if let Some(match_record) = matches_guard.get(match_id) {
            let q_count = match_record.questions.len();
            info!("[LobbyTimer] Match {} has {} questions", match_id, q_count);
            match_record.questions.clone()
        } else {
            warn!("[LobbyTimer] Match {} not found when sending LOBBY_CONFIRMED", match_id);
            return;
        }
    };
    
    info!("[LobbyTimer] Sending LOBBY_CONFIRMED and MATCH_FOUND to {} players", players.len());
    
    let connections_guard = connections.read().await;
    for player_id in players {
        // 跳過 AI 玩家（不需要發送消息）
        if player_id == "AI" {
            info!("[LobbyTimer] ⏭️ Skipping AI player (no message needed)");
            continue;
        }
        
        if let Some(tx) = connections_guard.get(player_id) {
            let receiver_count = tx.receiver_count();
            
            // ⚠️ 關鍵檢查：channel 是否還有接收者（連接是否還存在）
            if receiver_count == 0 {
                warn!("[LobbyTimer] ⚠️⚠️⚠️ CRITICAL: Channel for player {} has NO RECEIVERS (connection closed or receiver not kept alive!)", player_id);
                warn!("[LobbyTimer] ⚠️ This indicates the broadcast::Receiver was dropped. Check ws_handler.rs to ensure receiver is kept alive in tokio::select! loop.");
                continue;
            }
            
            info!("[LobbyTimer] 📡 Channel health check for player {}: receivers={}, channel_open=true", player_id, receiver_count);
            
            // 發送 LOBBY_CONFIRMED
            let confirmed_message = ServerMessage::LobbyConfirmed {
                match_id: match_id.to_string(),
            };
            info!("[LobbyTimer] 📤 Attempting to send LOBBY_CONFIRMED to player {} (receivers: {})", player_id, receiver_count);
            match tx.send(confirmed_message) {
                Ok(_) => {
                    info!("[LobbyTimer] ✅ LOBBY_CONFIRMED sent successfully to {} (receivers: {})", player_id, receiver_count);
                }
                Err(e) => {
                    let current_receivers = tx.receiver_count();
                    error!("[LobbyTimer] ❌❌❌ FAILED to send LOBBY_CONFIRMED to {}: {} (receivers before: {}, after: {})", 
                        player_id, e, receiver_count, current_receivers);
                    error!("[LobbyTimer] ❌ This may indicate channel was closed during send. Check connection lifecycle.");
                    continue; // 跳過 MATCH_FOUND，因為 LOBBY_CONFIRMED 失敗了
                }
            }
            
            // 發送 MATCH_FOUND（包含題目列表）
            let match_found_message = ServerMessage::MatchFound {
                match_id: match_id.to_string(),
                question_list: question_list.clone(),
            };
            let question_count = question_list.len();
            info!("[LobbyTimer] 📤 Attempting to send MATCH_FOUND to player {} with {} questions (receivers: {})", 
                player_id, question_count, tx.receiver_count());
            
            // 驗證 question_list 不為空
            if question_count == 0 {
                warn!("[LobbyTimer] ⚠️ WARNING: question_list is EMPTY for match {}! This will cause frontend to fail.", match_id);
            }
            
            match tx.send(match_found_message) {
                Ok(_) => {
                    info!("[LobbyTimer] ✅ MATCH_FOUND sent successfully to {} with {} questions (receivers: {})", 
                        player_id, question_count, tx.receiver_count());
                }
                Err(e) => {
                    let current_receivers = tx.receiver_count();
                    error!("[LobbyTimer] ❌❌❌ FAILED to send MATCH_FOUND to {}: {} (receivers before: {}, after: {})", 
                        player_id, e, receiver_count, current_receivers);
                    error!("[LobbyTimer] ❌ This may indicate channel was closed during send. Check connection lifecycle.");
                }
            }
        } else {
            warn!("[LobbyTimer] ⚠️ No connection found for player {} (not registered in connections map)", player_id);
            warn!("[LobbyTimer] ⚠️ This may indicate the user never authenticated or connection was removed prematurely.");
        }
    }
    
    // 如果是 PVE 模式，啟動第一輪
    let is_pve = {
        let matches_guard = matches.read().await;
        matches_guard.get(match_id).map(|m| {
            m.player2_id == "AI" || m.match_type == "PVE_TRAINING" || m.match_type == "PVE_CHALLENGE"
        }).unwrap_or(false)
    };
    
    if is_pve {
        let matches_clone = matches.clone();
        let connections_clone = connections.clone();
        let match_id_clone = match_id.to_string();
        tokio::spawn(async move {
            crate::ai_answer_handler::start_round(
                match_id_clone,
                0, // 第一題
                matches_clone,
                connections_clone,
            ).await;
        });
    }
}

/// 解散房間
async fn dissolve_lobby(
    match_id: &str,
    reason: &str,
    matches: &Matches,
    connections: &Connections,
) {
    // 獲取玩家列表
    let players = {
        let matches_guard = matches.read().await;
        if let Some(match_record) = matches_guard.get(match_id) {
            vec![match_record.player1_id.clone(), match_record.player2_id.clone()]
        } else {
            return;
        }
    };
    
    // 發送解散消息
    let message = ServerMessage::LobbyDissolved {
        reason: reason.to_string(),
    };
    
    let connections_guard = connections.read().await;
    for player_id in players {
        if let Some(tx) = connections_guard.get(&player_id) {
            if let Err(e) = tx.send(message.clone()) {
                warn!("Failed to send LOBBY_DISSOLVED to {}: {}", player_id, e);
            }
        }
    }
    
    // 移除 match
    matches.write().await.remove(match_id);
    info!("Lobby {} dissolved: {}", match_id, reason);
}

