# Missing Columns Analysis

## Current Trigger Columns (38 total):
1. id ✅
2. email ✅
3. username ✅
4. full_name ✅
5. avatar_url ✅
6. role ✅
7. onboarding_completed ✅
8. daily_energy_count ✅
9. daily_energy ✅
10. daily_energy_reset_at ✅
11. elo_rank ✅
12. coins ✅
13. xp ✅
14. streak ✅
15. user_wallet_balance ✅
16. created_at ✅
17. updated_at ✅
18. last_active_at ✅
19. skill_mastery_json ✅
20. examiner_contribution_score ✅
21. user_match_history ✅
22. avatar_tier ✅
23. chick_iq ✅
24. chick_explanations_used ✅
25. chick_fatigue ✅
26. chick_fatigue_battle_counter ✅
27. chick_soothe_used ✅
28. chick_emotion_state ✅
29. chick_hunger ✅
30. chick_intimacy ✅
31. food_bowls_count ✅
32. chick_exploration_allowance ✅
33. chick_evolution_stage ✅
34. chick_evolution_variant ✅
35. chick_buffs_unlocked ✅
36. chick_hunger_last_updated_at ✅
37. learning_dna ✅
38. focus_stats ✅

## Potentially Missing Columns from Schema:
Based on the screenshots, these columns might be missing:

### Nullable columns (OK to skip):
- display_name (nullable)
- target_university (nullable)
- target_department (nullable)
- initial_skill_assessment (nullable)
- avatar_preset (nullable)
- avatar_generated_at (nullable)
- chick_iq_last_decay_at (nullable)
- chick_explanations_reset_at (nullable)
- chick_soothe_reset_at (nullable)
- chick_emotion_updated_at (nullable)
- chick_exploration_start_at (nullable)
- chick_last_fed_at (nullable)
- chick_name (nullable)
- user_nickname (nullable)
- chick_hatched_at (nullable)
- chick_first_fed_at (nullable)
- last_seen_at (nullable)
- last_login_at (nullable)

### Columns with defaults (should be OK):
- All the ones we're already setting

## Recommendation:
Run `simulate-oauth.sql` to see the EXACT error message.
