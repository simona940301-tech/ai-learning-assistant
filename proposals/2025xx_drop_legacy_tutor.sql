-- Proposal: drop archived legacy tutor tables after observation window
-- Execute only after confirming no traffic hits 410 endpoints for 14 consecutive days.

-- drop table if exists legacy.solve_explanations_legacy_tmp cascade;
-- drop table if exists legacy.match_concepts_legacy_tmp cascade;
-- drop table if exists legacy.concept_edges_legacy_tmp cascade;
-- drop table if exists legacy.concepts_legacy_tmp cascade;
-- drop schema if exists legacy cascade;
