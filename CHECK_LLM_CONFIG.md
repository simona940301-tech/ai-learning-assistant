# 🔍 LLM 配置檢查

## 當前配置

### 1. Model Config
- Use Case: `analysis-simple`
- Model: `gemini-2.0-flash-exp`
- Temperature: `0.3`
- Source: `lib/config/model-config.ts`

### 2. Vercel AI SDK
- Provider: `@ai-sdk/google`
- Function: `createGoogleGenerativeAI()`
- Stream: `streamObject()`
- Response: `toTextStreamResponse()`

### 3. API Key
- Environment: `GEMINI_API_KEY`
- Location: `.env.local` or server environment

## 檢查項目

### ✅ 配置正確性
- [x] Model config 存在
- [x] Use case 正確 ('analysis-simple')
- [x] Vercel AI SDK 正確導入
- [x] streamObject 正確使用

### ⚠️ 需要驗證
- [ ] GEMINI_API_KEY 是否設置
- [ ] API key 是否有效
- [ ] Gemini API 是否可訪問
- [ ] streamObject 是否正確返回數據

## 測試方法

### 1. 檢查環境變數
```bash
echo $GEMINI_API_KEY  # 應該顯示 API key
```

### 2. 檢查 API 連接
查看 server logs 是否有：
- `[StreamAnalysis] ✅ Streaming started`
- 或 `[StreamAnalysis] ❌ Error: ...`

### 3. 檢查實際返回
查看 client console 是否有：
- `📥 Raw chunk received` ← 如果有，API 正常
- 如果沒有，可能是 API key 問題
