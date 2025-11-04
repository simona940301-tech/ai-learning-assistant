-- Archive legacy tutor tables into a dedicated schema for a 14-day observation window

create schema if not exists legacy;

-- Move legacy tutor tables if they still exist in the public schema
alter table if exists public.concepts rename to concepts_legacy_tmp;
alter table if exists public.concept_edges rename to concept_edges_legacy_tmp;
alter table if exists public.match_concepts rename to match_concepts_legacy_tmp;
alter table if exists public.solve_explanations rename to solve_explanations_legacy_tmp;

alter table if exists public.concepts_legacy_tmp set schema legacy;
alter table if exists public.concept_edges_legacy_tmp set schema legacy;
alter table if exists public.match_concepts_legacy_tmp set schema legacy;
alter table if exists public.solve_explanations_legacy_tmp set schema legacy;

comment on schema legacy is 'Archived legacy tutor tables pending deletion after 14-day observation window';
