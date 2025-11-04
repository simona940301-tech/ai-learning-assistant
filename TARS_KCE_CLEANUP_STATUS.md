# TARS+KCE Cleanup Status

## ✅ Completed Enhancements

### 1. **ExplainCardV2 4-Phase Loading** ✅
- Replaced 2-phase loading with 4-phase rotating sequence
- Steps: "正在分析題型…" → "正在檢測語意結構…" → "正在抽取關鍵訊息…" → "正在生成詳解…"
- Each phase displays for 1.2s with smooth opacity transitions
- Guaranteed to cycle through all phases even with fast API responses
- Typewriter animation begins after all phases complete

### 2. **Debug Logging** ✅
- Added `[TARS] kind: {kind} (confidence)` logs
- Added `[KCE] mode: {mode}, kind: {kind}` logs
- Added `[ExplainCardV2]` request/receive/render logs

### 3. **Telemetry Events** ✅
- `explain.request`: `{ mode, input_len }`
- `explain.render`: `{ mode, kind, latency_ms }`
- `explain.mode_change`: `{ from, to, kind }`

## 🔄 Legacy System Status

### Still in Use (Gradual Migration)
- `apps/web/lib/english/router.ts` - Marked as deprecated but still used by `orchestrateEnglishExplanation`
- `apps/web/lib/mapper/explain-presenter.ts` - Still used by old `ExplainCard.tsx`
- `apps/web/lib/english/reading-parser.ts` - Still used by templates

### Migration Path
1. **Current**: `AnySubjectSolver` → `/api/ai/route-solver` → `orchestrateEnglishExplanation` → `classifyEnglishType` (legacy)
2. **Target**: `AnySubjectSolver` → `/api/explain` → `runExplain` → `runTARS` + `runKCE` (new)

## 📝 Next Steps

### Immediate (Optional)
1. Update `AnySubjectSolver` to use `/api/explain` for English questions
2. Create wrapper to convert old `ExplainCard` format to `ExplainViewModel`
3. Remove legacy router/presenter once migration complete

### File Cleanup (Deferred)
Files to remove after migration:
- `apps/web/components/solve/ExplainCard.tsx` (replace with ExplainCardV2)
- Old explain components using `explain-presenter` types
- Legacy test files referencing old system

## ✨ Current State

- ✅ **TARS+KCE engine**: Fully functional
- ✅ **ExplainCardV2**: Enhanced with 4-phase loading
- ✅ **API endpoint**: `/api/explain` working
- ✅ **Debug logs**: TARS, KCE, ExplainCardV2
- ✅ **Telemetry**: All events tracked
- ⚠️ **Legacy system**: Still active, marked deprecated
- ⚠️ **Migration**: Gradual, in progress

## 🎯 Result

The new TARS+KCE engine is fully operational with enhanced UX. Legacy system remains for backward compatibility during migration period.

