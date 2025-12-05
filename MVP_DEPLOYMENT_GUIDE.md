# MVP Deployment Guide

## Quick Start

### 1. Set Environment Variables in Vercel

Go to your Vercel project dashboard → Settings → Environment Variables

Add the following variables for **Production** environment:

```bash
# Feature Flags - Hide Incomplete Features
NEXT_PUBLIC_ENABLE_DETECTIVE=false
NEXT_PUBLIC_ENABLE_EDITOR=false

# Production-Ready Features (Optional - defaults to true)
NEXT_PUBLIC_ENABLE_SYSTEM_BATTLE=true
NEXT_PUBLIC_ENABLE_CUSTOM_BATTLE=true
NEXT_PUBLIC_ENABLE_UGC=true
NEXT_PUBLIC_ENABLE_PRACTICE=true
NEXT_PUBLIC_ENABLE_FOCUS=true
```

### 2. Deploy to Production

```bash
git add .
git commit -m "feat: add feature flags and PWA auto-update"
git push origin main
```

Vercel will automatically deploy your changes.

### 3. Verify Deployment

1. Visit your production URL
2. Open browser console (F12)
3. Look for the environment check log showing:
   ```
   🎮 Game Modes:
      Enabled: SYSTEM_BATTLE, CUSTOM_BATTLE, UGC_MODE, PRACTICE_MODE, FOCUS_MODE
      Disabled: DETECTIVE_MODE, EDITOR_MODE
   ```
4. Navigate to `/play` and confirm Detective and Editor modes are hidden

---

## Feature Flag Management

### Enabling a Feature

To enable Detective or Editor mode in production:

1. Go to Vercel Dashboard → Settings → Environment Variables
2. Find `NEXT_PUBLIC_ENABLE_DETECTIVE` or `NEXT_PUBLIC_ENABLE_EDITOR`
3. Change value from `false` to `true`
4. Click "Save"
5. Redeploy (or wait for next deployment)

### Disabling a Feature

Change the environment variable from `true` to `false` and redeploy.

### Testing Features in Preview

For preview deployments, you can set different values:

1. Go to Environment Variables
2. Add the same variable for **Preview** environment
3. Set to `true` to test incomplete features
4. Deploy a preview branch to test

---

## PWA Auto-Update

### How It Works

1. User visits your app (PWA installed or browser)
2. Service worker checks for updates every 60 seconds
3. When new version is deployed, a notification appears:
   - **Desktop**: Bottom-center toast with "刷新" button
   - **Mobile**: Full-width toast above tab bar
4. User clicks "刷新" → App reloads with new version
5. Auto-dismisses after 30 seconds if ignored

### Testing Updates Locally

```bash
# Terminal 1: Build and start production server
npm run build
npm start

# Terminal 2: Make a code change, rebuild
# Edit any file (e.g., change a text)
npm run build
npm start

# Browser: Reload the page
# Expected: Update notification appears
```

### Verifying in Production

1. Deploy version A
2. Make a small change (e.g., update text)
3. Deploy version B
4. Open app (version A still loaded)
5. Wait ~60 seconds
6. Update notification should appear
7. Click "刷新"
8. Version B loads

---

## Environment Variables Reference

### Feature Flags

| Variable | Default | Description |
|----------|---------|-------------|
| `NEXT_PUBLIC_ENABLE_DETECTIVE` | `false` | 偵探檔案模式 (incomplete) |
| `NEXT_PUBLIC_ENABLE_EDITOR` | `false` | 實習編輯模式 (incomplete) |
| `NEXT_PUBLIC_ENABLE_FOCUS` | `true` | 專注修煉模式 |
| `NEXT_PUBLIC_ENABLE_PRACTICE` | `true` | 無限練習模式 |
| `NEXT_PUBLIC_ENABLE_UGC` | `true` | 內容貢獻模式 |
| `NEXT_PUBLIC_ENABLE_SYSTEM_BATTLE` | `true` | 系統對戰 |
| `NEXT_PUBLIC_ENABLE_CUSTOM_BATTLE` | `true` | 自訂對戰 |

### Other Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `NEXT_PUBLIC_SUPABASE_URL` | ✅ Yes | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | ✅ Yes | Supabase anonymous key |
| `NEXT_PUBLIC_TIMEZONE` | No | Default: `Asia/Taipei` |
| `NEXT_PUBLIC_APP_REGION` | No | Default: `tw` |

---

## Rollback Procedures

### Quick Rollback (Vercel)

1. Go to Vercel Dashboard → Deployments
2. Find the last working deployment
3. Click "..." → "Promote to Production"
4. Confirm

### Feature-Specific Rollback

If a specific feature is causing issues:

1. Set its environment variable to `false`
2. Redeploy or promote previous deployment
3. Feature will be hidden immediately

### Emergency Rollback

```bash
# Revert last commit
git revert HEAD
git push origin main

# Or reset to specific commit
git reset --hard <commit-hash>
git push --force origin main
```

---

## Monitoring

### Check Enabled Features

Open browser console on production site:

```
🎮 Game Modes:
   Enabled: SYSTEM_BATTLE, CUSTOM_BATTLE, ...
   Disabled: DETECTIVE_MODE, EDITOR_MODE
```

### Service Worker Status

```javascript
// In browser console
navigator.serviceWorker.getRegistration().then(reg => {
  console.log('SW State:', reg.active?.state)
  console.log('Waiting:', reg.waiting)
  console.log('Installing:', reg.installing)
})
```

---

## Troubleshooting

### Features Not Hiding

1. Check environment variables are set correctly in Vercel
2. Verify deployment completed successfully
3. Hard refresh browser (Cmd+Shift+R / Ctrl+Shift+F5)
4. Check browser console for feature flag log

### Update Notification Not Appearing

1. Ensure PWA is enabled (`NODE_ENV=production`)
2. Check service worker is registered:
   ```javascript
   navigator.serviceWorker.getRegistration()
   ```
3. Wait 60 seconds after deployment
4. Check browser console for `[SW Update]` logs

### PWA Not Installing

1. Ensure HTTPS is enabled (required for PWA)
2. Check `manifest.json` is accessible
3. Verify service worker is registered
4. Check browser console for errors

---

## Best Practices

1. **Always test in Preview first** before enabling features in Production
2. **Monitor user feedback** after enabling new features
3. **Use gradual rollout** - enable for Preview → Staging → Production
4. **Keep feature flags temporary** - remove code when feature is stable
5. **Document feature status** in code comments

---

## Support

If you encounter issues:

1. Check browser console for errors
2. Verify environment variables in Vercel
3. Test in Preview environment first
4. Review deployment logs in Vercel
