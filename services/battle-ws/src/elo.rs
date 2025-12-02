/// Elo Rating System
/// 
/// Standard Elo calculation with K-factor = 32
/// Used for PVP matches only (PVE matches don't affect Elo)

const K_FACTOR: f64 = 32.0;

/// Calculate expected score for a player
/// 
/// Formula: E_A = 1 / (1 + 10^((R_B - R_A) / 400))
/// 
/// - R_A: Player A's current Elo
/// - R_B: Player B's current Elo
/// - Returns: Expected score (0.0 to 1.0)
pub fn expected_score(player_elo: f64, opponent_elo: f64) -> f64 {
    1.0 / (1.0 + 10.0_f64.powf((opponent_elo - player_elo) / 400.0))
}

/// Calculate new Elo rating after a match
/// 
/// Formula: R_new = R_old + K * (S - E)
/// 
/// - R_old: Old Elo rating
/// - K: K-factor (32 for standard matches)
/// - S: Actual score (1.0 for win, 0.5 for draw, 0.0 for loss)
/// - E: Expected score
/// 
/// Returns: (new_elo, elo_diff)
pub fn calculate_new_elo(
    player_elo: f64,
    opponent_elo: f64,
    actual_score: f64, // 1.0 = win, 0.5 = draw, 0.0 = loss
) -> (f64, i32) {
    let expected = expected_score(player_elo, opponent_elo);
    let elo_diff = K_FACTOR * (actual_score - expected);
    let new_elo = player_elo + elo_diff;
    
    // Round to integer
    let new_elo_int = new_elo.round() as i32;
    let _elo_diff_int = elo_diff.round() as i32;
    
    // Ensure Elo doesn't go below 0
    let final_elo = new_elo_int.max(0) as f64;
    let final_diff = final_elo as i32 - player_elo.round() as i32;
    
    (final_elo, final_diff)
}

/// Calculate Elo changes for both players after a match
/// 
/// Returns: (player1_new_elo, player1_elo_diff, player2_new_elo, player2_elo_diff)
pub fn calculate_match_elo(
    player1_elo: f64,
    player2_elo: f64,
    player1_score: i32,
    player2_score: i32,
) -> (f64, i32, f64, i32) {
    // Determine actual scores
    let player1_actual = if player1_score > player2_score {
        1.0 // Win
    } else if player1_score < player2_score {
        0.0 // Loss
    } else {
        0.5 // Draw
    };
    
    let player2_actual = 1.0 - player1_actual;
    
    // Calculate new Elo for both players
    let (player1_new, player1_diff) = calculate_new_elo(player1_elo, player2_elo, player1_actual);
    let (player2_new, player2_diff) = calculate_new_elo(player2_elo, player1_elo, player2_actual);
    
    (player1_new, player1_diff, player2_new, player2_diff)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_expected_score_equal_elo() {
        let expected = expected_score(1000.0, 1000.0);
        assert!((expected - 0.5).abs() < 0.01, "Equal Elo should give 0.5 expected score");
    }

    #[test]
    fn test_expected_score_higher_elo() {
        let expected = expected_score(1200.0, 1000.0);
        assert!(expected > 0.5, "Higher Elo should have > 0.5 expected score");
    }

    #[test]
    fn test_calculate_new_elo_win() {
        let (new_elo, diff) = calculate_new_elo(1000.0, 1000.0, 1.0);
        assert!(new_elo > 1000.0, "Win should increase Elo");
        assert!(diff > 0, "Elo diff should be positive");
    }

    #[test]
    fn test_calculate_new_elo_loss() {
        let (new_elo, diff) = calculate_new_elo(1000.0, 1000.0, 0.0);
        assert!(new_elo < 1000.0, "Loss should decrease Elo");
        assert!(diff < 0, "Elo diff should be negative");
    }

    #[test]
    fn test_calculate_match_elo() {
        let (p1_new, p1_diff, p2_new, p2_diff) = calculate_match_elo(1000.0, 1000.0, 100, 50);
        assert!(p1_new > 1000.0, "Winner should gain Elo");
        assert!(p2_new < 1000.0, "Loser should lose Elo");
        assert_eq!(p1_diff, -p2_diff, "Elo changes should sum to zero");
    }
}

