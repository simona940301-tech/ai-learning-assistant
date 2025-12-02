use crate::battle_models::Question;
use serde::{Deserialize, Serialize};
use std::env;
use reqwest::header;
use tracing::{error, info, warn};

// ============================================
// PVE API Client
// ============================================

/// PVE 題目響應
#[derive(Debug, Clone, Serialize, Deserialize)]
struct PVEQuestionsResponse {
    success: bool,
    questions: Vec<QuestionData>,
    #[serde(default)]
    dda_pool: Option<std::collections::HashMap<String, Vec<QuestionData>>>,
    #[serde(default)]
    baselineDifficulty: Option<i32>,
}

/// 題目數據格式
#[derive(Debug, Clone, Serialize, Deserialize)]
struct QuestionData {
    id: String,
    question_text: String,
    options: Vec<String>,
    correct_answer: String,
    difficulty: i32,
    time_limit: i32,
    skill_tags: Vec<String>,
}

pub struct PveQuestionBundle {
    pub questions: Vec<Question>,
    pub dda_pool: std::collections::HashMap<i32, Vec<Question>>,
    pub baseline_difficulty: i32,
}

fn apply_vercel_bypass(mut request: reqwest::RequestBuilder) -> reqwest::RequestBuilder {
    if let Ok(token) = env::var("VERCEL_PROTECTION_BYPASS") {
        request = request
            .header("x-vercel-protection-bypass", token.clone())
            .header(header::COOKIE, format!("x-vercel-protection-bypass={}", token));
    }
    request
}

fn with_vercel_bypass_url(url: String) -> String {
    if let Ok(token) = env::var("VERCEL_PROTECTION_BYPASS") {
        format!(
            "{}?x-vercel-protection-bypass={}&x-vercel-set-bypass-cookie=true",
            url, token
        )
    } else {
        url
    }
}

/// 從 Next.js API 獲取 PVE 題目
///
/// 調用 /api/play/pve/questions 端點
pub async fn fetch_pve_questions(
    user_id: &str,
    subject: Option<&str>,
    focus_on_weakness: bool,
    num_questions: i32,
) -> Result<PveQuestionBundle, String> {
    let api_url = env::var("NEXTJS_API_URL")
        .unwrap_or_else(|_| "http://localhost:3000".to_string());
    let endpoint = with_vercel_bypass_url(format!("{}/api/play/pve/questions", api_url));

    // 構建請求體
    let request_body = serde_json::json!({
        "userId": user_id,
        "userId": user_id,
        "subject": subject,
        "focusOnWeakness": focus_on_weakness,
        "numQuestions": num_questions,
    });

    // 創建 HTTP 客戶端
    let client = match reqwest::Client::builder()
        .timeout(std::time::Duration::from_secs(10))
        .build()
    {
        Ok(client) => client,
        Err(e) => {
            error!("Failed to create HTTP client: {}", e);
            return Err(format!("HTTP client error: {}", e));
        }
    };

    // 發送請求（帶 API key）
    info!(
        "Fetching PVE questions: user={}, subject={:?}, num={}",
        user_id, subject, num_questions
    );

    // 獲取 API key（從環境變量）
    let api_key = env::var("INTERNAL_API_KEY")
        .or_else(|_| env::var("NEXTJS_INTERNAL_API_KEY"))
        .ok();

    let mut request = client.post(&endpoint).json(&request_body);
    
    // 如果配置了 API key，添加到請求頭
    if let Some(key) = &api_key {
        request = request.header("x-internal-api-key", key);
    }
    request = apply_vercel_bypass(request);

    match request.send().await {
        Ok(response) => {
            if !response.status().is_success() {
                let status = response.status();
                let text = response.text().await.unwrap_or_default();
                error!(
                    "PVE questions API returned error: status={}, body={}",
                    status, text
                );
                return Err(format!("API error: {}", status));
            }

            match response.json::<PVEQuestionsResponse>().await {
                Ok(data) => {
                    if data.success && !data.questions.is_empty() {
                        let original_count = data.questions.len();
                        info!("Successfully fetched {} PVE questions", original_count);
                        // 轉換為 Question 格式並驗證（但不要過於嚴格）
                        let questions: Vec<Question> = data
                            .questions
                            .into_iter()
                            .filter_map(|q| {
                                // 驗證選項（至少需要 2 個選項）
                                if q.options.len() < 2 {
                                    warn!("Question {} has invalid options (count: {}): {:?}", q.id, q.options.len(), q.options);
                                    return None;
                                }
                                // 驗證題目文本（允許空白字符，但不允許完全為空）
                                let trimmed_text = q.question_text.trim();
                                if trimmed_text.is_empty() {
                                    warn!("Question {} has empty question_text", q.id);
                                    return None;
                                }
                                Some(Question {
                                    id: q.id,
                                    question_text: q.question_text,
                                    options: q.options,
                                    correct_answer: q.correct_answer,
                                    difficulty: q.difficulty,
                                    time_limit: q.time_limit,
                                })
                            })
                            .collect();
                        
                        if questions.is_empty() {
                            warn!("All questions were filtered out! Original count: {}", original_count);
                        } else {
                            info!("Successfully converted {} questions (filtered {} invalid)", questions.len(), original_count - questions.len());
                        }
                        let mut pool = std::collections::HashMap::new();
                        if let Some(dda) = data.dda_pool {
                            for (diff, entries) in dda.into_iter() {
                                let diff_key = diff.parse::<i32>().unwrap_or(3);
                                let converted: Vec<Question> = entries
                                    .into_iter()
                                    .filter_map(|q| {
                                        // 驗證選項
                                        if q.options.len() < 2 {
                                            return None;
                                        }
                                        if q.question_text.trim().is_empty() {
                                            return None;
                                        }
                                        Some(Question {
                                            id: q.id,
                                            question_text: q.question_text,
                                            options: q.options,
                                            correct_answer: q.correct_answer,
                                            difficulty: q.difficulty,
                                            time_limit: q.time_limit,
                                        })
                                    })
                                    .collect();
                                pool.insert(diff_key, converted);
                            }
                        }
                        Ok(PveQuestionBundle {
                            questions,
                            dda_pool: pool,
                            baseline_difficulty: data.baselineDifficulty.unwrap_or(3),
                        })
                    } else {
                        warn!("PVE questions API returned empty questions");
                        Err("No questions available".to_string())
                    }
                }
                Err(e) => {
                    error!("Failed to parse PVE questions response: {}", e);
                    Err(format!("Parse error: {}", e))
                }
            }
        }
        Err(e) => {
            error!("Failed to fetch PVE questions: {}", e);
            Err(format!("Request error: {}", e))
        }
    }
}

/// 從 seed_questions 表獲取官方題目
///
/// 調用 /api/play/questions/seed 端點
pub async fn fetch_seed_questions(
    subject: Option<&str>,
    difficulty: Option<i32>,
    num_questions: i32,
) -> Result<Vec<Question>, String> {
    let api_url = env::var("NEXTJS_API_URL")
        .unwrap_or_else(|_| "http://localhost:3000".to_string());
    let endpoint = with_vercel_bypass_url(format!("{}/api/play/questions/seed", api_url));

    // 構建請求體
    let request_body = serde_json::json!({
        "subject": subject,
        "difficulty": difficulty,
        "numQuestions": num_questions,
        "excludeIds": [],
    });

    // 創建 HTTP 客戶端
    let client = match reqwest::Client::builder()
        .timeout(std::time::Duration::from_secs(10))
        .build()
    {
        Ok(client) => client,
        Err(e) => {
            error!("Failed to create HTTP client: {}", e);
            return Err(format!("HTTP client error: {}", e));
        }
    };

    // 發送請求（帶 API key）
    info!(
        "Fetching seed questions: subject={:?}, difficulty={:?}, num={}",
        subject, difficulty, num_questions
    );

    // 獲取 API key（從環境變量）
    let api_key = env::var("INTERNAL_API_KEY")
        .or_else(|_| env::var("NEXTJS_INTERNAL_API_KEY"))
        .ok();

    let mut request = client.post(&endpoint).json(&request_body);
    
    // 如果配置了 API key，添加到請求頭
    if let Some(key) = &api_key {
        request = request.header("x-internal-api-key", key);
    }
    request = apply_vercel_bypass(request);

    match request.send().await {
        Ok(response) => {
            if !response.status().is_success() {
                let status = response.status();
                let text = response.text().await.unwrap_or_default();
                error!(
                    "Seed questions API returned error: status={}, body={}",
                    status, text
                );
                return Err(format!("API error: {}", status));
            }

            match response.json::<PVEQuestionsResponse>().await {
                Ok(data) => {
                    if data.success && !data.questions.is_empty() {
                        info!("Successfully fetched {} seed questions", data.questions.len());
                        // 轉換為 Question 格式並驗證
                        let questions: Vec<Question> = data
                            .questions
                            .into_iter()
                            .filter_map(|q| {
                                // 驗證選項
                                if q.options.len() < 2 {
                                    warn!("Seed question {} has invalid options: {:?}", q.id, q.options);
                                    return None;
                                }
                                if q.question_text.trim().is_empty() {
                                    warn!("Seed question {} has empty question_text", q.id);
                                    return None;
                                }
                                Some(Question {
                                    id: q.id,
                                    question_text: q.question_text,
                                    options: q.options,
                                    correct_answer: q.correct_answer,
                                    difficulty: q.difficulty,
                                    time_limit: q.time_limit,
                                })
                            })
                            .collect();
                        Ok(questions)
                    } else {
                        warn!("Seed questions API returned empty questions");
                        Err("No seed questions available".to_string())
                    }
                }
                Err(e) => {
                    error!("Failed to parse seed questions response: {}", e);
                    Err(format!("Parse error: {}", e))
                }
            }
        }
        Err(e) => {
            error!("Failed to fetch seed questions: {}", e);
            Err(format!("Request error: {}", e))
        }
    }
}

/// 將 PVE match 寫入 PostgreSQL
///
/// 調用 /api/play/pve/create-match 端點
pub async fn create_pve_match_in_db(
    match_id: &str,
    user_id: &str,
    match_type: &str,
    questions: &[Question],
) -> Result<(), String> {
    let api_url = env::var("NEXTJS_API_URL")
        .unwrap_or_else(|_| "http://localhost:3000".to_string());
    let endpoint = with_vercel_bypass_url(format!("{}/api/play/pve/create-match", api_url));

    // 構建請求體
    let request_body = serde_json::json!({
        "matchId": match_id,
        "userId": user_id,
        "matchType": match_type,
        "questions": questions,
    });

    // 創建 HTTP 客戶端
    let client = match reqwest::Client::builder()
        .timeout(std::time::Duration::from_secs(5))
        .build()
    {
        Ok(client) => client,
        Err(e) => {
            error!("Failed to create HTTP client: {}", e);
            return Err(format!("HTTP client error: {}", e));
        }
    };

    // 發送請求（帶 API key）
    info!(
        "Creating PVE match in DB: match_id={}, user={}",
        match_id, user_id
    );

    // 獲取 API key（從環境變量）
    let api_key = env::var("INTERNAL_API_KEY")
        .or_else(|_| env::var("NEXTJS_INTERNAL_API_KEY"))
        .ok();

    let mut request = client.post(&endpoint).json(&request_body);
    
    // 如果配置了 API key，添加到請求頭
    if let Some(key) = &api_key {
        request = request.header("x-internal-api-key", key);
    }
    request = apply_vercel_bypass(request);

    match request.send().await {
        Ok(response) => {
            if response.status().is_success() {
                info!("PVE match created successfully: match_id={}", match_id);
                Ok(())
            } else {
                let status = response.status();
                let text = response.text().await.unwrap_or_default();
                warn!(
                    "PVE create-match API returned error: status={}, body={}, match_id={}",
                    status, text, match_id
                );
                Err(format!("API error: {}", status))
            }
        }
        Err(e) => {
            warn!(
                "Failed to create PVE match in DB: {}, match_id={}",
                e, match_id
            );
            Err(format!("Request error: {}", e))
        }
    }
}
