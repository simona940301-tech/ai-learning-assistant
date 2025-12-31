# Gemini API Key Configuration

## 兩個不同的 API Keys

本專案使用兩個不同的 Gemini API Keys：

### 1. 文本分析 Key (Text Analysis)
- **用途**: RAG 文件分析、OCR、問答系統
- **Key**: `AIzaSyDOi9X9YdbCTzJdczei5fceDwMSt_fHVvo`
- **環境變數**: `GEMINI_API_KEY`
- **使用位置**:
  - `lib/services/elite-rag-analyzer.ts` - Elite RAG 分析
  - `lib/services/rag-summary.ts` - 文件摘要
  - `app/api/ai/route.ts` - AI 問答
  - `app/api/internal/ocr/route.ts` - OCR 服務
  - `app/api/admin/universities/ocr/route.ts` - 大學資料 OCR

### 2. Avatar 生成 Key (Profile Avatar Generation)
- **用途**: 個人頭像生成、圖片分析
- **Key**: `AIzaSyBzt7TlkWj3OAlTPxmGxOebNjZjb6atdck`
- **環境變數**: `GEMINI_AVATAR_API_KEY`
- **使用位置**:
  - `app/api/avatar/analyze/route.ts` - 頭像分析
  - `app/api/profile/generate-avatar/route.ts` - 頭像生成

## 環境變數設定

在 `.env.local` 中設定：

```bash
# 文本分析 (主要用途)
GEMINI_API_KEY=AIzaSyDOi9X9YdbCTzJdczei5fceDwMSt_fHVvo

# Avatar 生成 (次要用途)
GEMINI_AVATAR_API_KEY=AIzaSyBzt7TlkWj3OAlTPxmGxOebNjZjb6atdck
```

## Fallback 機制

Avatar 相關的 API 會優先使用 `GEMINI_AVATAR_API_KEY`，如果沒有設定則使用 `GEMINI_API_KEY`：

```typescript
const GEMINI_API_KEY = process.env.GEMINI_AVATAR_API_KEY || process.env.GEMINI_API_KEY || ''
```

## 重啟伺服器

修改環境變數後，必須重啟開發伺服器：

```bash
# 停止當前伺服器 (Ctrl+C)
# 然後重新啟動
npm run dev
```
