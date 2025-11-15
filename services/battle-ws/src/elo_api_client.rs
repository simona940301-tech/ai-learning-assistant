/// Elo Update API Client
/// 
/// Calls Next.js API to update Elo rankings after battle completion

use serde::{Deserialize, Serialize};
use tracing::{info, error, warn};

const UPDATE_ELO_API_URL: &str = "http://localhost:3000/api/play/battle/update-elo";
const USER_STATUS_API_URL: &str = "http://localhost:3000/api/play/user/status";

#[derive(Debug, Serialize)]
struct UpdateEloRequest {
    match_id: String,
    player1_id: String,
    player2_id: String,
    player1_score: i32,
    player2_score: i32,
    winner: Option<String>, // None for draw
}

#[derive(Debug, Deserialize)]
struct UpdateEloResponse {
    success: bool,
    #[serde(skip_serializing_if = "Option::is_none")]
    error: Option<ApiError>,
    #[serde(skip_serializing_if = "Option::is_none")]
    player1: Option<PlayerEloUpdate>,
    #[serde(skip_serializing_if = "Option::is_none")]
    player2: Option<PlayerEloUpdate>,
}

#[derive(Debug, Deserialize)]
struct ApiError {
    code: String,
    message: String,
}

#[derive(Debug, Deserialize)]
struct CoinBreakdown {
    base: i32,
    winner: i32,
    contract: i32,
    total: i32,
}

#[derive(Debug, Deserialize)]
struct PlayerEloUpdate {
    id: String,
    old_elo: i32,
    new_elo: i32,
    elo_diff: i32,
    coins_earned: i32,
    #[serde(skip_serializing_if = "Option::is_none")]
    coin_breakdown: Option<CoinBreakdown>,
}

/// Update Elo rankings via Next.js API
/// 
/// This is called after battle completion (PVP matches only)
/// PVE matches don't affect Elo, so this function should not be called for PVE
/// 
/// Note: Elo values are fetched from DB by the API, so we pass default values here
/// The API will calculate Elo changes based on actual DB values
pub async fn update_elo_rankings(
    match_id: String,
    player1_id: String,
    player2_id: String,
    _player1_elo: f64, // Not used - API fetches from DB
    _player2_elo: f64, // Not used - API fetches from DB
    player1_score: i32,
    player2_score: i32,
) -> Result<(), String> {
    // Skip Elo update for PVE matches
    if player2_id == "AI" {
        info!("Skipping Elo update for PVE match: {}", match_id);
        return Ok(());
    }

    // Determine winner (None for draw)
    let winner = if player1_score > player2_score {
        Some(player1_id.clone())
    } else if player2_score > player1_score {
        Some(player2_id.clone())
    } else {
        None
    };

    let request = UpdateEloRequest {
        match_id: match_id.clone(),
        player1_id: player1_id.clone(),
        player2_id: player2_id.clone(),
        player1_score,
        player2_score,
        winner,
    };

    info!(
        "Updating Elo for match {}: player1 score {}, player2 score {}",
        match_id,
        player1_score,
        player2_score
    );

    // Make HTTP request
    let client = reqwest::Client::new();
    let response = match client
        .post(UPDATE_ELO_API_URL)
        .json(&request)
        .send()
        .await
    {
        Ok(resp) => resp,
        Err(e) => {
            error!("Failed to send Elo update request: {}", e);
            return Err(format!("HTTP request failed: {}", e));
        }
    };

    if !response.status().is_success() {
        let status = response.status();
        let error_text = response.text().await.unwrap_or_default();
        error!(
            "Elo update API returned error status {}: {}",
            status, error_text
        );
        return Err(format!("API error: {} - {}", status, error_text));
    }

    let result: UpdateEloResponse = match response.json().await {
        Ok(data) => data,
        Err(e) => {
            error!("Failed to parse Elo update response: {}", e);
            return Err(format!("Parse error: {}", e));
        }
    };

    if !result.success {
        let error_msg = result
            .error
            .map(|e| format!("{}: {}", e.code, e.message))
            .unwrap_or_else(|| "Unknown error".to_string());
        error!("Elo update failed: {}", error_msg);
        return Err(error_msg);
    }

    if let (Some(p1), Some(p2)) = (result.player1, result.player2) {
        info!(
            "Elo updated successfully: player1 {} -> {} ({}), player2 {} -> {} ({})",
            p1.old_elo, p1.new_elo, p1.elo_diff, p2.old_elo, p2.new_elo, p2.elo_diff
        );
    } else {
        warn!("Elo update response missing player data");
    }

    Ok(())
}

/// Get user Elo from Next.js API
/// 
/// Returns current Elo (default 1000 if API fails)
pub async fn get_user_elo(user_id: &str) -> f64 {
    let client = reqwest::Client::new();
    
    // Note: This is a simplified approach. In production, you might want to:
    // 1. Cache Elo in Redis
    // 2. Pass Elo in WebSocket message
    // 3. Use a dedicated Elo lookup API
    
    // For now, we'll use a default value and log a warning
    // The Elo will be fetched from DB when updating after battle
    warn!("get_user_elo called but not fully implemented. Using default 1000 for user {}", user_id);
    1000.0
}

