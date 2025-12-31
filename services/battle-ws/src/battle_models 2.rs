use serde::{Deserialize, Serialize};

// ============================================
// 客戶端消息類型
// ============================================

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(tag = "type")]
pub enum ClientMessage {
    #[serde(rename = "AUTH")]
    Auth { userId: String },
    #[serde(rename = "START_MATCH")]
    StartMatch {
        match_type: String,
        subject: Option<String>,
        #[serde(default)]
        contract_amount: Option<i32>, // P11: 合約金額（金幣）
        #[serde(default)]
        is_ugc_deceiver_mode: Option<bool>, // P11: UGC 迷惑模式開關
        #[serde(default)]
        time_limit: Option<i32>, // 作答時間限制（秒），預設 20
    },
    #[serde(rename = "CONFIRM_LOBBY")]
    ConfirmLobby { match_id: String },
    #[serde(rename = "CANCEL_LOBBY")]
    CancelLobby { match_id: String },
    #[serde(rename = "SUBMIT_ANSWER")]
    SubmitAnswer {
        match_id: String,
        question_index: usize,
        answer: String,
        client_timestamp: Option<i64>, // 客戶端時間戳（毫秒）
    },
}

// ============================================
// 服務端消息類型
// ============================================

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(tag = "type")]
pub enum ServerMessage {
    #[serde(rename = "MATCH_FOUND")]
    MatchFound { match_id: String, question_list: Vec<Question> },
    #[serde(rename = "LOBBY_CONFIRMING")]
    LobbyConfirming { match_id: String, countdown: i32, players: Vec<String> },
    #[serde(rename = "LOBBY_CONFIRMED")]
    LobbyConfirmed { match_id: String },
    #[serde(rename = "LOBBY_DISSOLVED")]
    LobbyDissolved { reason: String },
    #[serde(rename = "BATTLE_STATE_UPDATE")]
    BattleStateUpdate { state: BattleState },
    #[serde(rename = "QUESTION_START")]
    QuestionStart { question_index: usize, time_limit: i32 },
    #[serde(rename = "ANSWER_RESULT")]
    AnswerResult {
        player1_score: i32,
        player2_score: i32,
        server_timestamp: i64, // 服務端接收時間戳（毫秒）
    },
    #[serde(rename = "BATTLE_END")]
    BattleEnd {
        winner: String,
        final_score: FinalScore,
        battle_result_event: BattleResultEvent, // P9: 數據回流事件
    },
    #[serde(rename = "ROUND_STARTED")]
    RoundStarted {
        match_id: String,
        question_index: usize,
        question: Question,
    },
    #[serde(rename = "OPPONENT_THINKING")]
    OpponentThinking {
        match_id: String,
        question_index: usize,
    },
    #[serde(rename = "ROUND_RESOLVED")]
    RoundResolved {
        match_id: String,
        question_index: usize,
        player1_score: i32,
        player2_score: i32,
    },
    #[serde(rename = "ERROR")]
    Error { message: String },
}

// ============================================
// 數據結構
// ============================================

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Question {
    pub id: String,
    pub question_text: String,
    pub options: Vec<String>,
    pub correct_answer: String,
    pub difficulty: i32,
    pub time_limit: i32,
}

impl Question {
    /// 根據難度動態計算時限
    /// 難度 1-2 級：12 秒
    /// 難度 3 級：10 秒
    /// 難度 4-5 級：8 秒
    pub fn calculate_time_limit(difficulty: i32) -> i32 {
        match difficulty {
            1..=2 => 12,
            3 => 10,
            4..=5 => 8,
            _ => 10, // 默認 10 秒
        }
    }

    /// 創建問題時自動設置時限
    pub fn new(
        id: String,
        question_text: String,
        options: Vec<String>,
        correct_answer: String,
        difficulty: i32,
    ) -> Self {
        let time_limit = Self::calculate_time_limit(difficulty);
        Self {
            id,
            question_text,
            options,
            correct_answer,
            difficulty,
            time_limit,
        }
    }

    /// 創建問題時使用指定的時限（覆蓋自動計算）
    pub fn new_with_time_limit(
        id: String,
        question_text: String,
        options: Vec<String>,
        correct_answer: String,
        difficulty: i32,
        time_limit: i32,
    ) -> Self {
        Self {
            id,
            question_text,
            options,
            correct_answer,
            difficulty,
            time_limit,
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct BattleState {
    pub is_in_battle: bool,
    pub match_id: String,
    pub player1_score: i32,
    pub player2_score: i32,
    pub current_question_index: usize,
    pub question_list: Vec<Question>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct FinalScore {
    pub player1: i32,
    pub player2: i32,
}

// ============================================
// P9: 戰鬥結果事件（用於數據回流）
// ============================================

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct BattleResultEvent {
    pub user_id: String,
    pub opponent_id: String,
    pub match_id: String,
    pub match_type: String, // "PVP" | "PVE_TRAINING" | "PVE_CHALLENGE"
    pub question_id_array: Vec<String>,
    pub is_correct_array: Vec<bool>,
    pub final_scores: FinalScore,
    pub server_timestamp: i64, // 服務端時間戳
}

// ============================================
// 匹配狀態
// ============================================

#[derive(Debug, Clone, PartialEq)]
pub enum MatchState {
    LobbyReady,        // 匹配成功，等待確認
    LobbyConfirming,  // 確認中（15 秒倒數）
    InBattle,         // 對戰中
    Finished,         // 結束
}

// ============================================
// 匹配記錄
// ============================================

#[derive(Debug)]
pub struct Match {
    pub id: String,
    pub player1_id: String,
    pub player2_id: String,
    pub player1_confirmed: bool,
    pub player2_confirmed: bool,
    pub state: MatchState,
    pub player1_score: i32,
    pub player2_score: i32,
    pub current_question: usize,
    pub questions: Vec<Question>,
    pub player1_answers: Vec<Option<String>>,
    pub player2_answers: Vec<Option<String>>,
    pub confirm_countdown: Option<i32>, // 15 秒倒數
    pub confirm_timer_start: Option<i64>, // 確認階段開始時間戳（毫秒）
    
    // P2: 答案提交時間戳記錄
    pub player1_answer_timestamps: Vec<Option<i64>>, // 每個問題的服務端接收時間戳
    pub player2_answer_timestamps: Vec<Option<i64>>,
    
    // P11: 自訂房間配置
    pub contract_amount: Option<i32>, // 合約金額（金幣）
    pub is_ugc_deceiver_mode: bool, // UGC 迷惑模式
    
    // 對戰類型（用於數據回流）
    pub match_type: String, // "PVP" | "PVE_TRAINING" | "PVE_CHALLENGE"
    
    // DDA AI 答題系統狀態
    pub ai_mastery_by_tag: std::collections::HashMap<String, f64>, // 知識點標籤 -> 掌握度 (0.0-1.0)
    pub current_topic_tags: Vec<String>, // 當前題目的知識點標籤
    pub ai_match_history: Vec<bool>, // AI 答題歷史（true=正確，false=錯誤）
    pub dda_window: usize, // DDA 窗口大小（默認 5）
    pub target_band: (f64, f64), // 目標勝率區間（默認 (0.55, 0.65)）
    
    // AI 答題任務控制（不序列化，因為包含運行時狀態）
    pub ai_answer_task_handle: Option<tokio::task::JoinHandle<()>>, // 當前 AI 答題任務的 handle
    pub ai_answer_abort: Option<tokio::sync::oneshot::Sender<()>>, // 用於取消 AI 答題任務
}

impl Match {
    pub fn new(
        id: String,
        player1_id: String,
        player2_id: String,
        questions: Vec<Question>,
    ) -> Self {
        Self::new_with_config(id, player1_id, player2_id, questions, None, false)
    }

    /// P11: 創建帶配置的匹配
    pub fn new_with_config(
        id: String,
        player1_id: String,
        player2_id: String,
        questions: Vec<Question>,
        contract_amount: Option<i32>,
        is_ugc_deceiver_mode: bool,
    ) -> Self {
        Self::new_with_config_and_type(
            id,
            player1_id,
            player2_id,
            questions,
            contract_amount,
            is_ugc_deceiver_mode,
            "PVP".to_string(), // 默認類型
        )
    }
    
    /// 創建帶配置和類型的匹配
    pub fn new_with_config_and_type(
        id: String,
        player1_id: String,
        player2_id: String,
        questions: Vec<Question>,
        contract_amount: Option<i32>,
        is_ugc_deceiver_mode: bool,
        match_type: String,
    ) -> Self {
        let question_count = questions.len();
        Self {
            id,
            player1_id,
            player2_id,
            player1_confirmed: false,
            player2_confirmed: false,
            state: MatchState::LobbyReady,
            player1_score: 0,
            player2_score: 0,
            current_question: 0,
            questions,
            player1_answers: vec![None; question_count],
            player2_answers: vec![None; question_count],
            confirm_countdown: Some(15),
            confirm_timer_start: None,
            player1_answer_timestamps: vec![None; question_count],
            player2_answer_timestamps: vec![None; question_count],
            contract_amount,
            is_ugc_deceiver_mode,
            match_type,
            // DDA AI 初始化
            ai_mastery_by_tag: std::collections::HashMap::new(),
            current_topic_tags: Vec::new(),
            ai_match_history: Vec::new(),
            dda_window: 5,
            target_band: (0.55, 0.65),
            ai_answer_task_handle: None,
            ai_answer_abort: None,
        }
    }
}

impl Clone for Match {
    fn clone(&self) -> Self {
        Self {
            id: self.id.clone(),
            player1_id: self.player1_id.clone(),
            player2_id: self.player2_id.clone(),
            player1_confirmed: self.player1_confirmed,
            player2_confirmed: self.player2_confirmed,
            state: self.state.clone(),
            player1_score: self.player1_score,
            player2_score: self.player2_score,
            current_question: self.current_question,
            questions: self.questions.clone(),
            player1_answers: self.player1_answers.clone(),
            player2_answers: self.player2_answers.clone(),
            confirm_countdown: self.confirm_countdown,
            confirm_timer_start: self.confirm_timer_start,
            player1_answer_timestamps: self.player1_answer_timestamps.clone(),
            player2_answer_timestamps: self.player2_answer_timestamps.clone(),
            contract_amount: self.contract_amount,
            is_ugc_deceiver_mode: self.is_ugc_deceiver_mode,
            match_type: self.match_type.clone(),
            ai_mastery_by_tag: self.ai_mastery_by_tag.clone(),
            current_topic_tags: self.current_topic_tags.clone(),
            ai_match_history: self.ai_match_history.clone(),
            dda_window: self.dda_window,
            target_band: self.target_band,
            // 不克隆任務控制字段（它們是運行時狀態）
            ai_answer_task_handle: None,
            ai_answer_abort: None,
        }
    }
}

