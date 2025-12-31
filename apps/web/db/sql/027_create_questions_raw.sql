-- Create questions_raw table for staging uploaded questions
create table if not exists questions_raw (
  id uuid default gen_random_uuid() primary key,
  source text not null, -- e.g., 'csv', 'pdf', 'excel', 'manual'
  raw_data jsonb not null, -- Stores the original data structure
  status text not null default 'pending', -- 'pending', 'processing', 'completed', 'failed'
  error_message text,
  processed_question_id uuid, -- Reference to seed_questions or ugc_questions (flexible, no FK constraint)
  processed_question_type text check (processed_question_type in ('seed', 'ugc', 'pack')),
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Create index for status to speed up polling
create index if not exists idx_questions_raw_status on questions_raw(status);

-- Create trigger to update updated_at (function already exists in schema)
create trigger update_questions_raw_updated_at
before update on questions_raw
for each row
execute function update_updated_at_column();
