# Stream 格式問題診斷

## 當前代碼期待的格式 (SSE)
```
data: {"subject":"國文"}

data: {"topics":["國學常識"]}

data: [DONE]
```

## Vercel AI SDK 實際格式
```
0:{"subject":"國文"}
0:{"topics":["國學常識"]}
```

## 問題
Line 175: `if (!line.trim() || !line.startsWith('data: ')) continue`

❌ 會跳過所有 Vercel AI 格式的行！

## 解決方案
支援兩種格式：
1. SSE format: `data: {...}`
2. Vercel AI format: `0:{...}` or `2:{...}`
