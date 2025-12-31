// 對戰計分系統（新版本）
// 實現：基礎分 × 速度係數 × 連擊係數 ± 隨機微調 − 失誤懲罰

// Score system module

// ============================================
// 計分詳情結構
// ============================================

#[derive(Debug, Clone)]
pub struct ScoreBreakdown {
    pub base: i32,
    pub speed_coef: f64,
    pub combo_coef: f64,
    pub rng_bonus: i32,
    pub first_correct_bonus: i32,
    pub combo_milestone_bonus: i32,
    pub penalty: i32,
    pub events: Vec<String>,
    pub final_score: i32,
}

// ============================================
// 計分工具函數
// ============================================

/// 計算基礎分數
pub fn calculate_base_score(difficulty: i32) -> i32 {
    match difficulty {
        1 => 60,
        2 => 80,
        3 => 100,
        4 => 120,
        5 => 140,
        _ => 100,
    }
}

/// 計算速度係數
/// speed_coef = 0.8 + 0.2 * (剩餘秒數 / 10)
/// 最後 3 秒上限降到 0.95
pub fn calculate_speed_coefficient(time_remaining: i32, time_limit: i32) -> f64 {
    let normalized = time_remaining as f64 / time_limit as f64;
    let base_speed = 0.8 + 0.2 * normalized;
    let final_speed = if time_remaining <= 3 {
        base_speed.min(0.95)
    } else {
        base_speed
    };
    final_speed.max(0.8).min(1.0)
}

/// 計算連擊係數
/// combo_coef = 1 + min(0.12 * (n-1), 0.6)
pub fn calculate_combo_coefficient(streak: i32) -> f64 {
    if streak <= 1 {
        return 1.0;
    }
    1.0 + (0.12 * (streak - 1) as f64).min(0.6)
}

/// 計算連擊里程碑獎勵
pub fn calculate_combo_milestone_bonus(streak: i32) -> i32 {
    match streak {
        3 => 15,
        5 => 35,
        8 => 60,
        _ => 0,
    }
}

/// 生成 RNG 獎勵和特殊事件
/// 使用種子確保可重現
pub fn generate_rng_bonus(base: i32, seed: u64) -> (i32, Option<String>) {
    use rand::SeedableRng;
    use rand::rngs::StdRng;
    use rand::Rng;
    
    let mut rng = StdRng::seed_from_u64(seed);
    let normal_value = (rng.gen::<f64>() * 2.0) - 1.0; // -1 to 1
    let rng_bonus = (base as f64 * 0.05 * normal_value).round() as i32;
    
    // 特殊事件
    let event_roll = rng.gen::<f64>();
    if event_roll < 0.1 {
        // 10% Lucky Star
        return ((base as f64 * 0.15).round() as i32, Some("Lucky Star".to_string()));
    }
    if event_roll < 0.16 {
        // 6% Heavy Mind
        return ((-(base as f64 * 0.1).round() as i32), Some("Heavy Mind".to_string()));
    }
    if event_roll < 0.19 {
        // 3% Double or Drop
        return (rng_bonus, Some("Double or Drop".to_string()));
    }
    
    (rng_bonus, None)
}

/// 計算搶答加分
/// 如果比對手先正確，再 +10～+25（依難度）
pub fn calculate_first_correct_bonus(
    is_first: bool,
    is_correct: bool,
    difficulty: i32,
) -> i32 {
    if is_first && is_correct {
        10 + difficulty * 3
    } else {
        0
    }
}

/// 計算失誤懲罰
pub fn calculate_penalty(
    is_correct: bool,
    base: i32,
    wrong_streak: i32,
    has_shield: bool,
) -> i32 {
    if is_correct {
        return 0;
    }
    
    // 首次錯誤且有盾：只扣 10%
    if has_shield && wrong_streak == 1 {
        return -((base as f64 * 0.1).round() as i32);
    }
    
    // 正常失誤：扣 25%
    let mut penalty = -((base as f64 * 0.25).round() as i32);
    
    // 連續答錯懲罰
    if wrong_streak == 2 {
        penalty -= 10;
    } else if wrong_streak >= 3 {
        penalty -= 25;
    }
    
    // 上限：每題最多扣 Base * 0.35
    penalty.max(-((base as f64 * 0.35).round() as i32))
}

// ============================================
// 主要計分函數
// ============================================

/// 計算完整分數（包含所有因子）
pub fn calculate_complete_score(
    is_correct: bool,
    time_remaining: i32,
    time_limit: i32,
    difficulty: i32,
    streak: i32,
    wrong_streak: i32,
    is_first_correct: bool,
    has_shield: bool,
    match_id: &str,
    question_index: usize,
) -> ScoreBreakdown {
    let base = calculate_base_score(difficulty);
    let speed_coef = calculate_speed_coefficient(time_remaining, time_limit);
    let combo_coef = calculate_combo_coefficient(streak);
    let combo_milestone_bonus = if is_correct {
        calculate_combo_milestone_bonus(streak)
    } else {
        0
    };
    
    // 生成種子（match_id + question_index）
    let seed = match_id
        .chars()
        .map(|c| c as u64)
        .sum::<u64>()
        + question_index as u64;
    let (rng_bonus, event) = generate_rng_bonus(base, seed);
    
    let first_correct_bonus = calculate_first_correct_bonus(is_first_correct, is_correct, difficulty);
    let penalty = calculate_penalty(is_correct, base, wrong_streak, has_shield);
    
    let mut events = Vec::new();
    if let Some(e) = event {
        events.push(e);
    }
    
    // 計算最終分數
    let final_score = if is_correct {
        let base_score = (base as f64 * speed_coef * combo_coef).round() as i32;
        base_score + rng_bonus + first_correct_bonus + combo_milestone_bonus
    } else {
        penalty
    };
    
    ScoreBreakdown {
        base,
        speed_coef,
        combo_coef,
        rng_bonus,
        first_correct_bonus,
        combo_milestone_bonus,
        penalty,
        events,
        final_score,
    }
}

