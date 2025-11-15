use crate::battle_models::BattleResultEvent;
use std::env;
use tracing::{info, warn, error};

// ============================================
// P9: 發送戰鬥結果事件到 Next.js API
// ============================================

/// 發送戰鬥結果事件到 Next.js API
/// 
/// 這是一個異步函數，不會阻塞主流程
/// 如果發送失敗，只記錄錯誤，不影響遊戲流程
pub async fn send_battle_event_to_api(event: BattleResultEvent) {
    let api_url = env::var("BATTLE_EVENTS_API_URL")
        .unwrap_or_else(|_| "http://localhost:3000/api/play/battle/events".to_string());
    
    let api_key = env::var("BATTLE_EVENTS_API_KEY").ok();

    // 構建請求體
    let request_body = serde_json::json!({
        "user_id": event.user_id,
        "opponent_id": event.opponent_id,
        "match_id": event.match_id,
        "match_type": event.match_type,
        "question_id_array": event.question_id_array,
        "is_correct_array": event.is_correct_array,
        "final_scores": {
            "player1": event.final_scores.player1,
            "player2": event.final_scores.player2,
        },
        "server_timestamp": event.server_timestamp,
    });

    // 使用 reqwest 發送 HTTP 請求
    let client = match reqwest::Client::builder()
        .timeout(std::time::Duration::from_secs(5))
        .build()
    {
        Ok(client) => client,
        Err(e) => {
            error!("Failed to create HTTP client: {}", e);
            return;
        }
    };

    let mut request = client.post(&api_url).json(&request_body);

    // 添加 API Key（如果配置了）
    if let Some(key) = api_key {
        request = request.header("x-api-key", key);
    }

    match request.send().await {
        Ok(response) => {
            if response.status().is_success() {
                info!("Battle event sent successfully: match_id={}", event.match_id);
            } else {
                let status = response.status();
                let text = response.text().await.unwrap_or_default();
                warn!(
                    "Battle event API returned error: status={}, body={}, match_id={}",
                    status, text, event.match_id
                );
            }
        }
        Err(e) => {
            warn!(
                "Failed to send battle event to API: {}, match_id={}",
                e, event.match_id
            );
        }
    }
}

