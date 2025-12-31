# 🚀 App Launch Readiness Checklist (current repo state)
針對現有程式碼盤點的完整上架檢查單，涵蓋功能、串接回路、核心體驗、資料蒐集與安全。依優先級標示 **P0 必過** / **P1 建議** / **P2 可延後**，並標出缺失或可下線項目。

## 1) 環境與依賴 (P0)
- Supabase：`NEXT_PUBLIC_SUPABASE_URL`、`NEXT_PUBLIC_SUPABASE_ANON_KEY`、`SUPABASE_SERVICE_ROLE_KEY` 必填，否則 `apps/web/lib/supabase.ts` 會丟錯且 Play 頁 `skipAuthCheck` 會放行未登入。
- Battle WebSocket：`NEXT_PUBLIC_BATTLE_WS_URL`、`BATTLE_EVENTS_API_KEY`、`INTERNAL_API_KEY` 必填，對應 `services/battle-ws` 及 `apps/web/app/api/play/battle/*`、`/api/internal/*`，中介層在 `apps/web/middleware.ts`。
- AI 金鑰：`OPENAI_API_KEY` (`apps/web/app/api/explain/route.ts`)、`GEMINI_API_KEY` (`apps/web/lib/gemini.ts`) 必填，缺失會使 Ask/Explain 全線降級。
- Redis：`REDIS_URL` 供解題快取 `apps/web/lib/cache/explain-cache.ts`；未設置則無快取（允許降級）。
- Storage：Supabase Storage bucket (avatars/backpack/notes/pdf) 需套用 RLS 修補 `apps/web/supabase/migrations/027_fix_avatar_storage_rls.sql` 等。
- 其他：`NEXT_PUBLIC_ENABLE_PASSAGE_DOCK` / `NEXT_PUBLIC_ENABLE_TELEMETRY` 依需求開關。

## 2) 資料層與遷移 (P0)
- 核心遷移：根目錄 `supabase/migrations/` 近期新增
  - 20250120/26/27 Posts + Anonymous + Battle/Energy/Coins
  - 20250130 Chick learning actions + message types + energy fix
  - 20250210 progression system
  - 20251026 \* analytics_events / missions / packs (重複檔與 COMBINED 需確認只執行一次)
  - 20251123 notebook & RAG schema / 20251125 concept tags & seed / 20251126 RAG telemetry & upload indexes
  - 20251018_* legacy tutor schema archive & solve_options.concept_id
- Web 專案遷移：`apps/web/supabase/migrations/017+`（avatar system、onboarding difficulty、hint logs、questions_raw 等）；確認與 root DB 一致且已上線。
- 种子：`apps/web/db/sql/026_daily_missions*.sql`、`021_onboarding_seed_questions.sql`、`SEED_QUESTION_BANK.sql`、`insert_onboarding_questions*.sql`、`run-chick-migration.sql` 等未執行會導致 Play/Onboarding/Chick 空資料。
- RLS/索引：`supabase/migrations/20250126_performance_indexes.sql`、`fix_rag_rls_only.sql` 需確認已套用。

## 3) 核心旅程與串接回路
- **Auth / Middleware (P0)**：`apps/web/middleware.ts` 強制驗證 PROTECTED_API_ROUTES，預設 dev/mock 會跳過；上線需關閉 `PREVIEW_FORCE_MOCK` / `APP_USE_MOCK_USER`。確認 `/api/profile`, `/api/backpack`, `/api/missions`, `/api/play/*` 皆需登入且 RLS 配合。
- **Onboarding + Guidance (P0)**：頁面在 `apps/web/app/(app)/onboarding/*`、引導引擎 `apps/web/lib/guidance/guidance-engine.ts` + `useGuidance.tsx`。需檢查：新手戰自動導流 `/play?mode=onboarding`、任務/能量種子、localStorage 冷卻、未登入導轉是否正確。
- **Ask/Explain (P0)**：入口 `apps/web/app/(app)/ask/page.tsx` + `components/ask/AnySubjectSolver.tsx`。流水：
  - `/api/explain` 多層降級 (universal → basic → minimal) + Redis cache；需 OpenAI/Gemini & Supabase notebook 寫入 `/api/notebook/save`.
  - `/api/ai/followup` 追問、RAG 摘要來源 `SummaryWorkbench` (/api/summary, /api/rag/*) 依賴 `supabase/migrations/20251123_*`.
  - Notebook 匯入/回寫：`/api/backpack`、`/api/backpack/explain`、`/api/backpack/ocr`。
  - 需檢查：多題拆解 `apps/web/lib/explain/question-set-detector.ts`、`ExplainCardV2` 儲存流程、文件分析狀態顯示 (currentAnalysis)。
- **Play / Battle / Energy (P0)**：頁面 `apps/web/app/(app)/play/page.tsx` + context `apps/web/lib/play-context.tsx`，依賴：
  - WebSocket `NEXT_PUBLIC_BATTLE_WS_URL` (Rust `services/battle-ws`)：事件 SUBMIT_ANSWER/ROUND_STARTED/ROUND_RESOLVED。
  - REST 端點：`/api/play/user/status`、`/api/play/battle/events` (service key)、`/api/play/matchmaking/*`、`/api/play/user/consume-energy`、`/api/play/battle/update-elo`。
  - 數據：progression/daily_energy/daily_missions/elo，來源於 20250210/20251026 遷移；PVE 轉場、倒數、retest overlay 需題目 seed `/api/play/questions/seed`。
  - 需檢查：未登入提示、skipAuthCheck 關閉、chest 開啟、焦點模式 `FocusModeModal`、TamagotchiWidget 依賴 Chick 資料。
- **Backpack / Error Book / Notebook (P0)**：`apps/web/app/(app)/backpack/BackpackContentV3.tsx` 讀 `/api/backpack`、`/api/error-book`、`/api/question-sets/user`；刪除 `/api/backpack` DELETE；上傳 `/api/backpack/upload`/`/api/backpack/ocr`；筆記檢視 `NoteViewerModal`。需確認表 `backpack_items`、`notebook_entries`、`error_book_*`、Storage RLS、版本歷史欄位。
- **Store & Question Sets (P0)**：`apps/web/app/(app)/store-shop/page.tsx` → `/api/store/question-sets` & `/api/store/question-sets/download` (寫入背包/下載計數)。表：`question_sets`、`question_set_downloads`、`packs*`（20251026）。若題本未上架建議暫時隱藏 CTA。
- **Community (P1)**：`apps/web/app/(app)/community/page.tsx` → `/api/community/posts` (表 `posts` + `profiles`)，匿名欄位來自 20250127_add_anonymous_to_posts.sql。檢查發文/圖片上傳未實作，必要時隱藏 Composer。
- **Profile & Dashboard (P1)**：`apps/web/app/(app)/store/page.tsx` 其實是 Profile/Dashboard，呼叫 `/api/profile`、`/api/proficiency/calculate`、`/api/proficiency/concepts`、`/api/dashboard/prediction`。確保這些 API 有資料或 UI 顯示空狀態。
- **Onboarding Scripts & Missions (P1)**：`apps/web/app/api/missions/*`、`/api/onboarding/*` 依賴 daily_missions / onboarding_questions seeds；未播種會空白。
- **Chick / Companion (P2)**：`apps/web/components/companion/*` + `supabase/migrations/20250130_chick_*`、`202503XX_chick_system.sql`。若未啟用可暫時關閉 TamagotchiWidget / Chick API。
- **UGC / Packs (P2)**：`/api/packs/*`、`/api/play/ugc-questions/*` 依賴 20251026 packs schema，若無營運計畫可下線相關入口（UGC modal、題本管理）。

## 4) 資料/事件蒐集與監控
- Analytics 事件：`@plms/shared/analytics` + `setupBeforeUnloadFlush` (`apps/web/app/(app)/home/page.tsx`)，後端 `/api/analytics/batch` 寫表 `analytics_events` (遷移 20251026_00...)，目前用記憶體 rate limit，建議上 Redis。
- Telemetry：`apps/web/lib/telemetry.ts` 只在 DEV 打 log，生產需接 GA/PostHog/Mixpanel 或關閉。
- RAG/Notebook 監控：`supabase/migrations/20251126_add_rag_caching_telemetry.sql` + `docs/RAG_*`；確認表存在並有指標。
- Guidance：localStorage 狀態 `apps/web/lib/guidance/guidance-engine.ts`，無伺服器持久化；可接受。

## 5) 安全與合規
- 中介層：`apps/web/middleware.ts` 為 API 入口；確保環境關閉 mock，service 路由需 API Key；未分類路由會放行並印警告，需補充清單。
- Auth：多數 API 再次呼叫 `getCurrentUser()`；確認 Supabase RLS 啟用，`SUPABASE_SERVICE_ROLE_KEY` 只在伺服器使用。
- 檔案上傳：OCR/Backpack/PDF (`apps/web/app/api/backpack/ocr` 等) 需限制檔案大小、MIME，並檢查 Storage RLS 修補。
- 資料隱私：Analytics/event payload 應避免寫入敏感資訊；`apps/web/lib/cache/explain-cache.ts` 將題目寫入 Redis（若有隱私需求需加匿名化/TTL）。
- 外部服務：OpenAI/Gemini 錯誤需降級；battle-ws 需 TLS/Origin 驗證。

## 6) 缺失與風險清單
- 未播種 / 未跑遷移 → Ask/Play/Missions/Community/Store 會空白或報錯（見 §2）。
- Battle WebSocket 未部署或 API key 未設 → Play 卡在匹配/無題目。
- RAG/Notebook schema 未建 → Summary tab / Notebook 儲存會 500。
- Store/Question-set 若無上架資料 → /store-shop 空白；考慮暫時關閉入口或放空狀態。
- Community 發文/圖片上傳尚未實作 → 建議鎖定為唯讀或隱藏 Composer。
- Profile Dashboard 資料多為假值 fallback → 若 API 無資料需顯示空狀態或暫時只露基本 Profile。
- SkipAuthCheck：Play 在缺 env 時允許未登入；上線必須提供 Supabase env 以避免未授權訪問。
- Redis 缺失 → explain 無快取（可接受）但需監看延遲。

## 7) 可下線/延後項目 (若時間緊)
- UGC/Packs/題本商店整合（/store-shop、UGC modal、/api/packs/*）可暫時隱藏，避免空資料。
- Chick/TamagotchiWidget 與相關 API（202503XX_chick_system.sql）若尚未營運可關閉 UI。
- Community 發文/上傳按鈕可暫時關閉，只保留貼文瀏覽。
- Profile Dashboard 的預測/概念雷達（/api/dashboard/prediction, /api/proficiency/*）若無真實數據可改為空狀態或下線。
- Guidance 高階觸發（T02/T03）可關閉，只保留 T04 基礎引導。

## 8) 建議驗證順序 (P0 先)
1) Auth/中介層：實際登入、確認受保護路由 401、service key 路由 401、mock 關閉。  
2) Ask/Explain：單題、多題、追問、儲存到筆記本、從筆記本匯入再解題。  
3) Play：PVE/PVP 啟動、能量扣除、倒數/轉場、答題同步、結算/elo 更新、寶箱開啟。  
4) Backpack/Error Book：讀取、上傳、刪除、Error Book 練習 API。  
5) Store/Question-set：列表、下載到背包、重複下載去重。  
6) Missions/Onboarding：每日任務列表/完成、onboarding 啟動與資料寫入。  
7) Analytics：beforeunload 事件送到 `/api/analytics/batch` 且寫入 `analytics_events`。  
8) Community：列表顯示、匿名/非匿名資料正確，發文行為如未實作則隱藏。

## 9) 相關檔案索引
- 路由與頁面：`apps/web/app/(app)/ask/page.tsx`、`.../play/page.tsx`、`.../backpack/page.tsx`、`.../store-shop/page.tsx`、`.../community/page.tsx`、`apps/web/app/(app)/onboarding/*`
- API：`apps/web/app/api/explain/route.ts`、`.../ai/followup/route.ts`、`.../play/*`、`.../backpack/*`、`.../missions/*`、`.../community/posts/route.ts`、`.../store/question-sets*`、`.../analytics/batch/route.ts`
- 安全：`apps/web/middleware.ts`、`apps/web/.env.example`
- 資料層：`supabase/migrations/*`、`apps/web/supabase/migrations/*`、`apps/web/db/sql/*`
- WebSocket 服務：`services/battle-ws/*`

> 依本檢查單逐條驗證後，可針對缺失採「修復 / 降級關閉 / 隱藏入口」策略，確保上架窗口不被阻塞。***
