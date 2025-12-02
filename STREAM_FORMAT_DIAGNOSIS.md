# 🔍 Stream 格式診斷

## 發現的問題

### 實際接收的格式
```
"difficulty": "Medium",
"analysis": "根據題幹描述，《四庫全書》...",
"options": [
```

### 不是預期的格式
```
❌ 不是: 0:{"subject":"..."}
❌ 不是: data: {"subject":"..."}
```

## 根本原因

`streamObject()` 返回的是 **部分 JSON 片段**，不是完整的對象！

### Vercel AI SDK streamObject 的行為
```
Chunk 1: '{"subject":'
Chunk 2: '"國文",'
Chunk 3: '"topics":['
Chunk 4: '"國學常識"'
...
```

**不是**標準的 SSE 或 line-delimited JSON！

## 正確的解決方案

使用 Vercel AI SDK 的 **readableStream** 或 **partialObjectStream**

```typescript
const { partialObjectStream } = await streamObject(...)

for await (const partialObject of partialObjectStream) {
    // partialObject 是逐步更新的物件
    setAnalysis(partialObject)
}
```
