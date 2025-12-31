# 🐣 Hatching Ceremony System - Deployment Guide

## 🎯 Overview
This guide provides step-by-step instructions for deploying the complete hatching ceremony and top-tier UX features system.

## ⚠️ Pre-Deployment Safety Checks

### 1. Backup Current System
```bash
# Backup database
pg_dump $DATABASE_URL > backup_before_hatching_$(date +%Y%m%d).sql

# Backup current codebase
git branch backup/before-hatching-ceremony
git checkout backup/before-hatching-ceremony
git push origin backup/before-hatching-ceremony
git checkout main
```

### 2. Verify Dependencies
```bash
# Check that all required packages are installed
npm list framer-motion
npm list zustand
npm list @types/web
```

## 🗄️ Database Migration

### Step 1: Apply Migration
```bash
# Navigate to web app directory
cd apps/web

# Apply the migration
psql $DATABASE_URL < supabase/migrations/20250201_add_chick_hatching_system.sql
```

### Step 2: Verify Migration
```sql
-- Check that all columns were added
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'profiles' 
AND column_name IN ('chick_name', 'user_nickname', 'chick_hatched_at', 'chick_first_fed_at', 'last_seen_at');

-- Check that function was created
SELECT routine_name FROM information_schema.routines WHERE routine_name = 'use_chick_whistle';
```

Expected output:
```
column_name        | data_type                   | is_nullable
-------------------|----------------------------|-------------
chick_name         | text                       | YES
user_nickname      | text                       | YES
chick_hatched_at   | timestamp with time zone   | YES
chick_first_fed_at | timestamp with time zone   | YES
last_seen_at       | timestamp with time zone   | YES

routine_name
---------------
use_chick_whistle
```

## 🚀 Application Deployment

### Step 1: Build Application
```bash
# Install dependencies
npm install

# Build the application
npm run build

# Run type check
npm run type-check
```

### Step 2: Test Critical Paths
```bash
# Test API endpoints
curl -X POST http://localhost:3000/api/chick/status -H "Authorization: Bearer $TEST_TOKEN"

# Test database function
psql $DATABASE_URL -c "SELECT use_chick_whistle('$TEST_USER_ID'::uuid, 50);"
```

## 🧪 Post-Deployment Verification

### 1. New User Hatching Flow
1. **Open application in incognito mode**
2. **Complete goal setting** in onboarding
3. **Verify hatching ceremony appears** before challenge
4. **Test all 4 stages**:
   - Egg clicking (5-8 clicks)
   - Progressive cracking animation
   - Naming form validation
   - First feed tutorial
   - Purpose declaration
5. **Confirm onboarding continues** after ceremony

### 2. Smart Triggers Testing
1. **Idle Detection**: Stay on home page for 10 seconds without interaction
2. **Consecutive Errors**: Answer 3 questions wrong in a row
3. **First Visit**: Navigate to a new page for the first time
4. **Low Energy**: Set energy to 2 or below (admin panel)
5. **Streak Broken**: Break a learning streak

### 3. Persistent Bubbles
1. **Trigger high-priority message** (low energy)
2. **Verify bubble stays visible** after 5 seconds
3. **Test dismiss functionality**
4. **Check priority styling** (red bubble with shake animation)

### 4. Reunion System
1. **Set last_seen_at to 3 days ago** in database
2. **Refresh application**
3. **Verify reunion modal appears** with crying chick
4. **Test whistle system** (requires 50 coins)

### 5. Refusal Mechanism
1. **Set chick to sick state** in database
2. **Click on chick widget**
3. **Verify turn-away animation** (180° rotation)
4. **Test healing button** functionality

## 🔧 Configuration Options

### Environment Variables
```bash
# Optional: Enable debug mode for chick system
NEXT_PUBLIC_CHICK_DEBUG=true

# Optional: Adjust reunion thresholds
NEXT_PUBLIC_REUNION_HAPPY_DAYS=1
NEXT_PUBLIC_REUNION_SAD_DAYS=3  
NEXT_PUBLIC_REUNION_RUNAWAY_DAYS=7
```

### Feature Flags
```typescript
// In apps/web/lib/feature-flags.ts
export const FEATURES = {
  HATCHING_CEREMONY: true,
  SMART_TRIGGERS: true,
  PERSISTENT_BUBBLES: true,
  REUNION_SYSTEM: true,
  REFUSAL_MECHANISM: true,
} as const
```

## 🚨 Rollback Plan

If issues are detected post-deployment:

### 1. Database Rollback
```sql
-- Remove added columns (CAUTION: This will lose data)
ALTER TABLE profiles DROP COLUMN IF EXISTS chick_name;
ALTER TABLE profiles DROP COLUMN IF EXISTS user_nickname;
ALTER TABLE profiles DROP COLUMN IF EXISTS chick_hatched_at;
ALTER TABLE profiles DROP COLUMN IF EXISTS chick_first_fed_at;
ALTER TABLE profiles DROP COLUMN IF EXISTS last_seen_at;

-- Remove function
DROP FUNCTION IF EXISTS use_chick_whistle(UUID, INTEGER);
```

### 2. Code Rollback
```bash
# Revert to backup branch
git checkout backup/before-hatching-ceremony
git push origin main --force

# Redeploy
npm run build
npm run deploy
```

## 📊 Monitoring & Analytics

### Key Metrics to Monitor
1. **Hatching Completion Rate**: % of users who complete all 4 stages
2. **Smart Trigger Engagement**: Click-through rate on chick guidance
3. **Reunion Return Rate**: % of users who return after 3+ days
4. **Refusal Interaction**: Healing/feeding button usage
5. **Performance Impact**: Page load times and animation smoothness

### Database Queries for Monitoring
```sql
-- Hatching completion rate
SELECT 
  COUNT(CASE WHEN chick_hatched_at IS NOT NULL THEN 1 END) * 100.0 / COUNT(*) as completion_rate
FROM profiles 
WHERE created_at >= NOW() - INTERVAL '7 days';

-- Average time to complete hatching
SELECT AVG(chick_hatched_at - created_at) as avg_hatching_time
FROM profiles 
WHERE chick_hatched_at IS NOT NULL;

-- Reunion statistics
SELECT 
  AVG(EXTRACT(EPOCH FROM (NOW() - last_seen_at))/86400) as avg_days_away
FROM profiles 
WHERE last_seen_at < NOW() - INTERVAL '1 day';
```

## 🎉 Success Criteria

The deployment is considered successful when:

✅ **New users see hatching ceremony** before onboarding challenge
✅ **All 4 ceremony stages work** without errors
✅ **Smart triggers activate** based on user behavior
✅ **Persistent bubbles require** explicit dismissal
✅ **Reunion system triggers** for returning users
✅ **Refusal mechanism responds** to chick health state
✅ **No performance degradation** in existing features
✅ **Mobile experience is smooth** with proper touch interactions
✅ **Database migration completed** without data loss

## 📞 Support

If you encounter any issues during deployment:

1. **Check browser console** for JavaScript errors
2. **Review server logs** for API errors
3. **Verify database connectivity** and migration status
4. **Test in different browsers** and devices
5. **Monitor user feedback** for UX issues

**🚀 Ready to launch the most engaging chick companion system ever built!**