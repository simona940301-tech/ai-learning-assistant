# 🔧 開發環境問題排除指南

## 常見問題與解決方案

### 1. ❌ 404 錯誤：找不到 Next.js chunks

**錯誤訊息**：
```
GET http://localhost:3000/_next/static/chunks/app/(app)/layout.js net::ERR_ABORTED 404
GET http://localhost:3000/_next/static/chunks/main-app.js 404
```

**原因**：
- `.next` 目錄包含 production build 產物，但開發服務器需要重新生成開發模式的 chunks
- 開發服務器和生產構建的文件結構不匹配

**解決方案**：

#### 快速修復
```bash
# 1. 停止開發服務器（Ctrl+C 或）
pnpm clean:port

# 2. 清理 .next 目錄
rm -rf apps/web/.next

# 3. 重新啟動
pnpm --filter web dev
```

#### 一鍵修復
```bash
# 清理埠口和 .next 目錄
pnpm clean:dev

# 然後重新啟動
pnpm --filter web dev
```

#### 完整清理（如果還有問題）
```bash
# 清理埠口、.next 和緩存
pnpm clean:full

# 重新啟動
pnpm --filter web dev
```

### 2. ❌ 埠口被佔用

**錯誤訊息**：
```
Error: listen EADDRINUSE: address already in use :::3000
```

**解決方案**：
```bash
pnpm clean:port
```

或手動：
```bash
lsof -ti:3000 | xargs kill -9
```

### 3. ❌ Hot Reload 不工作

**原因**：可能是緩存問題

**解決方案**：
```bash
# 完整清理
pnpm clean:full

# 重新啟動
pnpm --filter web dev
```

### 4. ❌ 模組找不到錯誤

**錯誤訊息**：
```
Module not found: Can't resolve 'xxx'
```

**解決方案**：
```bash
# 1. 重新安裝依賴
pnpm install --filter web

# 2. 清理並重啟
pnpm clean:full
pnpm --filter web dev
```

## 🔄 標準開發工作流程

### 正常啟動開發服務器
```bash
pnpm --filter web dev
```

### 遇到問題時的標準流程
```bash
# 1. 停止服務器（如果還在運行）
pnpm clean:port

# 2. 清理構建產物
pnpm clean:dev

# 3. 重新啟動
pnpm --filter web dev
```

### 完全重置開發環境
```bash
# 1. 清理所有東西
pnpm clean:full

# 2. 重新安裝依賴（可選，如果懷疑依賴問題）
pnpm install --filter web

# 3. 啟動服務器
pnpm --filter web dev
```

## 📋 可用的清理命令

| 命令 | 功能 |
|------|------|
| `pnpm clean:port` | 清理佔用 3000 埠的進程 |
| `pnpm clean:dev` | 清理埠口 + `.next` 目錄 |
| `pnpm clean:full` | 清理埠口 + `.next` + 緩存 |

## 🔍 診斷步驟

如果問題持續存在，執行以下診斷：

```bash
# 1. 檢查埠口狀態
lsof -i:3000

# 2. 檢查 .next 目錄
ls -la apps/web/.next

# 3. 檢查依賴
pnpm list --filter web

# 4. 檢查 Next.js 版本
pnpm list next --filter web
```

## 💡 預防措施

### 開發前
- 如果之前執行了 `pnpm build`，記得清理 `.next` 目錄
- 確保沒有其他 Next.js 進程在運行

### 切換環境時
- 從 production build 切換到 dev：清理 `.next`
- 從 dev 切換到 production build：清理 `.next` 並執行 `pnpm build`

### 最佳實踐
1. **開發時使用** `pnpm dev`，不要使用 `pnpm build` + `pnpm start`
2. **遇到奇怪錯誤時**，先嘗試清理 `.next` 目錄
3. **長時間開發後**，定期清理緩存可以避免一些奇怪的問題

## 🚨 緊急修復流程

如果所有方法都失敗：

```bash
# 1. 完全停止所有 Node 進程（謹慎使用）
pkill -9 node

# 2. 清理所有構建產物
rm -rf apps/web/.next
rm -rf node_modules/.cache

# 3. 重新安裝依賴
pnpm install --filter web

# 4. 重新啟動
pnpm --filter web dev
```

## 📞 仍然無法解決？

檢查以下內容：
1. Node.js 版本是否符合要求（>=18.0.0）
2. pnpm 版本是否符合要求（>=8.0.0）
3. 是否有足夠的磁盤空間
4. 檢查終端錯誤訊息的完整輸出

