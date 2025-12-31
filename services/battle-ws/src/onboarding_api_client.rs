use crate::battle_models::Question;
use serde::{Deserialize, Serialize};
use std::env;
use reqwest::header;
use tracing::{error, info, warn};

// ============================================
// Onboarding Questions API Client
// ============================================

/// Onboarding 題目響應
#[derive(Debug, Clone, Serialize, Deserialize)]
struct OnboardingQuestionsResponse {
    success: bool,
    questions: Vec<QuestionData>,
}

/// 題目數據格式
#[derive(Debug, Clone, Serialize, Deserialize)]
struct QuestionData {
    id: String,
    question_text: String,
    options: Vec<String>,
    correct_answer: String,
    difficulty: i32,
    #[serde(default = "default_time_limit")]
    time_limit: i32,
}

fn default_time_limit() -> i32 {
    15
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

/// 從 Next.js API 獲取 Onboarding 固定題目
///
/// 調用 /api/play/onboarding/questions 端點
/// 返回固定的 3 題訓練題目
pub async fn fetch_onboarding_questions() -> Result<Vec<Question>, String> {
    let api_url = env::var("NEXTJS_API_URL")
        .unwrap_or_else(|_| "http://localhost:3000".to_string());
    let endpoint = with_vercel_bypass_url(format!("{}/api/play/onboarding/questions", api_url));

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
    info!("Fetching onboarding questions from API");

    // 獲取 API key（從環境變量）
    let api_key = env::var("INTERNAL_API_KEY")
        .or_else(|_| env::var("NEXTJS_INTERNAL_API_KEY"))
        .ok();

    let mut request = client.get(&endpoint);
    
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
                    "Onboarding questions API returned error: status={}, body={}",
                    status, text
                );
                return Err(format!("API error: {}", status));
            }

            match response.json::<OnboardingQuestionsResponse>().await {
                Ok(data) => {
                    if data.success && !data.questions.is_empty() {
                        info!("Successfully fetched {} onboarding questions", data.questions.len());
                        // 轉換為 Question 格式並驗證
                        let questions: Vec<Question> = data
                            .questions
                            .into_iter()
                            .filter_map(|q| {
                                // 驗證選項（至少需要 2 個選項）
                                if q.options.len() < 2 {
                                    warn!("Onboarding question {} has invalid options (count: {}): {:?}", q.id, q.options.len(), q.options);
                                    return None;
                                }
                                // 驗證題目文本
                                let trimmed_text = q.question_text.trim();
                                if trimmed_text.is_empty() {
                                    warn!("Onboarding question {} has empty question_text", q.id);
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
                            warn!("All onboarding questions were filtered out!");
                            Err("No valid onboarding questions available".to_string())
                        } else {
                            info!("Successfully converted {} onboarding questions", questions.len());
                            Ok(questions)
                        }
                    } else {
                        warn!("Onboarding questions API returned empty questions");
                        Err("No onboarding questions available".to_string())
                    }
                }
                Err(e) => {
                    error!("Failed to parse onboarding questions response: {}", e);
                    Err(format!("Parse error: {}", e))
                }
            }
        }
        Err(e) => {
            error!("Failed to fetch onboarding questions: {}", e);
            Err(format!("Request error: {}", e))
        }
    }
}
