use chrono::{DateTime, Duration, Utc};
use crate::battle_models::{
    Match, RecallOverlayPayload, RecallPrompt, RetestSuggestion,
};

#[derive(Debug, Clone)]
pub struct PostscriptCtx<'a> {
    pub match_record: &'a Match,
    pub user_id: &'a str,
    pub now: DateTime<Utc>,
}

#[derive(Debug, Clone)]
pub struct RetestCard {
    pub user_id: String,
    pub match_id: String,
    pub concept_id: String,
    pub difficulty: i32,
    pub scheduled_at: DateTime<Utc>,
}

pub fn generate_retest_cards(ctx: &PostscriptCtx) -> Vec<RetestCard> {
    let mut cards = Vec::new();
    let questions = &ctx.match_record.questions;
    if questions.is_empty() {
        return cards;
    }

    let mut sources: Vec<_> = questions.iter().rev().take(3).collect();
    if sources.len() < 3 {
        sources = questions.iter().rev().collect();
    }

    let schedule_offsets = [
        Duration::hours(24),
        Duration::days(7),
        Duration::days(7),
    ];

    for (idx, question) in sources.iter().enumerate() {
        let mut difficulty = question.difficulty;
        if idx == 2 {
            difficulty = (difficulty + 1).min(5);
        }
        let scheduled_at = ctx.now + schedule_offsets[idx.min(2)];
        cards.push(RetestCard {
            user_id: ctx.user_id.to_string(),
            match_id: ctx.match_record.id.clone(),
            concept_id: question.id.clone(),
            difficulty,
            scheduled_at,
        });
        if cards.len() == 3 {
            break;
        }
    }

    cards
}

pub fn summarize_cards(cards: &[RetestCard]) -> Vec<RetestSuggestion> {
    cards
        .iter()
        .map(|card| RetestSuggestion {
            concept_id: card.concept_id.clone(),
            difficulty: card.difficulty,
            scheduled_at: card.scheduled_at,
            label: format!("L{} · {}", card.difficulty, card.scheduled_at.format("%m/%d %H:%M")),
        })
        .collect()
}

pub fn recall_overlay(ctx: &PostscriptCtx) -> RecallOverlayPayload {
    let mut prompts = Vec::new();
    if let Some(first) = ctx.match_record.questions.get(0) {
        prompts.push(RecallPrompt {
            qid: "rec_1".to_string(),
            prompt: format!("用自己的話解釋「{}」的核心線索？", first.question_text),
        });
    }

    if let Some(focus) = ctx.match_record.questions.get(3).or_else(|| ctx.match_record.questions.last()) {
        prompts.push(RecallPrompt {
            qid: "rec_2".to_string(),
            prompt: format!("剛才第 {} 題的關鍵線索是什麼？", ctx.match_record.questions.len().min(4)),
        });
    }

    RecallOverlayPayload {
        duration_sec: 30,
        items: prompts,
    }
}
