-- Keypoint to Concepts mapping table for legacy compatibility
create table if not exists keypoint_concepts (
  id uuid primary key default gen_random_uuid(),
  keypoint_code text not null,           -- e.g., 'TRIG_COS_LAW'
  concept_id text not null,              -- e.g., 'grammar_tense_consistency'
  subject text not null,                 -- 'MathA' or 'English'
  confidence numeric default 1.0,        -- mapping confidence
  created_at timestamptz default now(),
  unique(keypoint_code, concept_id, subject)
);

-- Index for fast lookups
create index if not exists idx_keypoint_concepts_keypoint on keypoint_concepts(keypoint_code);
create index if not exists idx_keypoint_concepts_concept on keypoint_concepts(concept_id);
create index if not exists idx_keypoint_concepts_subject on keypoint_concepts(subject);

-- Insert some sample mappings
insert into keypoint_concepts (keypoint_code, concept_id, subject, confidence) values
-- MathA keypoints mapped to English concepts (for cross-subject learning)
('TRIG_COS_LAW', 'grammar_tense_consistency', 'MathA', 0.8),
('VEC_DOT', 'grammar_participle_clause', 'MathA', 0.7),
('STAT_REGRESSION_LINE', 'grammar_relative_clause', 'MathA', 0.6),
('PROB_BAYES', 'grammar_gerund_infinitive', 'MathA', 0.5),
('LOG_CHANGE_BASE', 'grammar_conjunctions', 'MathA', 0.6),
('POLY_ROOTS', 'grammar_prepositions', 'MathA', 0.5),
('SEQ_AP', 'grammar_word_form', 'MathA', 0.7),
('COMB_BASIC', 'grammar_passive_voice', 'MathA', 0.6),
('TRIG_SINE_LAW', 'grammar_subjunctive', 'MathA', 0.5),
('MAT_BASIC', 'grammar_conditional', 'MathA', 0.6)
on conflict (keypoint_code, concept_id, subject) do nothing;
