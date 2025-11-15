/// Player-facing arousal proxy calculations used solely for UI tempo hints.
use serde::Serialize;

#[derive(Debug, Clone, Copy, Default, Serialize)]
pub struct PlayerMetrics {
    pub rt_mean: f32,
    pub rt_std: f32,
    pub quick_retries_ratio: f32,
    pub skip_ratio: f32,
    pub streak: i32,
    pub self_report: Option<f32>,
}

/// Collapse telemetry into a single 0-1 arousal proxy.
pub fn calc_arousal_proxy(m: &PlayerMetrics) -> f32 {
    let cv = if m.rt_mean > 0.0 {
        (m.rt_std / m.rt_mean).clamp(0.0, 1.0)
    } else {
        0.0
    };

    let mut score = 0.35 * cv
        + 0.25 * m.quick_retries_ratio.clamp(0.0, 1.0)
        + 0.20 * m.skip_ratio.clamp(0.0, 1.0)
        + 0.10 * ((m.streak.abs() as f32 / 5.0).min(1.0))
        + 0.10 * m.self_report.unwrap_or(0.5).clamp(0.0, 1.0);

    score = score.clamp(0.0, 1.0);
    score
}

/// Map arousal proxy to presentation hint.
pub fn tempo_hint(score: f32) -> &'static str {
    if score < 0.35 {
        "tighten"
    } else if score > 0.65 {
        "soothe"
    } else {
        "steady"
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn arousal_increases_with_variance() {
        let mut metrics = PlayerMetrics {
            rt_mean: 1200.0,
            rt_std: 80.0,
            quick_retries_ratio: 0.0,
            skip_ratio: 0.0,
            streak: 3,
            self_report: Some(0.4),
        };

        let stable = calc_arousal_proxy(&metrics);
        metrics.rt_std = 400.0;
        let jittery = calc_arousal_proxy(&metrics);

        assert!(jittery > stable, "Higher variance should increase arousal proxy");
    }

    #[test]
    fn arousal_clamped_and_combined() {
        let metrics = PlayerMetrics {
            rt_mean: 800.0,
            rt_std: 0.0,
            quick_retries_ratio: 1.0,
            skip_ratio: 1.0,
            streak: -6,
            self_report: Some(1.5),
        };

        let score = calc_arousal_proxy(&metrics);
        assert!(score <= 1.0 && score >= 0.0, "Arousal proxy should stay within [0,1]");
    }

    #[test]
    fn tempo_hint_thresholds() {
        assert_eq!(tempo_hint(0.2), "tighten");
        assert_eq!(tempo_hint(0.5), "steady");
        assert_eq!(tempo_hint(0.8), "soothe");
    }
}
