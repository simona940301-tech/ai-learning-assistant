# Migration Execution Guide - Ready Score Fix

## Overview

This guide walks through executing the migrations to fix the Ready Score calculation issue.

## Prerequisites

- ✅ Supabase project access
- ✅ Database admin credentials
- ✅ Migrations reviewed and approved

## Migration Files

1. **`db/sql/040_user_answers_table.sql`** - Creates user_answers table
2. **`db/migrations/034_update_english_performance_rpc.sql`** - Updates RPC function

## Execution Steps

### Option 1: Supabase Dashboard (Recommended)

1. **Navigate to SQL Editor**
   - Open Supabase Dashboard
   - Go to SQL Editor tab

2. **Execute Table Migration**
   ```sql
   -- Copy and paste content from:
   -- db/sql/040_user_answers_table.sql
   ```
   - Click "Run"
   - Verify success message

3. **Execute RPC Migration**
   ```sql
   -- Copy and paste content from:
   -- db/migrations/034_update_english_performance_rpc.sql
   ```
   - Click "Run"
   - Verify success message

4. **Verify Table Creation**
   ```sql
   -- Check table exists
   SELECT table_name 
   FROM information_schema.tables 
   WHERE table_name = 'user_answers';
   
   -- Check RLS is enabled
   SELECT tablename, rowsecurity 
   FROM pg_tables 
   WHERE tablename = 'user_answers';
   
   -- Check policies exist
   SELECT policyname, cmd 
   FROM pg_policies 
   WHERE tablename = 'user_answers';
   ```

### Option 2: Command Line (Advanced)

```bash
# From apps/web directory

# Execute table migration
psql $DATABASE_URL -f db/sql/040_user_answers_table.sql

# Execute RPC migration
psql $DATABASE_URL -f db/migrations/034_update_english_performance_rpc.sql
```

## Verification

### 1. Test Data Insert

```sql
-- Insert test record (replace with your user_id)
INSERT INTO user_answers (user_id, question_id, is_correct, metadata)
VALUES (
  'YOUR_USER_ID_HERE',
  'test-question-1',
  true,
  '{"subject": "english", "difficulty": 3, "response_time_ms": 5000, "source": "test"}'::jsonb
);

-- Verify insert
SELECT * FROM user_answers WHERE question_id = 'test-question-1';

-- Clean up
DELETE FROM user_answers WHERE question_id = 'test-question-1';
```

### 2. Test RPC Function

```sql
-- Test RPC (replace with your user_id)
SELECT * FROM get_weighted_english_performance('YOUR_USER_ID_HERE');

-- Expected output:
-- weighted_correct_sum | total_difficulty_sum | total_questions_count | avg_response_time_ms
-- 0                    | 0                    | 0                     | 0
```

### 3. Test via Application

1. **Play a Battle**
   - Navigate to `/play`
   - Start a PVE battle
   - Complete 5 questions

2. **Check Database**
   ```sql
   -- Verify records were inserted
   SELECT COUNT(*) FROM user_answers WHERE metadata->>'source' = 'pve_match';
   ```

3. **Check Profile Page**
   - Navigate to `/profile`
   - Verify "5 / 30 題" appears
   - Verify Academic score > 0

## Rollback Plan

If anything goes wrong:

```sql
-- Drop table (cascades to all dependent objects)
DROP TABLE IF EXISTS user_answers CASCADE;

-- Revert RPC to original (if needed)
-- Copy original from db/migrations/033_get_weighted_english_performance.sql
```

## Expected Results

After successful migration:

✅ `user_answers` table exists  
✅ RLS policies active  
✅ Indexes created  
✅ RPC function updated  
✅ Data starts flowing after battles  
✅ Ready Score updates on Profile page  

## Troubleshooting

### Issue: "relation user_answers does not exist"

**Solution**: Run `040_user_answers_table.sql` migration

### Issue: "permission denied for table user_answers"

**Solution**: Check RLS policies are created correctly

### Issue: "function get_weighted_english_performance does not exist"

**Solution**: Run `034_update_english_performance_rpc.sql` migration

### Issue: Data not inserting

**Check**:
1. RLS policies allow INSERT for authenticated users
2. API route is being called (check browser console)
3. No errors in server logs

## Post-Migration Checklist

- [ ] Table `user_answers` exists
- [ ] RLS is enabled
- [ ] 3 policies exist (SELECT, INSERT, ALL)
- [ ] 5 indexes created
- [ ] RPC function updated
- [ ] Test insert successful
- [ ] Test RPC returns data
- [ ] Play a battle and verify data saves
- [ ] Profile page shows progress

## Next Steps

After successful migration:

1. **Monitor Performance**
   - Check query performance
   - Monitor index usage
   - Watch for slow queries

2. **Verify User Experience**
   - Ready Score updates correctly
   - Progress indicator shows accurate count
   - No errors in console

3. **Document**
   - Update walkthrough with results
   - Note any issues encountered
   - Share learnings with team

## Support

If you encounter issues:

1. Check server logs for errors
2. Verify migrations ran successfully
3. Test with diagnostic script: `npx tsx scripts/diagnose-ready-score.ts`
4. Review this guide's troubleshooting section
