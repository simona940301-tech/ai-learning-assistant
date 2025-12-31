# 壓力測試執行指南

## 🎯 測試目標

驗證 AI 基礎設施在生產負載下的性能表現:
- **P95 TTFT** < 500ms
- **P99 TTFT** < 1000ms
- **性能退化** < 20% (高併發)
- **成功率** > 99%

---

## 📋 測試前準備

### 1. 環境設置

**Staging 環境要求:**
- ✅ 與生產環境配置一致
- ✅ 已部署最新代碼
- ✅ Sentry 已配置 (驗證告警)
- ✅ Redis 可用 (驗證快取)

**獲取測試憑證:**
```bash
# 登入 Staging 環境獲取 JWT token
# 方法 1: 從瀏覽器 DevTools 複製
# 方法 2: 使用 API 登入
curl -X POST https://staging.your-domain.com/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"password"}' \
  | jq -r '.token'
```

### 2. 測試數據準備

**創建測試文件:**
```bash
# 上傳測試 PDF 到 Backpack
# 記錄 file_id 用於測試
```

**更新測試腳本:**
```javascript
// 編輯 scripts/stress-test-ai.js
const TESTS = [
  {
    name: 'Backpack Ask (Edge Runtime)',
    endpoint: '/api/backpack/ask',
    body: {
      file_id: 'YOUR_TEST_FILE_ID', // 替換為實際 file_id
      prompt: '這是什麼?',
      scope: 'document',
      top_k: 6,
    },
    // ...
  },
]
```

---

## 🚀 執行測試

### 基礎測試 (快速驗證)

```bash
cd apps/web

# 設置環境變數
export AUTH_TOKEN="<your-staging-jwt-token>"
export API_URL="https://staging.your-domain.com"

# 運行測試
node scripts/stress-test-ai.js
```

### 完整測試 (所有併發級別)

**測試矩陣:**
| 端點 | 併發 | 迭代 | 預期時間 |
|------|------|------|---------|
| Backpack Ask | 1, 5, 10, 20 | 10 | ~5 min |
| Expert Q&A | 1, 5, 10 | 10 | ~3 min |

**執行:**
```bash
# 完整測試 (預計 8-10 分鐘)
node scripts/stress-test-ai.js > test-results.log 2>&1

# 實時查看結果
tail -f test-results.log
```

---

## 📊 結果分析

### 1. 即時輸出解讀

**成功案例:**
```
📊 Backpack Ask (Edge Runtime)
------------------------------------------------------------
  Testing with 1 concurrent requests...
  ✅ Concurrency: 1
     TTFT: avg=287ms, min=245ms, max=312ms, p95=305ms
     Total: avg=1234ms
     Success rate: 100.0%

  Testing with 10 concurrent requests...
  ✅ Concurrency: 10
     TTFT: avg=342ms, min=298ms, max=456ms, p95=423ms
     Total: avg=1567ms
     Success rate: 100.0%
```

**分析:**
- ✅ P95 TTFT (423ms) < 500ms ✅
- ✅ 性能退化 (342-287)/287 = 19% < 20% ✅
- ✅ 成功率 100% ✅

**問題案例:**
```
  Testing with 20 concurrent requests...
  ❌ Concurrency: 20
     TTFT: avg=678ms, min=534ms, max=892ms, p95=845ms
     Total: avg=2345ms
     Success rate: 95.0%
```

**分析:**
- ❌ P95 TTFT (845ms) > 500ms ❌
- ❌ 性能退化 (678-287)/287 = 136% > 20% ❌
- ❌ 成功率 95% < 99% ❌

### 2. 關鍵指標檢查

**P95 TTFT:**
```bash
# 從日誌提取 P95 數據
grep "p95=" test-results.log | awk -F'p95=' '{print $2}' | awk -F'ms' '{print $1}'
```

**性能退化:**
```bash
# 計算基準 vs 高負載
baseline=$(grep "Concurrency: 1" test-results.log | grep "avg=" | head -1 | awk -F'avg=' '{print $2}' | awk -F'ms' '{print $1}')
peak=$(grep "Concurrency: 20" test-results.log | grep "avg=" | head -1 | awk -F'avg=' '{print $2}' | awk -F'ms' '{print $1}')
echo "Degradation: $(echo "scale=2; ($peak - $baseline) / $baseline * 100" | bc)%"
```

---

## 🔍 Sentry 驗證

### 1. 檢查 RPC 延遲告警

**登入 Sentry Dashboard:**
```
https://sentry.io/organizations/your-org/issues/
```

**預期行為:**
1. 測試期間出現 RPC 延遲警告
2. 警告訊息: "RPC latency exceeded 50ms"
3. 包含詳細上下文 (operation, runtime, latency)

**驗證項目:**
- ✅ 告警正常觸發
- ✅ 延遲數據準確
- ✅ Tags 正確 (operation, runtime)
- ✅ Breadcrumbs 記錄完整

### 2. 檢查 P95 閾值告警

**查找告警:**
```
Filter: "P95 RPC latency exceeded threshold"
```

**驗證:**
- ✅ 高負載時觸發 P95 告警
- ✅ 告警包含統計數據 (p95_ms, threshold_ms)
- ✅ 告警級別正確 (warning)

---

## 🐛 常見問題排查

### 問題 1: 所有請求失敗 (401 Unauthorized)

**原因:** JWT token 無效或過期

**解決:**
```bash
# 重新獲取 token
# 確認 token 未過期
# 檢查 Authorization header 格式
```

### 問題 2: TTFT 過高 (> 1s)

**可能原因:**
1. Staging 環境資源不足
2. 冷啟動 (Edge Functions)
3. 網路延遲

**排查:**
```bash
# 檢查 Edge Functions 日誌
# 確認 Gemini API 響應時間
# 測試網路延遲: ping staging.your-domain.com
```

### 問題 3: RPC 延遲過高 (> 100ms)

**可能原因:**
1. Supabase 區域與 Edge Functions 不匹配
2. Vector Search 索引未優化
3. 數據庫負載過高

**排查:**
```bash
# 檢查 Supabase 區域
# 查看 search_doc_chunks_scoped 執行計劃
# 監控數據庫 CPU/Memory
```

### 問題 4: 成功率 < 99%

**可能原因:**
1. 速率限制 (Gemini API)
2. 超時設置過短
3. 併發限制

**排查:**
```bash
# 檢查 Gemini API quota
# 調整測試併發級別
# 增加超時時間
```

---

## ✅ 測試通過標準

### 必須達標

| 指標 | 目標 | 檢查方式 |
|------|------|---------|
| P95 TTFT | < 500ms | 查看測試輸出 p95 值 |
| P99 TTFT | < 1000ms | 查看測試輸出 p99 值 |
| 性能退化 | < 20% | 比較基準 vs 高負載 |
| 成功率 | > 99% | 查看 Success rate |

### Sentry 驗證

| 項目 | 預期行為 |
|------|---------|
| RPC 告警 | 高負載時觸發 |
| P95 告警 | 閾值超過時觸發 |
| Breadcrumbs | 記錄所有 RPC 調用 |
| Metrics | 顯示延遲分佈 |

---

## 📝 測試報告模板

```markdown
# AI 基礎設施壓力測試報告

## 測試環境
- 環境: Staging
- 日期: YYYY-MM-DD
- 測試工具: stress-test-ai.js
- 測試時長: X 分鐘

## 測試結果

### Backpack Ask (Edge Runtime)
- 併發 1: TTFT avg=Xms, p95=Xms ✅/❌
- 併發 10: TTFT avg=Xms, p95=Xms ✅/❌
- 併發 20: TTFT avg=Xms, p95=Xms ✅/❌
- 性能退化: X% ✅/❌
- 成功率: X% ✅/❌

### Expert Q&A (Edge Runtime)
- 併發 1: TTFT avg=Xms, p95=Xms ✅/❌
- 併發 10: TTFT avg=Xms, p95=Xms ✅/❌
- 性能退化: X% ✅/❌
- 成功率: X% ✅/❌

## Sentry 驗證
- RPC 告警: ✅/❌
- P95 告警: ✅/❌
- 數據準確性: ✅/❌

## 結論
- [ ] 所有指標達標,可部署生產
- [ ] 部分指標未達標,需優化
- [ ] 發現嚴重問題,暫緩部署

## 後續行動
1. ...
2. ...
```

---

## 🚀 測試通過後的行動

### 1. 記錄基準數據

```bash
# 保存測試結果
cp test-results.log baseline-$(date +%Y%m%d).log

# 提交到版本控制
git add baseline-*.log
git commit -m "docs: add stress test baseline"
```

### 2. 更新文檔

更新 `walkthrough.md`:
- 記錄實際 P95/P99 數據
- 更新性能基準表
- 添加測試日期

### 3. 部署到生產

**部署檢查清單:**
- ✅ 壓力測試通過
- ✅ Sentry 告警正常
- ✅ 所有環境變數已配置
- ✅ 監控儀表板已設置
- ✅ 回滾計劃已準備

**部署命令:**
```bash
# Vercel 部署
vercel --prod

# 或使用 CI/CD
git push origin main
```

### 4. 生產監控

**首 24 小時監控:**
- 每小時檢查 Sentry Dashboard
- 監控 RPC 延遲分佈
- 追蹤 TTFT P95/P99
- 收集用戶反饋

**持續監控:**
- 每日檢查性能趨勢
- 每週審查告警
- 每月性能報告

---

**準備好開始測試了嗎?執行 `node scripts/stress-test-ai.js` 開始驗證您的頂尖 AI 基礎設施!** 🚀
