# 🔌 WebSocket 設定驗證清單

> 根據專案架構，確保 500 題題庫和 WS 連線正常運作

## 📋 快速驗證清單

### Vercel 環境變數 (Next.js 前端)

| 變數名 | 必填 | 期望值 | 驗證 |
|--------|------|--------|------|
| `NEXT_PUBLIC_BATTLE_WS_URL` | ✅ | `wss://battle-ws.fly.dev/ws/battle` | [ ] |
| `NEXT_PUBLIC_BATTLE_WS_ENABLED` | ✅ | `true` | [ ] |
| `NEXT_PUBLIC_SITE_URL` | ✅ | `https://plms-learning.vercel.app` | [ ] |
| `INTERNAL_API_KEY` | ✅ | `<與 Fly.io 相同的密鑰>` | [ ] |
| `NEXT_PUBLIC_WS_URL` | ❌ | **刪除此變數** | [ ] |

### Fly.io Secrets (WebSocket 服務器)

| 變數名 | 必填 | 期望值 | 驗證 |
|--------|------|--------|------|
| `NEXTJS_API_URL` | ✅ | `https://plms-learning.vercel.app` | [ ] |
| `INTERNAL_API_KEY` | ✅ | `<與 Vercel 相同的密鑰>` | [ ] |
| `BATTLE_EVENTS_API_URL` | 選填 | `https://plms-learning.vercel.app/api/play/battle/events` | [ ] |
| `REDIS_URL` | 選填 | `redis://...` (PVP 匹配用) | [ ] |
| `VERCEL_PROTECTION_BYPASS` | 選填 | Vercel protection key | [ ] |
| `RUST_LOG` | 選填 | `info` 或 `debug` | [ ] |

## 🔑 INTERNAL_API_KEY 同步

**關鍵：Vercel 和 Fly.io 的 `INTERNAL_API_KEY` 必須完全一致！**

### 生成新密鑰（如需要）

```bash
# 在終端執行生成 32 字節隨機密鑰
openssl rand -hex 32
```

### 設置到 Vercel

1. 前往 Vercel Dashboard → Settings → Environment Variables
2. 添加或更新 `INTERNAL_API_KEY`
3. 選擇「All Environments」
4. 保存並重新部署

### 設置到 Fly.io

```bash
cd services/battle-ws
flyctl secrets set INTERNAL_API_KEY=<你的密鑰>
```

## 🚀 重新部署步驟

### 1. Vercel (設置環境變數後)

```bash
# 觸發重新部署
git commit --allow-empty -m "chore: trigger redeploy for env vars"
git push
```

或在 Vercel Dashboard 點擊 "Redeploy"

### 2. Fly.io (設置 secrets 後)

```bash
cd services/battle-ws
flyctl apps restart battle-ws
```

## ✅ 驗證連線

### 方法 1: 使用 /play 頁面 WS 指示器

1. 前往 `https://plms-learning.vercel.app/play`
2. 查看標題下方的 WS 狀態指示器
3. 綠色 = 已連線 ✅
4. 橘色 = 連線中 ⏳
5. 紅色 = 已停用 ❌

### 方法 2: 瀏覽器 Console

1. 打開 DevTools (F12)
2. 查看 Console 輸出
3. 應該看到：`[PlayProvider] ✅ WebSocket connected`

### 方法 3: 實際測試

1. 登入應用
2. 前往 /play
3. 點擊「系統對戰」→「AI 訓練」
4. 確認對戰可以正常開始

## 🔍 常見問題排查

### 問題 1: 看到「尚未連線」Toast

**原因**：
- 環境變數未生效（需要重新部署）
- `NEXT_PUBLIC_BATTLE_WS_ENABLED` 不是 `true`
- Fly.io 服務未運行

**解決**：
1. 確認 Vercel 已重新部署
2. 確認 Fly.io 服務運行中：`flyctl status -a battle-ws`

### 問題 2: WebSocket 連線後立即斷開

**原因**：
- `INTERNAL_API_KEY` 不匹配
- `NEXTJS_API_URL` 設置錯誤

**解決**：
1. 比對 Vercel 和 Fly.io 的 `INTERNAL_API_KEY`
2. 確認 `NEXTJS_API_URL` 正確

### 問題 3: 題目無法載入

**原因**：
- `seed_questions` 表資料問題
- API 路由驗證失敗

**解決**：
1. 確認 `seed_questions` 表有 `is_active=true` 的記錄
2. 確認題目有完整的 `option_a` ~ `option_d`

## 📊 題庫驗證

### 確認題目資料

```sql
-- 檢查啟用的題目數量
SELECT COUNT(*) FROM seed_questions WHERE is_active = true;

-- 檢查每個科目的題目數
SELECT subject, COUNT(*) 
FROM seed_questions 
WHERE is_active = true 
GROUP BY subject;

-- 檢查選項完整性
SELECT COUNT(*) 
FROM seed_questions 
WHERE is_active = true 
  AND option_a IS NOT NULL 
  AND option_a != ''
  AND option_b IS NOT NULL 
  AND option_b != '';
```

## 🔄 Fly.io 常用命令

```bash
# 查看應用狀態
flyctl status -a battle-ws

# 查看日誌
flyctl logs -a battle-ws

# 查看 secrets 列表
flyctl secrets list -a battle-ws

# 重啟應用
flyctl apps restart battle-ws

# SSH 進入容器調試
flyctl ssh console -a battle-ws
```

---

**最後更新：** 2025-12-07
