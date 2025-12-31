// DDA AI 答題系統核心模塊
// 實現動態難度調整（Dynamic Difficulty Adjustment）的 AI 答題邏輯

use crate::battle_models::{Match, Question};
use std::collections::HashMap;
use rand::Rng;
use tracing::info;

// ============================================
// DDA 工具函式
// ============================================

/// 計算用戶因子（基於最近表現）
/// 
/// 返回值範圍：0.5 (連輸) ~ 1.5 (連勝)
/// - 連輸 3+ 題：返回 < 0.8（降低 AI 難度）
/// - 連勝 3+ 題：返回 > 1.2（提高 AI 難度）
pub fn calc_user_factor(user_recent_results: &[bool], window: usize) -> f64 {
    if user_recent_results.is_empty() {
        return 1.0; // 默認中性
    }
    
    let recent: Vec<bool> = user_recent_results.iter().rev().take(window).copied().collect();
    let win_rate = recent.iter().filter(|&&r| r).count() as f64 / recent.len() as f64;
    
    // 計算因子：勝率越高，因子越大（AI 更強）
    // 目標：讓用戶勝率維持在 0.55-0.65
    let factor = if win_rate < 0.4 {
        // 連輸：降低 AI 難度
        0.7 + (win_rate / 0.4) * 0.2 // 0.7 ~ 0.9
    } else if win_rate > 0.7 {
        // 連勝：提高 AI 難度
        1.1 + ((win_rate - 0.7) / 0.3) * 0.4 // 1.1 ~ 1.5
    } else {
        // 正常範圍：接近 1.0
        0.9 + (win_rate - 0.4) / 0.3 * 0.2 // 0.9 ~ 1.1
    };
    
    factor.clamp(0.5, 1.5)
}

/// 計算 AI 的調整係數 m_ai
/// 
/// 基於：
/// - AI 的歷史表現（ai_match_history）
/// - 當前題目的知識點掌握度（ai_mastery_by_tag）
/// - 用戶因子（user_factor）
pub fn calc_m_ai(
    ai_history: &[bool],
    mastery_by_tag: &HashMap<String, f64>,
    topic_tags: &[String],
    user_factor: f64,
    window: usize,
) -> f64 {
    // 1. 計算 AI 歷史勝率
    let ai_win_rate = if ai_history.is_empty() {
        0.6 // 默認 60% 勝率
    } else {
        let recent: Vec<bool> = ai_history.iter().rev().take(window).copied().collect();
        recent.iter().filter(|&&r| r).count() as f64 / recent.len() as f64
    };
    
    // 2. 計算當前題目的掌握度
    let topic_mastery = if topic_tags.is_empty() {
        0.7 // 默認掌握度
    } else {
        let avg_mastery: f64 = topic_tags
            .iter()
            .filter_map(|tag| mastery_by_tag.get(tag))
            .sum::<f64>() / topic_tags.len() as f64;
        avg_mastery.max(0.3).min(0.95) // 限制在 0.3-0.95
    };
    
    // 3. 綜合計算 m_ai
    // m_ai 越高，AI 越強
    let base_m = (ai_win_rate * 0.4 + topic_mastery * 0.6) * user_factor;
    base_m.clamp(0.3, 1.2)
}

/// 計算答對概率
/// 
/// p = base_success * m_ai * user_factor
/// 然後 clamp 到 [0.15, 0.95]
pub fn p_correct(base_success: f64, m_ai: f64, user_factor: f64) -> f64 {
    let p = base_success * m_ai * user_factor;
    p.clamp(0.15, 0.95)
}

/// 採樣反應時間（毫秒）
/// 
/// 反應時間與 m_ai 和 user_factor 相關：
/// - m_ai 高（AI 強）：反應更快
/// - user_factor 高（用戶強）：AI 反應更快（更有挑戰性）
/// 
/// 基礎反應時間：1500-3000ms
/// 調整後：800-4000ms
pub fn sample_rt(m_ai: f64, user_factor: f64) -> u64 {
    let mut rng = rand::thread_rng();
    
    // 基礎反應時間範圍
    let base_min = 1500u64;
    let base_max = 3000u64;
    
    // 調整係數：m_ai 和 user_factor 越高，反應越快
    let speed_factor = (m_ai * user_factor).min(1.5);
    let adjusted_min = (base_min as f64 / speed_factor) as u64;
    let adjusted_max = (base_max as f64 / speed_factor) as u64;
    
    // 確保範圍合理：先 clamp 到 [800, 4000]，然後確保 min <= max
    let min_rt = adjusted_min.max(800).min(4000);
    let max_rt = adjusted_max.max(800).min(4000);
    
    // 確保 min_rt <= max_rt（防止空範圍）
    let final_min = min_rt.min(max_rt);
    let final_max = min_rt.max(max_rt);
    
    rng.gen_range(final_min..=final_max)
}

// ============================================
// AI 答題規劃
// ============================================

/// AI 答題計劃
#[derive(Debug, Clone)]
pub struct AiPlan {
    pub will_be_correct: bool, // 是否會答對
    pub choice_index: usize, // 選擇的選項索引（0-based）
    pub reaction_ms: u64, // 反應時間（毫秒）
    pub answer: String, // 答案字符串（如 "A", "B"）
}

/// 規劃 AI 答案
/// 
/// 流程：
/// 1. 計算 user_factor（基於用戶最近表現）
/// 2. 計算 m_ai（基於 AI 歷史和題目掌握度）
/// 3. 計算 p_correct（答對概率）
/// 4. 擲骰決定 will_be_correct
/// 5. 根據 will_be_correct 選擇答案（正確或干擾度優先的錯誤選項）
/// 6. 採樣反應時間
pub fn plan_answer(
    match_record: &Match,
    question: &Question,
    question_index: usize,
) -> AiPlan {
    // 1. 獲取用戶最近表現（從 player1 的答案正確性推斷）
    let user_recent_results: Vec<bool> = match_record
        .questions
        .iter()
        .enumerate()
        .filter_map(|(idx, q)| {
            if idx >= question_index {
                return None; // 未來的題目
            }
            match_record.player1_answers.get(idx).and_then(|ans| {
                ans.as_ref().map(|a| {
                    a.trim().to_uppercase() == q.correct_answer.trim().to_uppercase()
                })
            })
        })
        .collect();
    
    // 2. 計算 user_factor
    let user_factor = calc_user_factor(&user_recent_results, match_record.dda_window);
    
    // 3. 計算 m_ai
    let m_ai = calc_m_ai(
        &match_record.ai_match_history,
        &match_record.ai_mastery_by_tag,
        &match_record.current_topic_tags,
        user_factor,
        match_record.dda_window,
    );
    
    // 4. 基礎成功率（根據題目難度）
    let base_success = match question.difficulty {
        1 => 0.85,
        2 => 0.80,
        3 => 0.75,
        4 => 0.70,
        5 => 0.65,
        _ => 0.75,
    };
    
    // 5. 計算答對概率
    let p = p_correct(base_success, m_ai, user_factor);
    
    // 6. 擲骰決定是否答對
    let mut rng = rand::thread_rng();
    let will_be_correct = rng.gen_bool(p);
    
    // 7. 選擇答案
    let choice_index = if will_be_correct {
        // 答對：選擇正確答案的索引
        question.options
            .iter()
            .position(|opt| opt.trim().to_uppercase() == question.correct_answer.trim().to_uppercase())
            .unwrap_or(0)
    } else {
        // 答錯：選擇「干擾度優先」的錯誤選項
        // 策略：選擇與正確答案最相似的選項（通常是相鄰選項）
        let correct_index = question.options
            .iter()
            .position(|opt| opt.trim().to_uppercase() == question.correct_answer.trim().to_uppercase())
            .unwrap_or(0);
        
        // 優先選擇相鄰選項（干擾度最高）
        let wrong_options: Vec<usize> = (0..question.options.len())
            .filter(|&i| i != correct_index)
            .collect();
        
        // 選擇最接近正確答案的錯誤選項
        wrong_options
            .iter()
            .min_by_key(|&&idx| (idx as i32 - correct_index as i32).abs())
            .copied()
            .unwrap_or(0)
    };
    
    // 8. 轉換為答案字符串（A, B, C, D）
    let answer = if choice_index < question.options.len() {
        match choice_index {
            0 => "A".to_string(),
            1 => "B".to_string(),
            2 => "C".to_string(),
            3 => "D".to_string(),
            _ => format!("{}", (b'A' + choice_index as u8) as char),
        }
    } else {
        "A".to_string()
    };
    
    // 9. 採樣反應時間
    let reaction_ms = sample_rt(m_ai, user_factor);
    
    info!(
        "AI plan: q={}, correct={}, p={:.2}, m_ai={:.2}, user_factor={:.2}, rt={}ms",
        question_index, will_be_correct, p, m_ai, user_factor, reaction_ms
    );
    
    AiPlan {
        will_be_correct,
        choice_index,
        reaction_ms,
        answer,
    }
}

// ============================================
// 單元測試
// ============================================

#[cfg(test)]
mod tests {
    use super::*;
    use std::collections::HashMap;

    // ============================================
    // calc_user_factor 測試
    // ============================================

    #[test]
    fn test_calc_user_factor_empty() {
        // 空歷史：應返回默認值 1.0
        let factor = calc_user_factor(&[], 5);
        assert_eq!(factor, 1.0);
    }

    #[test]
    fn test_calc_user_factor_連輸場景() {
        // 連輸 4 題：勝率 = 0/4 = 0.0 < 0.4
        // 預期：factor < 0.8（降低 AI 難度）
        let results = vec![false, false, false, false];
        let factor = calc_user_factor(&results, 5);
        
        assert!(factor < 0.8, "連輸時 factor 應 < 0.8，實際: {}", factor);
        assert!(factor >= 0.5, "factor 應 >= 0.5，實際: {}", factor);
        
        // 驗證具體計算：win_rate = 0.0，應在 0.7 ~ 0.9 範圍
        // factor = 0.7 + (0.0 / 0.4) * 0.2 = 0.7
        assert!(factor >= 0.7 && factor <= 0.9, "連輸時 factor 應在 0.7-0.9，實際: {}", factor);
    }

    #[test]
    fn test_calc_user_factor_連勝場景() {
        // 連勝 4 題：勝率 = 4/4 = 1.0 > 0.7
        // 預期：factor > 1.2（提高 AI 難度）
        let results = vec![true, true, true, true];
        let factor = calc_user_factor(&results, 5);
        
        assert!(factor > 1.2, "連勝時 factor 應 > 1.2，實際: {}", factor);
        assert!(factor <= 1.5, "factor 應 <= 1.5，實際: {}", factor);
        
        // 驗證具體計算：win_rate = 1.0，應在 1.1 ~ 1.5 範圍
        // factor = 1.1 + ((1.0 - 0.7) / 0.3) * 0.4 = 1.1 + 0.4 = 1.5
        assert!(factor >= 1.1 && factor <= 1.5, "連勝時 factor 應在 1.1-1.5，實際: {}", factor);
    }

    #[test]
    fn test_calc_user_factor_正常範圍() {
        // 正常表現：勝率 = 3/5 = 0.6（在 0.4-0.7 之間）
        // 預期：factor 接近 1.0
        let results = vec![true, false, true, true, false];
        let factor = calc_user_factor(&results, 5);
        
        assert!(factor >= 0.9 && factor <= 1.1, "正常範圍 factor 應在 0.9-1.1，實際: {}", factor);
    }

    #[test]
    fn test_calc_user_factor_window限制() {
        // 測試 window 參數：只考慮最近 3 題
        // 歷史：前 2 題輸，後 3 題贏
        // window=3：只看後 3 題（全贏），應返回高 factor
        let results = vec![false, false, true, true, true];
        let factor = calc_user_factor(&results, 3);
        
        // 只看最近 3 題（全贏），勝率 = 1.0
        assert!(factor > 1.2, "window=3 只看最近 3 題全贏，factor 應 > 1.2，實際: {}", factor);
    }

    #[test]
    fn test_calc_user_factor_clamp邊界() {
        // 極端情況：確保 clamp 生效
        // 全輸：factor 應被 clamp 到 >= 0.5
        let all_lose = vec![false; 10];
        let factor_lose = calc_user_factor(&all_lose, 5);
        assert!(factor_lose >= 0.5, "全輸時 factor 應 >= 0.5，實際: {}", factor_lose);
        
        // 全贏：factor 應被 clamp 到 <= 1.5
        let all_win = vec![true; 10];
        let factor_win = calc_user_factor(&all_win, 5);
        assert!(factor_win <= 1.5, "全贏時 factor 應 <= 1.5，實際: {}", factor_win);
    }

    // ============================================
    // calc_m_ai 測試
    // ============================================

    #[test]
    fn test_calc_m_ai_empty_history() {
        // 空歷史：應使用默認值 0.6
        let mastery = HashMap::new();
        let tags = vec![];
        let user_factor = 1.0;
        
        let m_ai = calc_m_ai(&[], &mastery, &tags, user_factor, 5);
        
        // base_m = (0.6 * 0.4 + 0.7 * 0.6) * 1.0 = 0.24 + 0.42 = 0.66
        // 應在 0.3-1.2 範圍內
        assert!(m_ai >= 0.3 && m_ai <= 1.2, "m_ai 應在 0.3-1.2，實際: {}", m_ai);
    }

    #[test]
    fn test_calc_m_ai_with_mastery() {
        // 測試知識點掌握度影響
        let mut mastery = HashMap::new();
        mastery.insert("algebra".to_string(), 0.9);
        mastery.insert("geometry".to_string(), 0.8);
        let tags = vec!["algebra".to_string(), "geometry".to_string()];
        
        let m_ai = calc_m_ai(&[], &mastery, &tags, 1.0, 5);
        
        // topic_mastery = (0.9 + 0.8) / 2 = 0.85
        // base_m = (0.6 * 0.4 + 0.85 * 0.6) * 1.0 = 0.24 + 0.51 = 0.75
        assert!(m_ai > 0.7, "高掌握度時 m_ai 應較高，實際: {}", m_ai);
    }

    #[test]
    fn test_calc_m_ai_user_factor影響() {
        // 測試 user_factor 對 m_ai 的影響
        let mastery = HashMap::new();
        let tags = vec![];
        
        let m_ai_low = calc_m_ai(&[], &mastery, &tags, 0.7, 5);  // 用戶弱
        let m_ai_high = calc_m_ai(&[], &mastery, &tags, 1.3, 5); // 用戶強
        
        // user_factor 高時，m_ai 也應較高
        assert!(m_ai_high > m_ai_low, "user_factor 高時 m_ai 應更高");
    }

    #[test]
    fn test_calc_m_ai_clamp邊界() {
        // 確保 m_ai 被 clamp 到 [0.3, 1.2]
        let mastery = HashMap::new();
        let tags = vec![];
        
        // 極端 user_factor
        let m_ai = calc_m_ai(&[], &mastery, &tags, 2.0, 5);
        assert!(m_ai <= 1.2, "m_ai 應被 clamp 到 <= 1.2，實際: {}", m_ai);
        
        let m_ai_low = calc_m_ai(&[], &mastery, &tags, 0.1, 5);
        assert!(m_ai_low >= 0.3, "m_ai 應被 clamp 到 >= 0.3，實際: {}", m_ai_low);
    }

    // ============================================
    // p_correct 測試
    // ============================================

    #[test]
    fn test_p_correct_clamp下限() {
        // 測試下限 clamp：即使計算值 < 0.15，也應返回 0.15
        let p = p_correct(0.1, 0.3, 0.5); // base * m_ai * user_factor = 0.1 * 0.3 * 0.5 = 0.015
        assert_eq!(p, 0.15, "p_correct 應被 clamp 到最小值 0.15");
    }

    #[test]
    fn test_p_correct_clamp上限() {
        // 測試上限 clamp：即使計算值 > 0.95，也應返回 0.95
        let p = p_correct(1.0, 1.2, 1.5); // base * m_ai * user_factor = 1.0 * 1.2 * 1.5 = 1.8
        assert_eq!(p, 0.95, "p_correct 應被 clamp 到最大值 0.95");
    }

    #[test]
    fn test_p_correct_正常範圍() {
        // 正常範圍：不應被 clamp
        let p = p_correct(0.8, 0.9, 1.0); // 0.8 * 0.9 * 1.0 = 0.72
        assert!(p >= 0.15 && p <= 0.95, "正常範圍 p 應在 0.15-0.95，實際: {}", p);
        assert!((p - 0.72).abs() < 0.01, "p 應接近計算值 0.72，實際: {}", p);
    }

    #[test]
    fn test_p_correct_連輸場景() {
        // 連輸場景：user_factor 低，p_correct 應較低（AI 更容易答錯）
        let p = p_correct(0.75, 0.8, 0.7); // user_factor = 0.7（用戶弱）
        // 0.75 * 0.8 * 0.7 = 0.42
        assert!(p < 0.5, "連輸場景 p 應較低（AI 更容易失誤），實際: {}", p);
    }

    #[test]
    fn test_p_correct_連勝場景() {
        // 連勝場景：user_factor 高，p_correct 應較高（AI 更強）
        let p = p_correct(0.75, 0.8, 1.3); // user_factor = 1.3（用戶強）
        // 0.75 * 0.8 * 1.3 = 0.78
        assert!(p > 0.7, "連勝場景 p 應較高（AI 更強），實際: {}", p);
    }

    // ============================================
    // sample_rt 測試
    // ============================================

    #[test]
    fn test_sample_rt_範圍() {
        // 測試反應時間在合理範圍內（800-4000ms）
        for _ in 0..100 {
            let rt = sample_rt(0.8, 1.0);
            assert!(rt >= 800 && rt <= 4000, "反應時間應在 800-4000ms，實際: {}ms", rt);
        }
    }

    #[test]
    fn test_sample_rt_高m_ai更快() {
        // m_ai 高時，反應時間應較短（多次採樣取平均）
        let mut rt_low_m: Vec<u64> = Vec::new();
        let mut rt_high_m: Vec<u64> = Vec::new();
        
        for _ in 0..50 {
            rt_low_m.push(sample_rt(0.5, 1.0));   // 低 m_ai
            rt_high_m.push(sample_rt(1.0, 1.0));  // 高 m_ai
        }
        
        let avg_low: f64 = rt_low_m.iter().sum::<u64>() as f64 / rt_low_m.len() as f64;
        let avg_high: f64 = rt_high_m.iter().sum::<u64>() as f64 / rt_high_m.len() as f64;
        
        assert!(avg_high < avg_low, "高 m_ai 時平均反應時間應更短，低: {:.0}ms, 高: {:.0}ms", avg_low, avg_high);
    }

    #[test]
    fn test_sample_rt_user_factor影響() {
        // user_factor 高時，反應時間應較短
        let mut rt_low_factor: Vec<u64> = Vec::new();
        let mut rt_high_factor: Vec<u64> = Vec::new();
        
        for _ in 0..50 {
            rt_low_factor.push(sample_rt(0.8, 0.7));   // 低 user_factor（用戶弱）
            rt_high_factor.push(sample_rt(0.8, 1.3));  // 高 user_factor（用戶強）
        }
        
        let avg_low: f64 = rt_low_factor.iter().sum::<u64>() as f64 / rt_low_factor.len() as f64;
        let avg_high: f64 = rt_high_factor.iter().sum::<u64>() as f64 / rt_high_factor.len() as f64;
        
        assert!(avg_high < avg_low, "高 user_factor 時平均反應時間應更短，低: {:.0}ms, 高: {:.0}ms", avg_low, avg_high);
    }

    #[test]
    fn test_sample_rt_極端值() {
        // 極端值測試：確保不會超出範圍
        for _ in 0..20 {
            let rt_min = sample_rt(1.5, 1.5); // 最大 speed_factor
            let rt_max = sample_rt(0.3, 0.5); // 最小 speed_factor
            
            assert!(rt_min >= 800, "最小反應時間應 >= 800ms，實際: {}ms", rt_min);
            assert!(rt_max <= 4000, "最大反應時間應 <= 4000ms，實際: {}ms", rt_max);
        }
    }

    // ============================================
    // plan_answer 集成測試（簡化版）
    // ============================================

    #[test]
    fn test_plan_answer_基本流程() {
        // 創建一個簡單的 Match 和 Question 用於測試
        use crate::battle_models::{Match, Question};
        
        let question = Question::new(
            "q1".to_string(),
            "What is 2+2?".to_string(),
            vec!["3".to_string(), "4".to_string(), "5".to_string(), "6".to_string()],
            "B".to_string(),
            3,
        );
        
        let match_record = Match::new_with_config_and_type(
            "match1".to_string(),
            "player1".to_string(),
            "AI".to_string(),
            vec![question.clone()],
            None,
            false,
            "PVE_TRAINING".to_string(),
        );
        
        let plan = plan_answer(&match_record, &question, 0);
        
        // 驗證計劃結構
        assert!(plan.choice_index < question.options.len(), "choice_index 應在有效範圍內");
        assert!(plan.reaction_ms >= 800 && plan.reaction_ms <= 4000, "反應時間應在合理範圍");
        assert!(["A", "B", "C", "D"].contains(&plan.answer.as_str()), "答案應為 A/B/C/D");
    }

    #[test]
    #[allow(non_snake_case)]
    fn test_plan_answer_連輸後AI變弱() {
        // 模擬連輸 4 題後，AI 應更容易答錯
        use crate::battle_models::{Match, Question};
        
        let question = Question::new(
            "q1".to_string(),
            "Test".to_string(),
            vec!["A".to_string(), "B".to_string(), "C".to_string(), "D".to_string()],
            "B".to_string(),
            3,
        );
        
        let mut match_record = Match::new_with_config_and_type(
            "match1".to_string(),
            "player1".to_string(),
            "AI".to_string(),
            vec![question.clone(); 5], // 5 題
            None,
            false,
            "PVE_TRAINING".to_string(),
        );
        
        // 模擬玩家連輸 4 題（前 4 題答錯）
        // 注意：player1_answers 需要預先初始化為與 questions 相同長度
        match_record.player1_answers = vec![None; 5]; // 初始化為 5 個 None
        for i in 0..4 {
            match_record.player1_answers[i] = Some("A".to_string()); // 錯誤答案（正確答案是 "B"）
        }
        
        // 規劃第 5 題的答案
        let plan = plan_answer(&match_record, &question, 4);
        
        // 統計多次規劃，驗證答錯率較高
        let mut correct_count = 0;
        for _ in 0..100 {
            let p = plan_answer(&match_record, &question, 4);
            if p.will_be_correct {
                correct_count += 1;
            }
        }
        
        let correct_rate = correct_count as f64 / 100.0;
        // 連輸後，AI 應更容易失誤（但仍有下限 15%）
        assert!(correct_rate < 0.7, "連輸後 AI 答對率應 < 70%，實際: {:.1}%", correct_rate * 100.0);
        assert!(correct_rate >= 0.15, "AI 答對率應 >= 15%（下限），實際: {:.1}%", correct_rate * 100.0);
    }
}

