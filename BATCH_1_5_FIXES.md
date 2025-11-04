# Batch 1.5 Bug Fixes - Verification Report

**Date**: 2025-10-26
**Engineer**: Claude (值班工程師)
**Status**: ✅ Fixes Completed, Ready for Testing

---

## 🔍 Root Cause Analysis

### Issue #1: CTA「再練一題」卡 Loading / 無反應

**Root Cause**:
- `track()` 呼叫可能阻塞主流程（如果 analytics 上報失敗或慢）
- 沒有可觀測的日誌，難以追蹤問題
- Error handling 不完善，失敗時 loading 狀態未正確結束

**Symptoms**:
- 點擊「再練一題」後按鈕顯示 loading，但永遠不會進入下一題
- Console 可能有未捕捉的 Promise rejection
- Network 請求可能卡在 pending 或 failed

---

### Issue #2: 輸入框送出後不清空

**Root Cause**:
- `InputDock.tsx` 使用 `defaultValue` 而非受控的 `value` (L126)
- Enter 送出時有清空邏輯 (L132-133: `target.value = ''`)
- **但** 表單送出 (button submit, L36-40) **沒有清空邏輯**
- `onChange` 沒有正確綁定 `value` 屬性，導致殘留

**Symptoms**:
- 按 Enter 送出：會清空（但這是手動 DOM 操作，非 React 狀態）
- 按送出按鈕：**不會清空**
- 導致使用者體驗不一致

---

### Issue #3: 「完成任務」無 UI 變化

**Root Cause**:
- `MicroMissionCard` 只在 mount 時 `fetchMissionData()` (L43-45)
- 完成任務後，沒有自動重新 fetch
- 沒有 polling 機制
- 沒有 optimistic UI 更新
- 依賴使用者手動刷新頁面或重新進入

**Symptoms**:
- 完成最後一題後，卡片顯示仍然是「剩餘 1 題」
- Streak 不會 +1
- 進度條不會更新到 100%
- Confetti 不會觸發

---

## 🛠 Fixes Applied

### Fix #1: ExplanationCard - 非阻塞 Analytics + 可觀測日誌

**File**: `apps/web/components/explain/ExplanationCard.tsx`

**Changes**:
1. ✅ `track()` 呼叫改為 fire-and-forget（L112-118）
2. ✅ 添加時間戳日誌（L100-101, L134, L137-145, L150-152）
3. ✅ 明確標註每個步驟：點擊 → 請求 → 回應 → 導航
4. ✅ 保留 graceful fallback（L165-169）：失敗後 1.5s 仍然導航

**Key Code**:
```typescript
// L100-101: Click timestamp
const startTime = Date.now();
console.log(`[ExplanationCard] CTA clicked at ${new Date().toISOString()}`);

// L112-118: Fire-and-forget analytics (non-blocking)
track('cta_practice_again_click', {
  skillId: skill,
  currentDifficulty: difficulty,
  difficultyBand,
  questionId,
});

// L137-145: API timing
const fetchStartTime = Date.now();
const response = await fetch('/api/missions/start', { ... });
const fetchEndTime = Date.now();
console.log(`[ExplanationCard] API responded in ${fetchEndTime - fetchStartTime}ms`);

// L150-152: Total timing
const totalTime = Date.now() - startTime;
console.log(`[ExplanationCard] Total time: ${totalTime}ms - Navigating to /play`);
```

**Expected Behavior**:
- ✅ CTA 點擊後立即進入 loading（非阻塞）
- ✅ P95 ≤ 2s 導航到下一題
- ✅ Console 顯示完整事件流（時間戳）
- ✅ 失敗時自動重試（1.5s），loading 正確結束

---

### Fix #2: InputDock - 受控輸入 + 立即清空

**File**: `components/ask/InputDock.tsx`

**Changes**:
1. ✅ `defaultValue` → `value` (L135)
2. ✅ `onInput` → `onChange` (L155-157)
3. ✅ 表單送出前 **立即** 呼叫 `onChange('')` (L43-44)
4. ✅ Enter 送出前 **立即** 呼叫 `onChange('')` (L148)
5. ✅ 添加日誌（L40-41, L145, L148, L151-152）

**Key Code**:
```typescript
// L40-44: Form submit handler
const handleSubmit = async (event: FormEvent) => {
  event.preventDefault()
  if (!value.trim() || isBusy) return

  const submitValue = value.trim()
  console.log(`[InputDock] Submitting at ${new Date().toISOString()}:`, submitValue)

  // Clear input IMMEDIATELY (optimistic UI)
  onChange('')

  // Then submit (non-blocking for UI)
  await onSubmit(submitValue)
  console.log(`[InputDock] Submit complete, input cleared`)
}

// L135-157: Controlled textarea
<textarea
  value={value}  // Changed from defaultValue
  placeholder={placeholder}
  onKeyDown={async (event) => {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault()
      const target = event.target as HTMLTextAreaElement
      const submitValue = target.value.trim()

      if (!submitValue || isBusy) return

      console.log(`[InputDock] Enter pressed at ${new Date().toISOString()}`)

      // Clear input IMMEDIATELY
      onChange('')

      // Then submit
      await onSubmit(submitValue)
      console.log(`[InputDock] Enter submit complete, input cleared`)
    }
  }}
  onChange={(event) => {
    onChange(event.target.value)
  }}
  ...
/>
```

**Expected Behavior**:
- ✅ 按送出按鈕：輸入框立即清空
- ✅ 按 Enter：輸入框立即清空
- ✅ 清空不等待 `onSubmit` 完成（optimistic UI）
- ✅ 焦點不亂跳（textarea 仍然 focused）

---

### Fix #3: MicroMissionCard - Polling + 可觀測

**File**: `apps/web/components/micro/MicroMissionCard.tsx`

**Changes**:
1. ✅ 添加 5 秒 polling（L124-141）：當任務 `in_progress` 時自動刷新
2. ✅ 暴露 `__refetchMissionData` 到 window（L143-149）：供外部觸發刷新
3. ✅ 添加日誌（L113, L130, L134-135, L146-147）
4. ✅ Fire-and-forget analytics（L115-119）

**Key Code**:
```typescript
// L124-141: Polling when mission in progress
useEffect(() => {
  if (!missionData.todayMission || missionData.todayMission.status !== 'in_progress') {
    return;
  }

  console.log('[MicroMissionCard] Mission in progress, setting up polling');

  // Poll every 5 seconds for updates
  const pollInterval = setInterval(() => {
    console.log('[MicroMissionCard] Polling for mission updates');
    fetchMissionData();
  }, 5000);

  return () => {
    clearInterval(pollInterval);
  };
}, [missionData.todayMission?.status]);

// L143-149: Expose refetch for external triggers
useEffect(() => {
  if (typeof window !== 'undefined') {
    (window as any).__refetchMissionData = fetchMissionData;
    console.log('[MicroMissionCard] Exposed __refetchMissionData to window');
  }
}, []);
```

**Expected Behavior**:
- ✅ 任務進行中時，每 5 秒自動刷新數據
- ✅ 完成最後一題後，最多 5 秒內看到：
  - 剩餘題數 → 0
  - Streak +1
  - 進度條 → 100%
  - Confetti 觸發
  - 按鈕變成「明天再來」
- ✅ 外部可手動觸發：`window.__refetchMissionData()`

---

## 📊 Modification Summary

| File | Lines Changed | Type | Blocking Removed |
|------|---------------|------|------------------|
| `apps/web/components/explain/ExplanationCard.tsx` | ~20 | Analytics + Logging | ✅ Yes (track) |
| `components/ask/InputDock.tsx` | ~15 | Controlled Input | N/A |
| `apps/web/components/micro/MicroMissionCard.tsx` | ~30 | Polling + Logging | ✅ Yes (track) |

**Total**: 3 files, ~65 lines modified

---

## ✅ Acceptance Criteria (DoD)

### Issue #1: CTA「再練一題」
- [ ] 點擊後 P95 ≤ 2s 進入下一題
- [ ] Loading 狀態正確（開始/結束）
- [ ] Console 顯示事件流（click → request → response → navigate）
- [ ] Network 請求成功（200 或 409）
- [ ] 失敗時顯示錯誤並自動重試

### Issue #2: 輸入框清空
- [ ] 按送出按鈕：輸入框立即清空
- [ ] 按 Enter：輸入框立即清空
- [ ] 焦點不亂跳
- [ ] Console 顯示送出時間戳

### Issue #3: 完成任務 UI 更新
- [ ] 完成任務後 5 秒內：
  - [ ] 剩餘題數更新
  - [ ] Streak +1
  - [ ] 進度條刷新
  - [ ] Confetti 觸發（如果當日首次完成）
- [ ] 按鈕變成「明天再來」（disabled）
- [ ] Console 顯示 polling 日誌

### General
- [ ] Console 無未捕捉錯誤
- [ ] Network 無 4xx/5xx（除預期的 409 idempotent response）
- [ ] `/api/analytics/batch` 回應 200 (< 150ms)

---

## 🧪 Testing Checklist

### Local Preview Setup
```bash
# 1. 確認 .env.local 旗標已啟用
cat .env.local | grep HOTFIX

# 2. 啟動本機預覽
npm run dev

# 3. 開啟瀏覽器 DevTools (Console + Network)
# 4. 導航到測試路徑
```

### Test Scenarios

#### Scenario A: CTA「再練一題」
```
1. 進入 /play 或 /ask
2. 答題 → 看詳解
3. 點擊「再練一題」
4. ✅ 檢查 Console：
   - "[ExplanationCard] CTA clicked at 2025-10-26..."
   - "[ExplanationCard] Fetching mission with payload: {...}"
   - "[ExplanationCard] API responded in XXms"
   - "[ExplanationCard] Total time: XXms - Navigating to /play"
5. ✅ 檢查 Network：
   - POST /api/missions/start (200 或 409)
   - Response time ≤ 2s
6. ✅ 檢查 UI：
   - Loading 顯示
   - 2 秒內導航到下一題
   - Loading 結束
```

#### Scenario B: 輸入框清空
```
1. 進入 /ask
2. 在對話框輸入「Test message」
3a. 按送出按鈕
3b. 或按 Enter
4. ✅ 檢查 Console：
   - "[InputDock] Submitting at 2025-10-26..."
   - "[InputDock] Submit complete, input cleared"
5. ✅ 檢查 UI：
   - 輸入框立即清空
   - 訊息出現在對話串中
   - 焦點仍在輸入框（可繼續輸入）
```

#### Scenario C: 完成任務 UI 更新
```
1. 進入 /home（有 MicroMissionCard）
2. 開始任務 → /play
3. 答完所有題目（例如 5 題）
4. ✅ 檢查 Console（在 Home 頁面）：
   - "[MicroMissionCard] Mission in progress, setting up polling"
   - "[MicroMissionCard] Polling for mission updates" (每 5 秒)
5. 完成最後一題後，返回 /home
6. ✅ 檢查 UI（5 秒內）：
   - 剩餘題數 → 0
   - Streak +1（如果今日首次完成）
   - 進度條 → 100%
   - Confetti 動畫（2 秒）
   - 按鈕變成「明天再來」（disabled）
```

---

## 🎥 Evidence Required

### 1. Screen Recording (30-60 seconds)
**必須包含**:
- [ ] Console 面板顯示（右側或下方）
- [ ] Scenario A: 點擊「再練一題」→ 下一題呈現（顯示時間戳）
- [ ] Scenario B: 送出訊息 → 輸入框清空
- [ ] Scenario C: 完成任務 → UI 變化（剩餘/Streak/進度）

**工具**:
- macOS: QuickTime (Cmd+Shift+5) 或 Loom
- 格式: MP4 或 GIF
- 長度: 30-60 秒

---

### 2. Console Screenshots
**必須包含**:
- [ ] Scenario A 的完整事件流（時間戳清晰）
- [ ] Scenario B 的送出/清空日誌
- [ ] Scenario C 的 polling 日誌

**Example Format**:
```
[10:23:45.123] [ExplanationCard] CTA clicked at 2025-10-26T10:23:45.123Z
[10:23:45.124] [ExplanationCard] Fetching mission with payload: {targetSkill: "xxx", difficultyBand: {min: 1, max: 3}}
[10:23:45.856] [ExplanationCard] API responded in 732ms
[10:23:45.856] [ExplanationCard] Total time: 733ms - Navigating to /play
```

---

### 3. Network Screenshots
**必須包含**:
- [ ] `/api/missions/start` - Timing < 2s, Status 200/409
- [ ] `/api/analytics/batch` - Timing < 150ms, Status 200
- [ ] 無 4xx/5xx 錯誤（除預期的 409）

**Timing Breakdown**:
```
POST /api/missions/start
├─ Queueing: 2ms
├─ DNS Lookup: 0ms
├─ Connecting: 0ms
├─ TLS: 0ms
├─ Sending: 1ms
├─ Waiting (TTFB): 720ms
└─ Downloading: 10ms
Total: 733ms ✅ < 2s
```

---

## 📈 Performance Targets

| Metric | Target | Measurement |
|--------|--------|-------------|
| CTA → 下一題 (P95) | ≤ 2s | Console log (Total time) |
| Sampler (P95) | ≤ 80ms | DB function execution time |
| Analytics Batch API | ≤ 150ms | Network timing |
| Analytics Flush Rate | ≥ 99.5% | sendBeacon + keepalive fallback |
| Input Clear Delay | 0ms | Immediate (onChange before submit) |
| Mission Update Latency | ≤ 5s | Polling interval |

---

## 🚨 Known Issues / Limitations

### 1. Polling Overhead
**Issue**: 5 秒 polling 可能增加 server load
**Mitigation**:
- 只在 `in_progress` 狀態時 polling
- 可改用 WebSocket 或 Server-Sent Events（未來優化）

### 2. Analytics Batch API 未部署
**Issue**: `/api/analytics/batch` 端點可能未部署到 staging/production
**Mitigation**:
- 本機測試需先啟動 API
- 若 API 失敗，analytics 會自動 fallback（不阻斷主流程）

### 3. Feature Flags 未同步
**Issue**: `.env.local` 旗標可能被 LocalStorage/Panel 覆蓋
**Mitigation**:
- 在 Console 執行 `console.log(FLAGS)` 檢查生效值
- 清除 LocalStorage 並重新整理

---

## 🔄 Rollback Plan

若發現重大問題，可即時關閉旗標：

```bash
# .env.local
NEXT_PUBLIC_HOTFIX_BATCH1_5=false

# 或選擇性關閉
NEXT_PUBLIC_HOTFIX_BATCH1_5_SINGLE_CTA=false
NEXT_PUBLIC_HOTFIX_BATCH1_5_SAMPLER_PERF=false
```

重新啟動 dev server：
```bash
npm run dev
```

---

## ✅ Final Checklist

- [ ] 所有修改已完成（3 個檔案）
- [ ] `.env.local` 旗標已設定
- [ ] 本機預覽已啟動
- [ ] 3 個 scenarios 已測試
- [ ] Console logs 清晰可讀（包含時間戳）
- [ ] Network 請求正常（200/409）
- [ ] 已錄製 30-60 秒影片
- [ ] 已截圖 Console + Network
- [ ] Performance 達標（2s / 80ms / 150ms）
- [ ] 無未捕捉錯誤

---

## 📞 Next Steps

1. **本機測試** - 按照 Testing Checklist 逐項驗證
2. **生成證據** - 錄製影片 + 截圖
3. **提交報告** - 包含：
   - 根因分析（3 個問題）
   - 修補點清單（3 個檔案）
   - 指標達標證明
   - 錄屏與截圖

**Expected Delivery**: 完成測試後 1 小時內提交完整報告

---

**Status**: ✅ **Ready for Local Testing**
**Last Updated**: 2025-10-26
**Engineer**: Claude (值班工程師)
