# 🔍 LLM 配置完整檢查報告

## ✅ 配置正確性驗證

### 1. Model Config (✅ 正確)

**位置**: `apps/web/lib/config/model-config.ts`

```typescript
'analysis-simple': {
    modelName: 'gemini-2.0-flash-exp',  // ✅ 使用 2.0 Flash
    temperature: 0.3,                   // ✅ 平衡的溫度
    description: 'Standard document analysis',
    costPer1MTokens: 0.075
}
```

**使用位置**: `apps/web/lib/services/elite-rag-analyzer.ts:105`
```typescript
const modelParams = getModelParams('analysis-simple')
// ✅ 正確調用
```

---

### 2. Vercel AI SDK 配置 (✅ 正確)

**位置**: `apps/web/lib/services/elite-rag-analyzer.ts:28-30`

```typescript
const google = createGoogleGenerativeAI({
    apiKey: process.env.GEMINI_API_KEY,  // ✅ 使用環境變數
})
```

**Stream 配置**: Line 175-180
```typescript
const result = await streamObject({
    model: google(modelParams.model),     // ✅ 使用配置的 model
    temperature: modelParams.temperature, // ✅ 使用配置的 temperature
    schema: GSATAnalysisSchema,          // ✅ 使用正確的 schema
    prompt: prompt,
})
```

**返回格式**: Line 185
```typescript
return result.toTextStreamResponse()  // ✅ 正確的 streaming response
```

---

### 3. API Route 配置 (✅ 正確)

**位置**: `apps/web/app/api/rag/analyze-object/route.ts`

```typescript
// ✅ 正確調用
return generateStreamedAnalysis(analysisText, subject)
```

---

## ⚠️ 需要驗證的項目

### 1. GEMINI_API_KEY 環境變數

**檢查方法**:
```bash
# 在 server 端檢查
console.log('[Config] GEMINI_API_KEY exists:', !!process.env.GEMINI_API_KEY)
console.log('[Config] GEMINI_API_KEY length:', process.env.GEMINI_API_KEY?.length || 0)
```

**預期結果**:
- ✅ `exists: true`
- ✅ `length: > 0` (通常是 39 字符)

---

### 2. Server Logs 檢查

**應該看到的 logs**:
```
[StreamAnalysis] 🚀 Starting structured analysis...
[StreamAnalysis] Context length: 12345 chars
[StreamAnalysis] Subject hint: 其他
[StreamAnalysis] ✅ Streaming started  ← 關鍵！
```

**如果看到錯誤**:
```
[StreamAnalysis] ❌ Error: ...
```

**常見錯誤**:
- `API key not valid` → API key 錯誤
- `Model not found` → Model 名稱錯誤
- `Rate limit exceeded` → API 配額用完
- `Network error` → 網路問題

---

### 3. Model 名稱驗證

**當前使用**: `gemini-2.0-flash-exp`

**Vercel AI SDK 支援的 Gemini models**:
- ✅ `gemini-2.0-flash-exp` (實驗版)
- ✅ `gemini-1.5-flash`
- ✅ `gemini-1.5-pro`
- ✅ `gemini-1.5-pro-latest`

**檢查**: 確認 `gemini-2.0-flash-exp` 是否仍然可用

---

## 🔧 診斷步驟

### Step 1: 檢查 Server Logs

查看 terminal 或 server logs，尋找：
```
[StreamAnalysis] ✅ Streaming started
```

**如果沒有這個 log**:
- ❌ `streamObject` 調用失敗
- ❌ API key 無效
- ❌ Model 名稱錯誤

### Step 2: 檢查 Client Console

查看 browser console，尋找：
```
📡 Starting stream read...
📥 Raw chunk received: ...
```

**如果沒有這些 logs**:
- ❌ Server 沒有返回 stream
- ❌ Response body 為空
- ❌ Network 錯誤

### Step 3: 檢查 Network Tab

在 browser DevTools → Network tab:
1. 找到 `POST /api/rag/analyze-object`
2. 檢查 Response:
   - Status: `200 OK` ✅
   - Headers: `Content-Type: text/plain; charset=utf-8` ✅
   - Response body: 應該有內容 ✅

**如果 Status 不是 200**:
- `401` → 認證問題
- `500` → Server 錯誤（查看 server logs）

---

## 🚨 可能的問題

### 問題 1: API Key 未設置

**症狀**:
- Server log: `[StreamAnalysis] ❌ Error: API key not valid`
- Client: 沒有收到任何 stream

**解決**:
```bash
# 檢查 .env.local
cat apps/web/.env.local | grep GEMINI_API_KEY

# 或檢查 server 環境變數
```

### 問題 2: Model 名稱錯誤

**症狀**:
- Server log: `[StreamAnalysis] ❌ Error: Model not found`
- Client: 沒有收到任何 stream

**解決**:
- 檢查 `model-config.ts` 中的 model 名稱
- 確認 Vercel AI SDK 支援該 model

### 問題 3: Schema 不匹配

**症狀**:
- Server log: `[StreamAnalysis] ✅ Streaming started`
- Client: 收到 stream 但格式不匹配

**解決**:
- 檢查 `GSATAnalysisSchema` 定義
- 確認 AI 返回的格式符合 schema

---

## ✅ 快速驗證腳本

創建測試腳本來驗證配置：

```typescript
// test-llm-config.ts
import { getModelParams } from '@/lib/config/model-config'
import { createGoogleGenerativeAI } from '@ai-sdk/google'
import { streamObject } from 'ai'
import { GSATAnalysisSchema } from '@/lib/services/elite-rag-analyzer'

async function testLLMConfig() {
    console.log('🔍 Testing LLM Configuration...')
    
    // 1. Check API Key
    const apiKey = process.env.GEMINI_API_KEY
    console.log('API Key exists:', !!apiKey)
    console.log('API Key length:', apiKey?.length || 0)
    
    if (!apiKey) {
        console.error('❌ GEMINI_API_KEY not set!')
        return
    }
    
    // 2. Check Model Config
    const modelParams = getModelParams('analysis-simple')
    console.log('Model:', modelParams.model)
    console.log('Temperature:', modelParams.temperature)
    
    // 3. Test API Connection
    try {
        const google = createGoogleGenerativeAI({ apiKey })
        
        const result = await streamObject({
            model: google(modelParams.model),
            temperature: modelParams.temperature,
            schema: GSATAnalysisSchema,
            prompt: '測試：請返回 {"subject": "測試", "topics": ["測試"], "summary": "測試", "keyConcepts": [], "examPrediction": []}'
        })
        
        console.log('✅ Stream created successfully')
        
        // Try to read first chunk
        const stream = result.toDataStreamResponse()
        console.log('✅ Stream response created')
        
    } catch (error) {
        console.error('❌ Error:', error)
    }
}

testLLMConfig()
```

---

## 📊 配置總結

### ✅ 正確的配置

| 項目 | 配置 | 狀態 |
|------|------|------|
| Model Config | `analysis-simple` → `gemini-2.0-flash-exp` | ✅ |
| Vercel AI SDK | `createGoogleGenerativeAI()` | ✅ |
| Stream Function | `streamObject()` | ✅ |
| Schema | `GSATAnalysisSchema` | ✅ |
| Response Format | `toTextStreamResponse()` | ✅ |
| API Route | `/api/rag/analyze-object` | ✅ |

### ⚠️ 需要驗證

| 項目 | 檢查方法 | 狀態 |
|------|---------|------|
| API Key | Server logs | ⏳ |
| Model 可用性 | API 測試 | ⏳ |
| Stream 返回 | Client console | ⏳ |

---

## 🎯 下一步

1. **檢查 Server Logs**: 查看是否有 `[StreamAnalysis] ✅ Streaming started`
2. **檢查 Client Console**: 查看是否有 `📥 Raw chunk received`
3. **如果都沒有**: 檢查 API key 和 model 配置
4. **如果有 logs 但無內容**: 檢查 stream 格式解析

---

**配置狀態**: ✅ 代碼配置正確  
**驗證狀態**: ⏳ 需要實際測試確認  
**問題排查**: 📋 見上方診斷步驟


















