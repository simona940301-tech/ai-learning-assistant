# 🚀 部署檢查清單

## 部署前必做檢查

### 1. 執行驗證腳本
```bash
pnpm verify:deployment
```

這個腳本會自動檢查：
- ✅ `apps/web/package.json` 包含所有必要依賴（特別是 zod）
- ✅ `pnpm-lock.yaml` 已同步
- ✅ `vercel.json` 配置正確
- ✅ 所有關鍵檔案都存在

### 2. 清理本地 3000 埠（如需要）
```bash
pnpm clean:port
# 或手動執行
lsof -ti:3000 | xargs kill -9
```

### 3. 本地測試 Build
```bash
pnpm --filter web build
```

應該看到：
- ✅ `Compiled successfully`
- ✅ `Generating static pages (40/40)`
- ✅ 所有路由都正確生成

### 4. 本地測試 Dev Server
```bash
pnpm --filter web dev
```

訪問 `http://localhost:3000` 確認運行正常。

## Vercel 部署配置

### 當前配置（vercel.json）
- **Root Directory**: `apps/web`
- **Install Command**: `pnpm install --filter web`
- **Build Command**: `cd apps/web && pnpm build`

### 環境變數檢查
確保 Vercel Dashboard 中設定了：
- `GEMINI_API_KEY`（如果使用）
- `OPENAI_API_KEY`（如果使用）
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- 其他必要的環境變數

## 常見問題解決

### ❌ Build 失敗：Cannot find module 'zod'
**原因**：lockfile 未同步或 package.json 缺少 zod

**解決**：
1. 確認 `apps/web/package.json` 包含 `"zod": "^3.23.8"`
2. 執行 `pnpm install --filter web`
3. Commit 並 push `pnpm-lock.yaml`
4. 重新部署

### ❌ Build 失敗：Page couldn't be rendered statically
**原因**：API routes 使用了 cookies 或 request.url（這是正常的）

**解決**：這是預期行為，API routes 應該是動態的（λ）。只要 build 成功完成即可。

### ❌ 本地 3000 埠被佔用
**原因**：舊的 Node 進程仍在運行

**解決**：
```bash
pnpm clean:port
# 或
lsof -ti:3000 | xargs kill -9
```

## 部署後驗證

1. 訪問生產環境 URL
2. 測試主要功能：
   - `/ask` - AI 助教頁面
   - `/backpack` - 學習書包
   - `/api/ai` - API 端點響應正常

## 預防性措施

### 自動化腳本
- `pnpm verify:deployment` - 部署前驗證
- `pnpm clean:port` - 清理埠口

### Git Hooks（可選）
可以在 `.git/hooks/pre-push` 中加入驗證：

```bash
#!/bin/bash
pnpm verify:deployment || exit 1
```

## 最佳實踐

1. **每次部署前執行驗證**
   ```bash
   pnpm verify:deployment && git push
   ```

2. **確保 lockfile 同步**
   - 每次修改 `package.json` 後執行 `pnpm install`
   - 將 `pnpm-lock.yaml` 納入版本控制

3. **測試本地 build**
   - 部署前務必測試本地 build 是否成功

4. **監控 Vercel 部署日誌**
   - 檢查是否有新的依賴缺失
   - 確認環境變數設定正確

