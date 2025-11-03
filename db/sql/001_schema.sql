-- pgvector for semantic search
create extension if not exists vector;

-- 核心：各科共用考點表
create table if not exists concepts (
  id text primary key,
  subject text not null,                  -- 例：'英文'、未來可 '數學'
  category text not null,                 -- 例：'語法'、'閱讀'
  name text not null,                     -- 例：'分詞構句'
  definition text not null,
  common_mistakes jsonb default '[]',
  recognition_cues jsonb default '[]',
  pattern_template jsonb default '[]',
  related_points jsonb default '[]',
  difficulty int check (difficulty between 1 and 5),
  frequency numeric check (frequency between 0 and 1),
  ai_hint text,
  example text,
  example_translation text,
  textbook_ref text,
  cefr_level text,
  tags jsonb default '[]',
  alias jsonb default '[]',
  search_text tsvector,
  embedding vector(1536),
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index if not exists idx_concepts_subject on concepts(subject);
create index if not exists idx_concepts_search on concepts using gin(search_text);
create index if not exists idx_concepts_embedding on concepts using ivfflat (embedding vector_cosine_ops) with (lists = 100);

-- 概念關聯（干擾選項／前後序）
create table if not exists concept_edges (
  src_id text references concepts(id) on delete cascade,
  dst_id text references concepts(id) on delete cascade,
  relation text not null,                 -- 'confusable' | 'prereq' | 'nearby'
  weight numeric default 0.5,
  primary key (src_id, dst_id, relation)
);

-- 一次出題互動（四選項）
create table if not exists solve_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid,
  subject text not null,                  -- '英文'
  prompt text not null,                   -- 題幹或 OCR 文本
  source_meta jsonb,
  created_at timestamptz default now()
);

-- 本次候選選項（其中一個 is_answer=true）
create table if not exists solve_options (
  id uuid primary key default gen_random_uuid(),
  session_id uuid references solve_sessions(id) on delete cascade,
  concept_id text references concepts(id),
  label text not null,
  is_answer boolean default false,
  rank int,
  score numeric,
  created_at timestamptz default now()
);

-- 使用者回覆
create table if not exists solve_responses (
  id uuid primary key default gen_random_uuid(),
  session_id uuid references solve_sessions(id) on delete cascade,
  option_id uuid references solve_options(id) on delete set null,
  selected_concept_id text,
  is_correct boolean,
  latency_ms int,
  feedback jsonb,
  created_at timestamptz default now()
);

-- 解析（逐步解析 / 快速解答）
create table if not exists solve_explanations (
  id uuid primary key default gen_random_uuid(),
  session_id uuid references solve_sessions(id) on delete cascade,
  concept_id text references concepts(id),   -- 正解考點
  mode text check (mode in ('step','fast')),
  summary text,
  steps jsonb,
  contrast jsonb,
  extensions jsonb,
  created_at timestamptz default now()
);

-- 觸發器：全文索引與 updated_at
create or replace function concepts_tsv_update()
returns trigger language plpgsql as $$
begin
  new.search_text :=
    setweight(to_tsvector('simple', coalesce(new.name,'')), 'A') ||
    setweight(to_tsvector('simple', coalesce(new.definition,'')), 'B') ||
    setweight(to_tsvector('simple', array_to_string(coalesce(new.tags,'{}')::text[], ' ')), 'C');
  new.updated_at := now();
  return new;
end $$;

drop trigger if exists trg_concepts_tsv on concepts;
create trigger trg_concepts_tsv
before insert or update on concepts
for each row execute function concepts_tsv_update();
