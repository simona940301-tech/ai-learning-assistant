-- MathA Database Schema for Ask Tutor System
-- Subjects table
create table if not exists subjects (
  id uuid primary key default gen_random_uuid(),
  name text unique not null  -- e.g., 'English', 'MathA'
);

-- Exams table
create table if not exists exams (
  id uuid primary key default gen_random_uuid(),
  subject_id uuid references subjects(id) on delete cascade,
  year int not null,              -- 107..113
  label text,                     -- e.g., '數學A'
  unique(subject_id, year, label)
);

-- Keypoints dictionary（考點）
create table if not exists keypoints (
  id uuid primary key default gen_random_uuid(),
  subject_id uuid references subjects(id) on delete cascade,
  category text not null,         -- 標準化章節
  code text not null,             -- e.g., 'TRIG_COS_LAW', 'STAT_REGRESSION_LINE'
  name text not null,             -- 顯示名稱：餘弦定理、迴歸直線、等差數列定義...
  description text,               -- 一句話定義
  strategy_template jsonb,        -- {steps:[], checks:[], tips:[]}
  error_patterns jsonb,           -- [{pattern, note}]
  unique(subject_id, code)
);

-- Questions（題目本體）
create table if not exists questions (
  id uuid primary key default gen_random_uuid(),
  exam_id uuid references exams(id) on delete cascade,
  number text,                    -- '1', '7', '選填C', '混合19-1'
  qtype text not null,            -- 'single','multiple','fill','hybrid'
  prompt text not null,           -- 題幹（純文字）
  assets jsonb,                   -- 公式/圖檔路徑等
  options jsonb,                  -- [{key:'1', text:'…'}]，多選題也可用
  answer jsonb,                   -- 單選：'4'；多選：['1','4']；填充：文字/表達式
  difficulty text,                -- 易/中/中偏難/難
  objectives text[],              -- 測驗目標（原文）
  source_units text[],            -- 命題出處（原文）
  rationale jsonb,                -- 每個選項的解析/為何錯
  solution jsonb,                 -- {outline:[…], steps:[{title, detail}]}
  stats jsonb,                    -- {p_value, disc, year_topline,…} 可留空
  meta jsonb                      -- 其它（如「素養題」標記）
);

-- 多對多：題目 ↔ 考點（主/輔）
create table if not exists question_keypoints (
  question_id uuid references questions(id) on delete cascade,
  keypoint_id uuid references keypoints(id) on delete cascade,
  role text check (role in ('primary','aux')) not null,
  weight numeric default 1.0,
  primary key (question_id, keypoint_id, role)
);

-- 為「四個考點選一」生成紀錄（診斷題庫，非必填）
create table if not exists keypoint_mcq_bank (
  id uuid primary key default gen_random_uuid(),
  subject_id uuid references subjects(id) on delete cascade,
  stem text not null,             -- 「以下哪一個是『餘弦定理』的正確敘述？」
  choices jsonb not null,         -- 4 個考點的敘述（1 真 3 假/相近干擾）
  answer text not null,           -- 正確選項 key
  keyed_keypoint_id uuid references keypoints(id), -- 正確對應的考點
  difficulty text default '中',
  tags text[]
);

-- Indexes for performance
create index if not exists idx_keypoints_subject_category on keypoints(subject_id, category);
create index if not exists idx_keypoints_code on keypoints(code);
create index if not exists idx_questions_exam on questions(exam_id);
create index if not exists idx_questions_number on questions(exam_id, number);
create index if not exists idx_question_keypoints_question on question_keypoints(question_id);
create index if not exists idx_question_keypoints_keypoint on question_keypoints(keypoint_id);
create index if not exists idx_keypoint_mcq_subject on keypoint_mcq_bank(subject_id);
