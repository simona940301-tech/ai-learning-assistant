// AI 答題任務處理模塊
// 實現 RoundStarted → AiPlan → OpponentThinking → 延遲發送流程

use crate::battle_models::{Match, MatchState, ServerMessage, Question};
use crate::ai_answer_planner::plan_answer;
use crate::match_logic::{process_answer_submission, check_battle_end, generate_battle_result_event, get_final_score, get_winner};
use crate::battle_event_sender::send_battle_event_to_api;
use crate::progression_api_client;
use crate::match_postscript::{self, PostscriptCtx};
use futures_util::future::BoxFuture;
use std::sync::Arc;
use tokio::sync::RwLock;
use tokio::time::{sleep, Duration};
use tokio::sync::oneshot;
use tracing::{info, warn};
use std::collections::HashMap;
use chrono::Utc;

// 使用與 ws_handler 相同的類型定義
type Matches = Arc<RwLock<HashMap<String, Match>>>;
type Connections = Arc<RwLock<HashMap<String, tokio::sync::broadcast::Sender<ServerMessage>>>>;

/// 啟動新回合（RoundStarted）- 內部實現
/// 
/// 流程：
/// 1. 發送 RoundStarted 消息
/// 2. 如果是 PVE 模式，規劃 AI 答案
/// 3. 發送 OpponentThinking 消息
/// 4. Spawn 延遲任務發送 AI 答案
async fn start_round_impl(
    match_id: String,
    question_index: usize,
    matches: Matches,
    connections: Connections,
) {
    // 1. 獲取 match 和 question
    let (question, is_pve, player1_id, player2_id) = {
        let matches_guard = matches.read().await;
        if let Some(match_record) = matches_guard.get(&match_id) {
            if question_index >= match_record.questions.len() {
                warn!("Invalid question_index: {} (total: {})", question_index, match_record.questions.len());
                return;
            }
            
            let q = match_record.questions[question_index].clone();
            let is_pve = match_record.player2_id == "AI" 
                || match_record.match_type == "PVE_TRAINING" 
                || match_record.match_type == "PVE_CHALLENGE"
                || match_record.match_type == "ONBOARDING";
            
            (q, is_pve, match_record.player1_id.clone(), match_record.player2_id.clone())
        } else {
            warn!("Match {} not found when starting round", match_id);
            return;
        }
    };
    
    // 2. 發送 RoundStarted 消息
    let round_started = ServerMessage::RoundStarted {
        match_id: match_id.clone(),
        question_index,
        question: question.clone(),
    };
    
    broadcast_to_players(&match_id, &[player1_id.clone(), player2_id.clone()], &round_started, &connections).await;
    
    // 3. 如果是 PVE 模式，啟動 AI 答題流程
    if is_pve {
        let matches_clone = matches.clone();
        let connections_clone = connections.clone();
        let match_id_clone = match_id.clone();
        tokio::spawn(async move {
            start_ai_answer_flow(match_id_clone, question_index, question, matches_clone, connections_clone).await;
        });
    }
}

/// 啟動新回合（RoundStarted）- 公開接口
/// 
/// 這是公開接口，內部調用 start_round_impl
pub fn start_round(
    match_id: String,
    question_index: usize,
    matches: Matches,
    connections: Connections,
) -> BoxFuture<'static, ()> {
    Box::pin(async move {
        start_round_impl(match_id, question_index, matches, connections).await;
    })
}

/// 啟動 AI 答題流程
/// 
/// 1. 規劃 AI 答案（plan_answer）
/// 2. 發送 OpponentThinking 消息
/// 3. Spawn 延遲任務發送答案
async fn start_ai_answer_flow(
    match_id: String,
    question_index: usize,
    question: Question,
    matches: Matches,
    connections: Connections,
) {
    // 1. 規劃 AI 答案
    let ai_plan = {
        let mut matches_guard = matches.write().await;
        if let Some(match_record) = matches_guard.get_mut(&match_id) {
            plan_answer(match_record, &question, question_index)
        } else {
            warn!("Match {} not found when planning AI answer", match_id);
            return;
        }
    };
    
    info!("AI plan created: q={}, correct={}, rt={}ms", question_index, ai_plan.will_be_correct, ai_plan.reaction_ms);
    
    // 2. 發送 OpponentThinking 消息
    let thinking_msg = ServerMessage::OpponentThinking {
        match_id: match_id.clone(),
        question_index,
    };
    
    let matches_guard = matches.read().await;
    if let Some(match_record) = matches_guard.get(&match_id) {
        broadcast_to_players(&match_id, &[match_record.player1_id.clone()], &thinking_msg, &connections).await;
    }
    drop(matches_guard);
    
    // 3. 創建 abort channel
    let (abort_tx, abort_rx) = oneshot::channel();
    
    // 4. 更新 match 的 abort handle
    {
        let mut matches_guard = matches.write().await;
        if let Some(match_record) = matches_guard.get_mut(&match_id) {
            // 取消之前的任務（如果存在）
            if let Some(handle) = match_record.ai_answer_task_handle.take() {
                handle.abort();
            }
            if let Some(old_abort) = match_record.ai_answer_abort.take() {
                let _ = old_abort.send(());
            }
            
            match_record.ai_answer_abort = Some(abort_tx);
        }
    }
    
    // 5. Spawn 延遲任務
    let matches_clone = matches.clone();
    let connections_clone = connections.clone();
    let match_id_clone = match_id.clone();
    let ai_answer = ai_plan.answer.clone();
    let reaction_ms = ai_plan.reaction_ms;
    let will_be_correct = ai_plan.will_be_correct;
    
    let handle = tokio::spawn(async move {
        // 等待反應時間（可被 abort）
        let sleep_future = sleep(Duration::from_millis(reaction_ms));
        tokio::select! {
            _ = sleep_future => {
                // 時間到，發送 AI 答案
                submit_ai_answer(
                    match_id_clone,
                    question_index,
                    ai_answer,
                    will_be_correct,
                    matches_clone,
                    connections_clone,
                ).await;
            }
            _ = abort_rx => {
                // 被取消，不發送答案
                info!("AI answer task aborted for match {}, question {}", match_id_clone, question_index);
            }
        }
    });
    
    // 6. 保存 handle
    {
        let mut matches_guard = matches.write().await;
        if let Some(match_record) = matches_guard.get_mut(&match_id) {
            match_record.ai_answer_task_handle = Some(handle);
        }
    }
}

/// 提交 AI 答案
async fn submit_ai_answer(
    match_id: String,
    question_index: usize,
    answer: String,
    will_be_correct: bool,
    matches: Matches,
    connections: Connections,
) {
    info!("Submitting AI answer: match={}, q={}, answer={}, correct={}", match_id, question_index, answer, will_be_correct);
    
    let mut matches_guard = matches.write().await;
    if let Some(mut match_record) = matches_guard.get_mut(&match_id) {
        // 檢查是否已經回答過（競態條件處理）
        if match_record.player2_answers.get(question_index).and_then(|a| a.as_ref()).is_some() {
            warn!("AI already answered question {} in match {}", question_index, match_id);
            return;
        }
        
        // 處理答案提交
        let player2_id = match_record.player2_id.clone(); // 先複製，避免借用衝突
        let (player1_score, player2_score, _server_timestamp) = process_answer_submission(
            &mut match_record,
            player2_id, // AI 的 user_id
            question_index,
            answer.clone(),
            None, // AI 不需要 client_timestamp
        );
        
        // 更新 AI 答題歷史
        match_record.ai_match_history.push(will_be_correct);
        if will_be_correct {
            match_record.tutorial_ai_correct += 1;
        }
        
        // 檢查對戰是否結束
        if check_battle_end(&match_record) {
            // 對戰結束
            let battle_result_event = generate_battle_result_event(
                &match_record,
                match_record.match_type.clone(),
            );

            let event_clone = battle_result_event.clone();
            tokio::spawn(async move {
                send_battle_event_to_api(event_clone).await;
            });

            let final_score = get_final_score(&match_record);
            let winner = get_winner(&match_record);

            match_record.state = MatchState::Finished;

            let postscript_ctx = PostscriptCtx {
                match_record: &match_record,
                user_id: &match_record.player1_id,
                now: Utc::now(),
            };
            let cards = match_postscript::generate_retest_cards(&postscript_ctx);
            let retest_suggestions = match_postscript::summarize_cards(&cards);
            let recall_overlay = match_postscript::recall_overlay(&postscript_ctx);

            if let Some(payload) = progression_api_client::build_payload(&match_record) {
                tokio::spawn(async move {
                    progression_api_client::apply_battle_progression(payload).await;
                });
            }

            // 發送 BATTLE_END
            let battle_end = ServerMessage::BattleEnd {
                winner,
                final_score,
                battle_result_event,
                retest_suggestions,
                recall_overlay,
            };

            let players = vec![match_record.player1_id.clone(), match_record.player2_id.clone()];
            drop(matches_guard);
            broadcast_to_players(&match_id, &players, &battle_end, &connections).await;
        } else {
            // 發送 ROUND_RESOLVED
            let round_resolved = ServerMessage::RoundResolved {
                match_id: match_id.clone(),
                question_index,
                player1_score,
                player2_score,
            };

            let players = vec![match_record.player1_id.clone(), match_record.player2_id.clone()];

            // 🎯 關鍵修復：檢查是否雙方都已回答
            let both_answered = match_record.player1_answers[question_index].is_some()
                && match_record.player2_answers[question_index].is_some();

            // 獲取下一題索引（如果雙方都回答了，current_question 應該已經推進）
            let next_index = match_record.current_question;
            let total_questions = match_record.questions.len();

            drop(matches_guard);
            broadcast_to_players(&match_id, &players, &round_resolved, &connections).await;

            // 🎯 關鍵修復：只有在雙方都回答後才啟動下一輪
            // 使用延遲調用和 Box::pin 打破循環依賴
            if both_answered && next_index < total_questions {
                info!("AI answered q{}, both players answered, advancing to q{}", question_index, next_index);

                // 使用延遲調用打破循環依賴
                // 通過使用 tokio::spawn 和明確的模塊路徑來打破循環
                let matches_clone = matches.clone();
                let connections_clone = connections.clone();
                let match_id_clone = match_id.clone();
                let next_index_clone = next_index;
                
                // 直接 spawn 已裝箱的 future，避免 async fn 之間的循環類型推導
                tokio::spawn(crate::ai_answer_handler::start_round(
                    match_id_clone,
                    next_index_clone,
                    matches_clone,
                    connections_clone,
                ));
            } else if !both_answered {
                info!("AI answered q{}, waiting for player to answer", question_index);
            }
        }
    }
}

/// 廣播消息給所有玩家
async fn broadcast_to_players(
    _match_id: &str,
    players: &[String],
    message: &ServerMessage,
    connections: &Connections,
) {
    let connections_guard = connections.read().await;
    for player_id in players {
        if let Some(tx) = connections_guard.get(player_id) {
            if let Err(e) = tx.send(message.clone()) {
                warn!("Failed to send message to {}: {}", player_id, e);
            }
        }
    }
}

/// 取消當前 AI 答題任務（用於回合終止）
pub async fn abort_ai_answer_task(match_id: &str, matches: &Matches) {
    let mut matches_guard = matches.write().await;
    if let Some(match_record) = matches_guard.get_mut(match_id) {
        if let Some(handle) = match_record.ai_answer_task_handle.take() {
            handle.abort();
            info!("Aborted AI answer task for match {}", match_id);
        }
        if let Some(abort_tx) = match_record.ai_answer_abort.take() {
            let _ = abort_tx.send(());
        }
    }
}
