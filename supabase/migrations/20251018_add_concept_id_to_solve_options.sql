-- Add nullable concept_id column to solve_options for new answer flow

alter table if exists public.solve_options
  add column if not exists concept_id text null;

create index if not exists idx_solve_options_concept_id
  on public.solve_options (concept_id);
