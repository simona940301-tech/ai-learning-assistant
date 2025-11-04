# ✅ PLMS Environment Setup Complete

**Date**: 2025-10-27T04:45:00Z  
**Status**: ✅ **CONFIGURED**

---

## 📋 Created Files

### 1. Environment Configuration

```
apps/web/
├── .env.local           ✅ Created (with actual Supabase keys)
└── .env.local.example   ✅ Created (template for others)
```

### 2. Environment Checking System

```
apps/web/
├── lib/
│   └── env-check.ts         ✅ Environment validation utility
├── components/
│   └── EnvChecker.tsx       ✅ Client component for runtime check
└── app/
    └── layout.tsx           ✅ Updated to include EnvChecker
```

### 3. Verification Script

```
scripts/
└── verify-env.sh            ✅ CLI tool to check env vars
```

---

## 🔧 Configuration Summary

### Supabase (✅ Configured)

```env
NEXT_PUBLIC_SUPABASE_URL=https://umzqjgxsetsmwzhniemw.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

### AI Providers (⚠️ Needs API Keys)

```env
OPENAI_API_KEY=sk-proj-placeholder-replace-with-your-key
GOOGLE_API_KEY=AIza-placeholder-replace-with-your-key
ANTHROPIC_API_KEY=sk-ant-placeholder-replace-with-your-key
```

**Action Required**: Replace placeholder API keys with real ones

### ASR Configuration (✅ Configured)

```env
ASR_PROVIDER=openai
ASR_UPLOAD_CODEC=opus
ASR_SAMPLE_RATE=16000
```

### App Meta (✅ Configured)

```env
NEXT_PUBLIC_APP_REGION=tw
NEXT_PUBLIC_TIMEZONE=Asia/Taipei
```

---

## 🧪 Verification Steps

### Step 1: Verify Environment File

```bash
# Run the verification script
bash scripts/verify-env.sh

# Expected output:
# ✅ Found apps/web/.env.local
# ✅ OK: NEXT_PUBLIC_SUPABASE_URL
# ✅ OK: NEXT_PUBLIC_SUPABASE_ANON_KEY
# ⚠️  PLACEHOLDER: OPENAI_API_KEY (needs real value)
# ...
```

### Step 2: Update API Keys (If Needed)

```bash
# Edit the .env.local file
nano apps/web/.env.local

# Replace these lines with your actual keys:
OPENAI_API_KEY=sk-proj-your-actual-key-here
GOOGLE_API_KEY=AIza-your-actual-key-here      # Optional
ANTHROPIC_API_KEY=sk-ant-your-actual-key-here # Optional
```

### Step 3: Start Development Server

```bash
# Start the dev server
pnpm run dev:web

# Wait for server to start (~20 seconds)
```

### Step 4: Check Browser Console

Open http://localhost:3000 in your browser and check the Console (F12 or Cmd+Opt+I):

**Expected Console Output**:

```
╔═══════════════════════════════════════════════════════╗
║  PLMS Environment Check                               ║
╚═══════════════════════════════════════════════════════╝

📍 Region & Timezone:
   Region: tw
   Configured TZ: Asia/Taipei
   Browser TZ: Asia/Taipei
   Current Time: 2025/10/27 下午12:45:00

🔌 Backend Connection:
   Supabase URL: https://umzqjgxsetsmwzhniemw.supabase.co
   Anon Key: ✅ Set

🎛️  Feature Flags:
   Analytics: ✅ Enabled
   Debug Logs: ✅ Enabled

✅ All environment checks passed

═══════════════════════════════════════════════════════
```

**Critical Check**:
```javascript
// You MUST see this line:
Region: tw
Configured TZ: Asia/Taipei
```

If you see `Not set`, the environment variables are not loaded correctly.

---

## 📊 Environment Variables Reference

### Public Variables (Exposed to Browser)

| Variable | Value | Required | Description |
|----------|-------|----------|-------------|
| `NEXT_PUBLIC_SUPABASE_URL` | https://umzqjgxsetsmwzhniemw.supabase.co | ✅ Yes | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | eyJhbGciOi... | ✅ Yes | Supabase anonymous key |
| `NEXT_PUBLIC_APP_REGION` | tw | ✅ Yes | App region code |
| `NEXT_PUBLIC_TIMEZONE` | Asia/Taipei | ✅ Yes | App timezone |
| `NEXT_PUBLIC_ENABLE_ANALYTICS` | true | ❌ No | Enable analytics tracking |
| `NEXT_PUBLIC_ENABLE_DEBUG_LOGS` | true | ❌ No | Enable debug console logs |

### Server-Side Variables (Not Exposed)

| Variable | Value | Required | Description |
|----------|-------|----------|-------------|
| `SUPABASE_SERVICE_ROLE_KEY` | eyJhbGciOi... | ✅ Yes | Supabase admin key (server only) |
| `OPENAI_API_KEY` | sk-proj-... | ✅ Yes | OpenAI API key for GPT models |
| `GOOGLE_API_KEY` | AIza-... | ❌ No | Google Gemini API key |
| `ANTHROPIC_API_KEY` | sk-ant-... | ❌ No | Anthropic Claude API key |
| `ASR_PROVIDER` | openai | ❌ No | ASR service provider |
| `ASR_UPLOAD_CODEC` | opus | ❌ No | Audio codec for ASR |
| `ASR_SAMPLE_RATE` | 16000 | ❌ No | Audio sample rate (Hz) |

---

## 🔍 Troubleshooting

### Issue 1: "timezone=Not set" in Console

**Problem**: Environment variable not loaded

**Solution**:
```bash
# 1. Check file exists
ls -la apps/web/.env.local

# 2. Check variable is set
grep NEXT_PUBLIC_TIMEZONE apps/web/.env.local

# 3. Restart dev server
# Stop server (Ctrl+C)
pnpm run dev:web
```

### Issue 2: "Supabase URL: Not set"

**Problem**: Supabase environment variables missing

**Solution**:
```bash
# Verify Supabase keys are in .env.local
grep SUPABASE apps/web/.env.local

# Should show:
# NEXT_PUBLIC_SUPABASE_URL=https://...
# NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
# SUPABASE_SERVICE_ROLE_KEY=eyJ...
```

### Issue 3: API Calls Failing

**Problem**: Missing or invalid API keys

**Solution**:
```bash
# Check OpenAI key format
grep OPENAI_API_KEY apps/web/.env.local

# Should start with: sk-proj-... (project key)
# If it says "placeholder", replace with real key
```

### Issue 4: Browser Timezone Mismatch

**Problem**: Configured TZ ≠ Browser TZ

**Console**:
```
⚠️  Timezone mismatch: configured=Asia/Taipei, browser=America/New_York
```

**This is OK if**:
- You're testing from a different timezone
- The app should still work correctly

**This is a problem if**:
- You need precise local time calculations
- Consider using browser timezone instead

---

## 🧪 E2E Test Prerequisites

Before running the full E2E test suite, ensure:

### Required (Critical)

- [x] ✅ `apps/web/.env.local` exists
- [x] ✅ `NEXT_PUBLIC_TIMEZONE=Asia/Taipei` set
- [x] ✅ Supabase URL and keys configured
- [ ] ⚠️  `OPENAI_API_KEY` has real value (not placeholder)

### Optional (Enhanced Features)

- [ ] ⏳ `GOOGLE_API_KEY` for Gemini support
- [ ] ⏳ `ANTHROPIC_API_KEY` for Claude support
- [ ] ⏳ ASR configuration for audio features

---

## 📝 Next Steps

### Immediate Actions

1. **Replace API Keys** (if using placeholders):
```bash
nano apps/web/.env.local
# Update OPENAI_API_KEY with real key
```

2. **Restart Dev Server**:
```bash
pnpm run dev:web
```

3. **Verify in Browser**:
   - Open http://localhost:3000
   - Check Console for environment check output
   - Confirm `timezone=Asia/Taipei` is displayed

### Ready for E2E Testing

Once you see this in the console:
```
✅ All environment checks passed
Region: tw
Configured TZ: Asia/Taipei
```

You can proceed to:
- E2E infrastructure health check
- Full subject detection testing
- Warmup API verification
- Solve flow testing

---

## 🎯 Quick Verification Command

```bash
# One-line check
bash scripts/verify-env.sh && pnpm run dev:web

# Expected result:
# ✅ All required variables configured
# Environment is ready!
# 
# Starting dev server...
# ✓ Ready in 15s
```

---

## ✅ Setup Complete Checklist

- [x] ✅ Created `apps/web/.env.local` with Supabase keys
- [x] ✅ Created `apps/web/.env.local.example` template
- [x] ✅ Created `lib/env-check.ts` utility
- [x] ✅ Created `components/EnvChecker.tsx` component
- [x] ✅ Updated `app/layout.tsx` to include checker
- [x] ✅ Created `scripts/verify-env.sh` verification tool
- [ ] ⏳ Replace placeholder API keys (if needed)
- [ ] ⏳ Verify console output shows timezone
- [ ] ⏳ Run E2E tests

---

## 📞 Support

### Verify Environment

```bash
# Check environment variables
bash scripts/verify-env.sh

# Check running server
curl http://localhost:3000

# Check console logs
# Open browser DevTools → Console → Look for "PLMS Environment Check"
```

### Common Commands

```bash
# Start dev server
pnpm run dev:web

# Verify environment before starting
bash scripts/verify-env.sh && pnpm run dev:web

# Run E2E tests (after server is running)
bash scripts/verify-solve-complete.sh
```

---

✅ **Environment Setup Complete**  
**Next**: Verify in browser console, then run E2E tests


