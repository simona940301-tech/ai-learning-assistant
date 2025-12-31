# 電子雞系統完整檢查報告

## 📋 檢查範圍
- 電子雞在 app 中的定位與使用場景
- 所有互動邏輯與事件處理
- 狀態管理與資料同步
- API 端點完整性
- 技術債與邏輯缺失

---

## 🎯 電子雞系統定位

### 當前實現
1. **顯示位置**：
   - ✅ `apps/web/app/(app)/play/page.tsx` - Play 頁面固定顯示
   - ❌ `apps/web/app/(app)/layout.tsx` - 已從全域 layout 移除（註解顯示 "REMOVED from global layout"）
   - ⚠️ 其他頁面（Ask, Backpack, Profile）無法看到電子雞

2. **組件版本**：
   - `TamagotchiWidget` - 簡化版（無 bottom sheet）
   - `TamagotchiWidgetPremium` - 完整版（有 bottom sheet，但未使用）
   - `ChickAvatar` - 小頭像版本（用於其他場景）

---

## 🔄 互動邏輯檢查

### ✅ 已實現的互動

#### 1. **基礎互動**
- ✅ `poke` - 點擊電子雞觸發
- ✅ `soothe` - 治療/召回按鈕（sick/runaway 狀態）
- ✅ `check_streak` - 每日登入檢查連續天數

#### 2. **自動觸發**
- ✅ `idle_battle` - 30 秒無操作後鼓勵對戰
- ✅ `idle_review` - 30 秒無操作後提醒複習
- ✅ `battle_result` - 對戰結束後觸發（在 `BattleResultModal.tsx`）

#### 3. **事件追蹤**
- ✅ `EXPLANATION_VIEWED` - 查看詳解時觸發（`ExplainCardV2.tsx`）
- ✅ `BATTLE_END` - 對戰結束時觸發（`BattleResultModal.tsx`）

### ❌ 未實現的互動

#### 1. **定義但未使用的事件**
```typescript
// 在 lib/chick/events.ts 中定義，但沒有實際觸發點：
- WRONGBOOK_REVIEWED ❌
- NOTE_SAVED ❌  
- STREAK_CONTINUE ❌
- STREAK_BREAK ❌
- LOGIN ❌
```

#### 2. **API 路由不一致**
- `/api/chick/event` - 定義了完整事件處理邏輯，但**從未被調用**
- `/api/chick/interact` - 實際使用的互動 API（但功能較簡化）
- `/api/chick/soothe` - 治療 API ✅
- `/api/chick/status` - 狀態查詢 ✅
- `/api/chick/messages` - 訊息查詢 ✅

**問題**：兩套 API 系統並存，造成混淆：
- `lib/chick/events.ts` 使用 `/api/chick/event`
- `chickStore.ts` 使用 `/api/chick/interact`

---

## 🗄️ 資料庫狀態管理

### ✅ 已實現的狀態欄位
```sql
- chick_iq (0-10)
- chick_fatigue (0-3)
- chick_emotion_state (normal/cold/distant/hibernate/sick/runaway)
- chick_iq_last_decay_at
- chick_fatigue_battle_counter
- chick_explanations_used
- chick_soothe_used
- chick_soothe_reset_at
- chick_explanations_reset_at
```

### ⚠️ 狀態更新邏輯問題

#### 1. **IQ Decay（衰減）**
- ✅ `supabase/functions/chick_decay/index.ts` - 每 12 小時衰減 1 IQ
- ⚠️ **問題**：需要確認是否有 cron job 定期執行此 function
- ⚠️ **問題**：decay 邏輯在 status API 中沒有檢查，可能導致狀態不一致

#### 2. **Fatigue Battle Counter**
- ✅ 每 5 場對戰增加 1 fatigue（在 `battle/events/route.ts`）
- ✅ 每日重置（在 `chick_daily_reset` function）
- ⚠️ **問題**：需要確認 daily reset function 是否有 cron trigger

#### 3. **Emotion State 更新**
- ✅ 在 `status` API 中檢查不活躍天數（>3 天 → sick, >7 天 → runaway）
- ⚠️ **問題**：狀態恢復邏輯不完整（只有 soothe 可以恢復，但沒有明確的恢復路徑）

---

## 🔍 邏輯缺失與技術債

### 🔴 嚴重問題

#### 1. **事件系統不一致**
**問題**：存在兩套事件系統，但只有一套在使用
- `lib/chick/events.ts` → `/api/chick/event` （未使用）
- `chickStore.ts` → `/api/chick/interact` （實際使用）

**影響**：
- `WRONGBOOK_REVIEWED`, `NOTE_SAVED`, `STREAK_CONTINUE/BREAK` 等事件永遠不會觸發
- 電子雞無法追蹤錯題本複習、筆記保存、連續天數等行為

**建議**：
- 統一使用一套 API 系統
- 或在所有相關位置添加事件觸發點

#### 2. **電子雞顯示範圍受限**
**問題**：電子雞只在 Play 頁面顯示，其他頁面看不到

**影響**：
- 用戶在 Ask、Backpack、Profile 頁面無法與電子雞互動
- 降低電子雞的存在感和陪伴感

**建議**：
- 恢復全域顯示（在 layout 中）
- 或確認這是設計決策（僅在 Play 頁面顯示）

#### 3. **IQ Decay 執行確認**
**問題**：無法確認 `chick_decay` function 是否有定期執行

**影響**：
- IQ 可能不會正常衰減
- 用戶長期不登入，IQ 仍維持高值

**建議**：
- 檢查 Supabase cron jobs 配置
- 或在 status API 中加入 decay 檢查邏輯

### 🟡 中等問題

#### 4. **Emotion State 恢復邏輯不完整**
**問題**：sick/runaway 狀態只有 soothe 可以恢復，但沒有明確的恢復條件

**當前邏輯**：
- >3 天不活躍 → sick
- >7 天不活躍 → runaway
- soothe → 恢復（但 soothe 有限制：每天最多 5 次）

**缺失**：
- 沒有明確說明如何從 sick/runaway 恢復到 normal
- 沒有檢查用戶重新活躍後自動恢復的邏輯

#### 5. **Streak 檢查邏輯**
**問題**：streak 檢查依賴 `progression` 表，但可能查詢失敗

**當前實現**（`interact/route.ts`）：
```typescript
const { data: progressionData, error: progressionError } = await supabase
  .from('progression')
  .select('streak_current')
  .eq('user_id', user.id)
  .single()
```

**問題**：
- 如果 `progression` 表不存在或查詢失敗，會靜默失敗
- 沒有 fallback 到 `profiles.streak` 欄位

#### 6. **訊息類型不一致**
**問題**：資料庫定義的訊息類型與實際使用不一致

**資料庫定義**（`chick_messages.type`）：
```sql
CHECK (type IN ('S1','S2','S3','POSITIVE'))
```

**實際使用的類型**（`packages/server/chick/messages.ts`）：
- S1, S2, S3, POSITIVE ✅
- POKE_BUSY, POKE_IDLE, IDLE_ENCOURAGE_BATTLE, IDLE_REVIEW_MISTAKES, STREAK, BATTLE_VICTORY, BATTLE_LEARNING ❌

**影響**：某些訊息類型可能無法正確儲存到資料庫

### 🟢 輕微問題

#### 7. **重複的狀態查詢**
**問題**：多個地方都在查詢 profile 狀態，可能造成不必要的資料庫查詢

**查詢位置**：
- `chickStore.fetchStatus()` - 查詢 chick 狀態
- `chickStore.fetchStatus()` - 同時查詢 progression 狀態
- `status/route.ts` - 查詢並更新 emotion state
- `interact/route.ts` - 查詢 profile snapshot

**建議**：考慮快取或合併查詢

#### 8. **Premium Widget 未使用**
**問題**：`TamagotchiWidgetPremium` 組件存在但未被使用

**影響**：代碼冗餘，維護成本增加

#### 9. **錯誤處理不完整**
**問題**：部分 API 錯誤處理較簡單，可能導致前端狀態不一致

**範例**：
- `interact/route.ts` 中 progression 查詢失敗時靜默返回 `{ ok: true, message: null }`
- 沒有明確的錯誤訊息傳遞給前端

---

## 📊 狀態流程圖

### 當前實現的流程

```
用戶登入
  ↓
status API 檢查不活躍天數
  ↓
更新 emotion state (sick/runaway)
  ↓
用戶互動 (poke/soothe/battle/explanation)
  ↓
更新 IQ/Fatigue
  ↓
生成訊息
```

### 缺失的流程

```
錯題本複習 → WRONGBOOK_REVIEWED ❌
筆記保存 → NOTE_SAVED ❌
連續天數更新 → STREAK_CONTINUE/BREAK ❌
每日重置 → 確認 cron job 執行 ❓
IQ 衰減 → 確認 cron job 執行 ❓
```

---

## 🎯 建議修復優先級

### P0（必須修復）
1. ✅ **統一事件系統** - 選擇一套 API 並統一使用
2. ✅ **確認 cron jobs** - 確認 IQ decay 和 daily reset 有定期執行
3. ✅ **修復訊息類型** - 確保所有訊息類型符合資料庫約束

### P1（重要修復）
4. ✅ **添加缺失的事件觸發點** - WRONGBOOK_REVIEWED, NOTE_SAVED, STREAK events
5. ✅ **完善 emotion state 恢復邏輯** - 明確恢復條件和流程
6. ✅ **修復 streak 檢查** - 添加 fallback 邏輯

### P2（優化）
7. ✅ **優化狀態查詢** - 減少重複查詢，添加快取
8. ✅ **清理未使用代碼** - 移除 Premium Widget 或整合使用
9. ✅ **改進錯誤處理** - 提供更明確的錯誤訊息

---

## 📝 總結

### 已完成的內容 ✅
- 基礎互動邏輯（poke, soothe, check_streak）
- 對戰和詳解事件追蹤
- 狀態管理（IQ, Fatigue, Emotion）
- 訊息系統基礎架構

### 需要修復的內容 ❌
- 事件系統不一致（兩套 API）
- 缺失的事件觸發點（錯題本、筆記、連續天數）
- IQ decay 和 daily reset 執行確認
- Emotion state 恢復邏輯不完整
- 訊息類型與資料庫約束不一致

### 技術債 📦
- Premium Widget 未使用
- 重複的狀態查詢
- 錯誤處理不完整
- Streak 檢查缺少 fallback

---

## 🔧 下一步行動建議

1. **立即修復**：
   - 確認並修復 cron jobs 配置
   - 統一事件系統 API
   - 修復訊息類型約束問題

2. **短期優化**：
   - 添加所有缺失的事件觸發點
   - 完善 emotion state 恢復邏輯
   - 優化狀態查詢邏輯

3. **長期重構**：
   - 考慮將電子雞系統抽象為獨立模組
   - 統一狀態管理策略
   - 添加完整的測試覆蓋

