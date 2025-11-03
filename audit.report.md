# API & Concept Cleanup Audit

## 必留
- `/api/tutor/answer` — 已加上 `concept_id` 可選欄位與 fallback 映射；回傳統一帶出 `concept_id` 與 rationale，供新流程記錄考點。
- `solve_sessions` / `solve_responses` 表 — 新的 detect → warmup → solve 仍會寫入這兩張表，屬於核心互動紀錄。

## 可下線候選
- `/api/tutor/explain` (`app/api/tutor/explain/route.ts`) — 已改為 410 Gone（含 `X-Deprecated` header），待 14 天後刪除。
- `/api/tutor/options` (`app/api/tutor/options/route.ts`) — 410 Gone，僅文檔描述；鏡射的 `concepts` 資料已歸入 legacy schema。
- `/api/tutor/save-to-backpack` (`app/api/tutor/save-to-backpack/route.ts`) — 410 Gone；相關型別移至 `legacy/types-deprecated.ts`。
- `/api/tutor/markdown` (`app/api/tutor/markdown/route.ts`) — 410 Gone；原 Gemini formatter 可刪。
- `/api/tutor/simplify` (`app/api/tutor/simplify/route.ts`) — 410 Gone；無引用。
- `TutorExplainResult` / `TutorBackpackItem` (`legacy/types-deprecated.ts`) — 僅供舊程式 re-export，觀察期後刪除。
- `generateTutorPrompt` & `detectSubjectAndType` (`legacy/types-deprecated.ts`) — 舊版 prompt/偵測函式，已在對應模組 re-export 為 deprecated。
- `findSimilarConcepts` / `getConfusableConcepts` (`lib/tutor-utils.ts:42-95`) — 只被 `/api/tutor/options` 使用，可與該端點一併下線。
- DB: `concepts`, `concept_edges`, `match_concepts`, `solve_explanations`（已透過 `supabase/migrations/20251018_archive_legacy_tutor.sql` 搬至 `legacy` schema）— 觀察 14 天後執行 `proposals/2025xx_drop_legacy_tutor.sql` 刪除。
- Seed 腳本 `scripts/seed_concepts*.ts` — 目的為匯入 concepts/edges，已有全套 keypoint 流程即可移除。
- Docs: `docs/TUTOR_EXPLAIN_API.md`, `docs/ASK_PAGE_REDESIGN.md` 中的舊 payload / API 說明，與現有流程不符。

## 模糊地帶（建議進一步驗證）
- `/api/tutor/detect` (`app/api/tutor/detect/route.ts:1-71`) — 新建但尚未接到前端；命名仍在 tutor 命名空間，建議移到 `/api/detect` 或確認 UI 接線。
- `/api/warmup/keypoint-mcq` 與 `/api/solve` — 目前無前端呼叫，僅文檔 `docs/MATH_SYSTEM_SETUP.md` 提及；需在 UI 接上後再審視是否有殘留欄位。
- `lib/tutor-utils.ts` 中的 `supabase` / `openai` clients — 新流程仍使用，但內含概念專用函式，拆分乾淨可避免混淆。
- `app/(app)/ask/page.tsx` 與 `components/ask/*` — 仍引用 `lib/tutor-types.ts` 的 Ask 狀態型別，需確認是否要改走 detect → warmup → solve 新 JSON。
- `solve_options.concept_id` 欄位 — 新 warmup 目前寫入 `null`，若未來改由 keypoint 取代，需要 schema 調整或新增 keypoint 專用欄位。

## 額外觀察
- `npx ts-prune` / `npx depcheck` 因 sandbox 無法連線至 npm registry 而未能執行；僅能依賴 ripgrep + 原始碼檢查。
- 搜尋 `fetch('/api/...')`、`axios`、`ky`、`react-query` 等關鍵字僅在文件中找到對 tutor 端點的示例，沒有實際呼叫。
- 偵測到的舊 payload（`strategy_name`, `options` 的 concept labels 等）僅出現在 `docs/*`，程式內部已改為 `{summary, steps, checks, error_hints, extensions}` 但 UI 尚未接入。
- `tools/scripts/curl-verify.sh` 可快速驗證 detect → warmup → solve → answer；最新回應樣本保存在 `tools/fixtures/*.json`。
- Legacy 路由 410 記錄於 `DEPRECATED.md`，需持續觀察 410 命中率與 error log。

| Caller (file:line) | API | 欄位期望 | 備註 |
| --- | --- | --- | --- |
| docs/TUTOR_EXPLAIN_API.md:290 | POST `/api/tutor/explain` | `question`, `autoSegment` (legacy) | 文件示例，實作已不存在 |
| docs/TUTOR_EXPLAIN_API.md:304 | POST `/api/tutor/save-to-backpack` | `result: TutorExplainResult` | 文件示例，需舊 payload |
| docs/MATH_SYSTEM_SETUP.md:247 | POST `/api/warmup/keypoint-mcq` | `subject`, `prompt` | 文檔示例；尚無實際呼叫 |
| docs/MATH_SYSTEM_SETUP.md:89 | POST `/api/solve` | `subject`, `question_id` | 文檔示例；前端未實作 |
| （無） | POST `/api/tutor/options` | — | 未找到任何呼叫 |
| （無） | POST `/api/tutor/markdown` | — | 未找到任何呼叫 |
| （無） | POST `/api/tutor/simplify` | — | 未找到任何呼叫 |
| tools/scripts/curl-verify.sh | POST `/api/tutor/answer` | `{questionId,userAnswer,concept_id?}` | 新 fixtures (`tools/fixtures/answer.json`) 驗證 concept_id 回傳 |
