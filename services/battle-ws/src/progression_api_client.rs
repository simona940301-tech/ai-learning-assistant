use crate::battle_models::{Match, Question, MatchMode};
use chrono::Utc;
use serde::Serialize;
use serde_json::json;
use std::env;
use reqwest::header;
use tracing::{error, info};

#[derive(Serialize, Clone)]
pub struct ProgressionParticipant {
    pub userId: String,
    pub correctAnswers: usize,
    pub answeredQuestions: usize,
    pub totalQuestions: usize,
    pub didWin: bool,
    pub mode: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub isPvp: Option<bool>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub isPerfectGame: Option<bool>,
}

#[derive(Serialize)]
pub struct ProgressionPayload {
    pub matchId: String,
    pub matchMode: String,
    pub participants: Vec<ProgressionParticipant>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub endedAt: Option<String>,
}

fn api_base() -> String {
    env::var("NEXTJS_API_URL").unwrap_or_else(|_| "http://localhost:3000".to_string())
}

fn api_key() -> Option<String> {
    env::var("INTERNAL_API_KEY")
        .ok()
        .or_else(|| env::var("BATTLE_EVENTS_API_KEY").ok())
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

pub async fn should_force_tutorial(user_id: &str) -> bool {
    let client = reqwest::Client::new();
    let endpoint = with_vercel_bypass_url(format!(
        "{}/api/play/progression/tutorial",
        api_base()
    ));
    let body = json!({ "userId": user_id });
    let mut req = client.post(endpoint).json(&body);
    if let Some(key) = api_key() {
        req = req.header("x-internal-api-key", key);
    }
    req = apply_vercel_bypass(req);

    match req.send().await {
        Ok(resp) => {
            if let Ok(json) = resp.json::<serde_json::Value>().await {
                return json
                    .get("shouldStartTutorial")
                    .and_then(|v| v.as_bool())
                    .unwrap_or(false);
            }
            false
        }
        Err(err) => {
            error!("Failed to check tutorial requirement: {}", err);
            false
        }
    }
}

pub async fn apply_battle_progression(payload: ProgressionPayload) {
    let client = reqwest::Client::new();
    let endpoint = with_vercel_bypass_url(format!(
        "{}/api/play/progression/apply-battle",
        api_base()
    ));
    let mut req = client.post(endpoint).json(&payload);
    if let Some(key) = api_key() {
        req = req.header("x-internal-api-key", key.clone());
    }
    req = apply_vercel_bypass(req);

    match req.send().await {
        Ok(resp) => {
            if resp.status().is_success() {
                info!(
                    "Progression applied for match {} (participants={})",
                    payload.matchId,
                    payload.participants.len()
                );
            } else {
                let status = resp.status();
                let text = resp.text().await.unwrap_or_default();
                error!(
                    "Progression API failed: status={} body={}",
                    status, text
                );
            }
        }
        Err(err) => {
            error!("Failed to call progression API: {}", err);
        }
    }
}

fn count_correct_answers(answers: &[Option<String>], questions: &[Question]) -> usize {
    answers
        .iter()
        .zip(questions.iter())
        .filter(|(ans, question)| {
            ans.as_ref()
                .map(|a| a.trim().eq_ignore_ascii_case(&question.correct_answer))
                .unwrap_or(false)
        })
        .count()
}

pub fn build_payload(match_record: &Match) -> Option<ProgressionPayload> {
    if match_record.player1_id.is_empty() {
        return None;
    }
    let total_questions = match_record.questions.len();
    let player1_correct =
        count_correct_answers(&match_record.player1_answers, &match_record.questions);
    let player2_correct =
        count_correct_answers(&match_record.player2_answers, &match_record.questions);

    let mut participants = vec![ProgressionParticipant {
        userId: match_record.player1_id.clone(),
        correctAnswers: player1_correct,
        answeredQuestions: match_record
            .player1_answers
            .iter()
            .filter(|ans| ans.is_some())
            .count(),
        totalQuestions: total_questions,
        didWin: match_record.player1_score >= match_record.player2_score,
        mode: match_record.match_type.clone(),
        isPvp: Some(match_record.mode == MatchMode::Pvp),
        isPerfectGame: Some(player1_correct == total_questions && total_questions > 0),
    }];

    if match_record.mode == MatchMode::Pvp && match_record.player2_id != "AI" {
        participants.push(ProgressionParticipant {
            userId: match_record.player2_id.clone(),
            correctAnswers: player2_correct,
            answeredQuestions: match_record
                .player2_answers
                .iter()
                .filter(|ans| ans.is_some())
                .count(),
            totalQuestions: total_questions,
            didWin: match_record.player2_score >= match_record.player1_score,
            mode: match_record.match_type.clone(),
            isPvp: Some(true),
            isPerfectGame: Some(player2_correct == total_questions && total_questions > 0),
        });
    }

    Some(ProgressionPayload {
        matchId: match_record.id.clone(),
        matchMode: match_record.match_type.clone(),
        participants,
        endedAt: Some(Utc::now().to_rfc3339()),
    })
}
