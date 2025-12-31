# Vercel AI SDK streamObject Format

## 實際格式

```
0:{"subject":"數學"}
0:{"topics":["微積分"]}
0:{"summary":"..."}
0:{"keyConcepts":[{"concept":"導數"}]}
```

## 不是標準 SSE 格式！

標準 SSE:
```
data: {"subject":"數學"}

data: {"topics":["微積分"]}
```

Vercel AI SDK:
```
0:{"subject":"數學"}
0:{"topics":["微積分"]}
```

## 解決方案

使用 Vercel AI SDK 的客戶端工具或正確解析格式
