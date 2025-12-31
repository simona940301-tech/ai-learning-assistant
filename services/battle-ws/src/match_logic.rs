use crate::battle_models::{Match, MatchState, FinalScore, BattleResultEvent};
use std::time::{SystemTime, UNIX_EPOCH};
use tracing::{warn, info};

// ============================================
// P2: 分數計算邏輯（包含 Reaction Time）
// ============================================

/// 計算最終分數
/// 
/// 公式: FinalScore = BaseScore × (1 + Bonus / ReactionTime)
/// 
/// - BaseScore: 基礎分數（答對 = 10，答錯 = 0）
/// - Bonus: 獎勵係數（根據難度調整，範圍 0.1 - 0.5）
/// - ReactionTime: 反應時間（秒），最小值 0.5 秒防止除零
pub fn calculate_score(
    is_correct: bool,
    reaction_time_seconds: f64,
    difficulty: i32,
) -> i32 {
    if !is_correct {
        return 0;
    }

    let base_score = 10.0;
    
    // 根據難度計算獎勵係數
    // 難度越高，獎勵係數越大
    let bonus = match difficulty {
        1..=2 => 0.1,  // 簡單題目
        3 => 0.2,      // 中等題目
        4 => 0.3,      // 困難題目
        5 => 0.5,      // 極難題目
        _ => 0.2,      // 默認
    };

    // 反應時間最小值 0.5 秒，防止除零和過度獎勵
    let reaction_time = reaction_time_seconds.max(0.5);
    
    // 計算最終分數
    let final_score = base_score * (1.0 + bonus / reaction_time);
    
    // 四捨五入到整數
    final_score.round() as i32
}

/// 獲取當前服務端時間戳（毫秒）
pub fn get_server_timestamp_ms() -> i64 {
    SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .unwrap()
        .as_millis() as i64
}

/// 計算反應時間（秒）
/// 
/// 如果客戶端提供了 client_timestamp，則計算差值
/// 否則返回默認值（用於防作弊檢查）
pub fn calculate_reaction_time(
    client_timestamp_ms: Option<i64>,
    server_timestamp_ms: i64,
) -> f64 {
    match client_timestamp_ms {
        Some(client_ts) => {
            let diff_ms = server_timestamp_ms - client_ts;
            // 如果時間差異常（負數或過大），返回默認值
            if diff_ms < 0 || diff_ms > 30000 {
                // 異常情況，返回 5 秒（中等反應時間）
                5.0
            } else {
                diff_ms as f64 / 1000.0
            }
        }
        None => {
            // 客戶端未提供時間戳，使用默認值
            5.0
        }
    }
}

// ============================================
// 匹配邏輯處理
// ============================================

/// 處理答案提交
/// 
/// 返回 (player1_score, player2_score, server_timestamp)
/// 
/// 注意：如果玩家對同一題提交多次答案，只計算第一次
pub fn process_answer_submission(
    match_record: &mut Match,
    player_id: String,
    question_index: usize,
    answer: String,
    client_timestamp_ms: Option<i64>,
) -> (i32, i32, i64) {
    let server_timestamp_ms = get_server_timestamp_ms();
    
    // 驗證題目索引
    if question_index >= match_record.questions.len() {
        warn!("Invalid question_index: {} (total questions: {})", question_index, match_record.questions.len());
        return (match_record.player1_score, match_record.player2_score, server_timestamp_ms);
    }
    
    // 獲取當前問題
    let question = &match_record.questions[question_index];
    let is_correct = answer.trim().to_uppercase() == question.correct_answer.trim().to_uppercase();
    
    // 更新答案和分數
    let is_player1 = player_id == match_record.player1_id;
    
    // 檢查是否已經回答過這題（防止重複計分）
    let already_answered = if is_player1 {
        match_record.player1_answers[question_index].is_some()
    } else {
        match_record.player2_answers[question_index].is_some()
    };
    
    if already_answered {
        // 已經回答過，不重複計分
        warn!("Player {} already answered question {}", player_id, question_index);
        return (match_record.player1_score, match_record.player2_score, server_timestamp_ms);
    }
    
    // 計算反應時間
    let reaction_time = calculate_reaction_time(client_timestamp_ms, server_timestamp_ms);
    
    // 計算分數
    let score = calculate_score(is_correct, reaction_time, question.difficulty);
    
    // 更新答案和分數
    if is_player1 {
        match_record.player1_answers[question_index] = Some(answer.clone());
        match_record.player1_answer_timestamps[question_index] = Some(server_timestamp_ms);
        match_record.player1_score += score;
        if let Some(slot) = match_record.player1_reaction_times.get_mut(question_index) {
            *slot = Some(reaction_time as f32);
        }
    } else {
        match_record.player2_answers[question_index] = Some(answer.clone());
        match_record.player2_answer_timestamps[question_index] = Some(server_timestamp_ms);
        match_record.player2_score += score;
        if let Some(slot) = match_record.player2_reaction_times.get_mut(question_index) {
            *slot = Some(reaction_time as f32);
        }
    }
    
    // 更新當前題目索引
    // PVE 模式：只要 player1 回答就推進到下一題
    // PVP 模式：需要兩個玩家都回答才推進
    // 下一題必須等待雙方（玩家與 AI）都回答，確保動畫節奏一致
    if match_record.current_question == question_index {
        let both_answered = match_record.player1_answers[question_index].is_some() 
            && match_record.player2_answers[question_index].is_some();
        
        if both_answered {
            match_record.current_question += 1;
            info!("Round {} resolved, advancing to question {}", question_index, match_record.current_question);
        }
    }
    
    (match_record.player1_score, match_record.player2_score, server_timestamp_ms)
}

/// 檢查對戰是否結束
/// 
/// 對戰結束條件：
/// 1. 當前題目索引 >= 題目總數（所有題目都已完成）
/// 2. 或者對戰狀態已經是 Finished
pub fn check_battle_end(match_record: &Match) -> bool {
    match_record.current_question >= match_record.questions.len() 
        || match_record.state == MatchState::Finished
}

/// 生成戰鬥結果事件（P9）
/// 
/// 注意：question_id_array 和 is_correct_array 必須一一對應
/// 每個問題 ID 對應一個答案正確性（player1 的答案）
pub fn generate_battle_result_event(
    match_record: &Match,
    match_type: String,
) -> BattleResultEvent {
    let question_ids: Vec<String> = match_record.questions.iter().map(|q| q.id.clone()).collect();
    
    // 記錄 player1 的答案正確性（與 question_id_array 一一對應）
    let mut is_correct_array = Vec::new();
    for i in 0..match_record.questions.len() {
        let q = &match_record.questions[i];
        let player1_correct = match_record.player1_answers[i]
            .as_ref()
            .map(|a| a.trim().to_uppercase() == q.correct_answer.trim().to_uppercase())
            .unwrap_or(false);
        
        // 每個問題 ID 對應一個答案正確性
        is_correct_array.push(player1_correct);
    }
    
    // 注意：對於 PVP 模式，如果需要記錄兩個玩家的答案，
    // 可以發送兩個事件，或者擴展數據結構
    // 目前簡化為只記錄 player1（user_id）的答案
    
    BattleResultEvent {
        user_id: match_record.player1_id.clone(),
        opponent_id: match_record.player2_id.clone(),
        match_id: match_record.id.clone(),
        match_type,
        question_id_array: question_ids,
        is_correct_array,
        final_scores: FinalScore {
            player1: match_record.player1_score,
            player2: match_record.player2_score,
        },
        server_timestamp: get_server_timestamp_ms(),
    }
}

/// 獲取最終分數
pub fn get_final_score(match_record: &Match) -> FinalScore {
    FinalScore {
        player1: match_record.player1_score,
        player2: match_record.player2_score,
    }
}

/// 獲取獲勝者
pub fn get_winner(match_record: &Match) -> String {
    if match_record.player1_score > match_record.player2_score {
        match_record.player1_id.clone()
    } else if match_record.player2_score > match_record.player1_score {
        match_record.player2_id.clone()
    } else {
        // 平局
        "draw".to_string()
    }
}
