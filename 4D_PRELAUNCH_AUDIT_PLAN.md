# 🎯 4D Pre-launch QA Audit Plan (T-3 Days)
**混合式敏捷審核** - Mobile-First Web App 上架前最終檢查

**開始時間**: 2025-11-27
**預計完成**: 2025-11-29
**審核負責人**: Claude Code Assistant

---

## 📋 審核總覽

### 🎯 核心目標
- 確保核心業務邏輯正確性 (Store, Auth, Play 穩定性)
- 消除已知技術債務 (forceUpdate, __PLMS_FORCE_SOLVER__)
- 驗證移動設備適配和性能
- 建立可維護的測試基礎設施

### 🔍 測試策略
- **優先級**: P0 核心流程 > P1 重要功能 > P2 優化項目
- **方法**: 人工測試 + 輕量自動化 + 工具輔助
- **覆蓋**: 邊緣設備 + 主流設備 + 平板模式

---

## 📅 Day 1: P0 功能驗證 + E2E 腳本開發

### 🏪 Store 頁面測試 (P0 - 商業轉化核心)
**測試目標**: 驗證 /store 確實顯示商品，且購買流程正常

**檢查清單**:
- [ ] Store 頁面載入正常 (無 404/500 錯誤)
- [ ] 商品列表顯示 (至少顯示商品卡片)
- [ ] 立即搶購按鈕可點擊
- [ ] 點擊後觸發購買流程 (可模擬支付)
- [ ] 購買成功後顯示確認訊息
- [ ] 購買記錄正確儲存到用戶帳戶

**測試腳本**:
```bash
# 啟動開發服務器
pnpm run dev:web

# 在瀏覽器中執行以下步驟:
# 1. 登入測試帳戶
# 2. 導航到 /store
# 3. 驗證商品顯示
# 4. 點擊購買按鈕
# 5. 確認流程完成
```

### 🎮 Play 頁面測試 (P0 - 用戶參與核心)
**測試目標**: Battle 和 Practice 模式不再需要 forceUpdate

**檢查清單**:
- [ ] Play 頁面載入 (無 forceUpdate 錯誤)
- [ ] Battle 模式啟動正常
- [ ] Practice 模式啟動正常
- [ ] 狀態更新平滑 (無卡頓/閃爍)
- [ ] 遊戲結束後數據正確結算
- [ ] 重新開始遊戲不會出現狀態問題

### 🔐 Auth 流程測試 (P0 - 安全核心)
**測試目標**: 未登入用戶訪問 /play 被正確阻擋

**檢查清單**:
- [ ] 未登入用戶訪問 /play 被重定向到登入頁面
- [ ] 登入頁面載入正常
- [ ] 登入成功後正確重定向回原頁面
- [ ] Session 保持正常 (重新整理後仍登入)
- [ ] 登出功能正常

### 🤖 AI/RAG 測試 (P0 - 核心功能)
**測試目標**: Solver 模式和正常 AI Tutor 模式正確切換

**檢查清單**:
- [ ] Ask 頁面載入正常
- [ ] 題目輸入功能正常
- [ ] AI 回應生成正常
- [ ] RAG 摘要功能有效
- [ ] 無 __PLMS_FORCE_SOLVER__ 相關錯誤

---

## 📅 Day 2: P1 功能驗證 + 性能/設備測試

### 📚 Backpack & Error Book 測試 (P1)
**測試目標**: 數據從 API 正確獲取，非 Mock 數據

**檢查清單**:
- [ ] Backpack 頁面載入正常
- [ ] 顯示實際儲存的題目 (非 Mock)
- [ ] Error Book 數據正確同步
- [ ] Profile weeklyGrowth 顯示真實數據
- [ ] userRanking 從 API 獲取

### 🧭 導航測試 (P1)
**測試目標**: 全域導航無 404 錯誤

**檢查清單**:
- [ ] Tab Bar: Community, Play, Ask, Backpack, Profile
- [ ] App Bar Home Page 入口
- [ ] 所有連結點擊後正確導航
- [ ] 無 404/500 錯誤

### 📱 設備測試 (P1)
**測試設備**:
- iPhone SE/5/6/SE (2020) - 小螢幕測試
- iPhone 15/Samsung S24 - 主流機型
- iPad/Android Tablet - 平板模式

**檢查重點**:
- Play Page 響應式設計
- Glassmorphism 效果 (backdrop-filter 性能)
- 硬編碼像素修正 (min-h-[60vh])
- 橫屏佈局穩定

---

## 📅 Day 3: 安全合規檢查 + 問題修復 + 最終報告

### 🔒 安全審核 (P0)
**測試目標**: 確保符合上架要求

**檢查清單**:
- [ ] OAuth 驗證 (Google/Email) 正常
- [ ] 環境變數配置正確 (無敏感信息暴露)
- [ ] API 路由需要有效 Token
- [ ] SEO Metadata (generateMetadata) 正常
- [ ] OpenGraph 圖片正確顯示

### 📊 性能優化驗證 (P1)
**檢查清單**:
- [ ] 圖像使用 next/image (WebP 格式)
- [ ] Lighthouse FCP < 3秒, LCP < 5秒
- [ ] 技術債清理 (forceUpdate, __PLMS_FORCE_SOLVER__)
- [ ] 移動設備載入速度達標

### 🎨 UX 驗證 (P1)
**檢查清單**:
- [ ] Toast 系統正常工作
- [ ] 空白狀態顯示適當插畫
- [ ] 全設備一致體驗
- [ ] 動畫流暢 (≤200ms)

---

## 🛠️ 測試工具與腳本

### 自動化測試腳本
- `test-4d-audit-core-flows.ts` - P0 E2E 測試
- `test-mobile-responsiveness.ts` - 設備適配測試
- `test-performance-metrics.ts` - 性能指標測試

### 手動測試檢查表
- `4D_AUDIT_CHECKLIST.md` - 完整檢查清單
- `BUG_REPORT_TEMPLATE.md` - 問題記錄模板
- `PERFORMANCE_REPORT.md` - 性能測試報告

---

## 📈 成功指標

### Day 1 結束時
- [ ] P0 功能 100% 通過
- [ ] E2E 測試腳本完成
- [ ] 發現問題已分類 (Blocker/Critical/Major)

### Day 2 結束時
- [ ] P1 功能 ≥90% 通過
- [ ] 多設備測試完成
- [ ] 性能基準建立

### Day 3 結束時
- [ ] 安全合規檢查完成
- [ ] 修復驗證完成
- [ ] 最終審核報告生成
- [ ] 獲得上架許可

---

## 🚨 風險緩解

### 高風險項目
1. **Store Bug**: 如果購買流程有問題，立即修復
2. **Auth 中間件**: 如果重定向有問題，優先修復
3. **設備適配**: 小螢幕問題必須解決

### 備用計劃
- 如果發現 Blocker 級別問題，延長審核時間
- 關鍵修復後重新執行完整測試套件
- 建立 Hotfix 部署流程

---

## 📋 執行記錄

### 已完成
- [x] 審核計劃制定 (2025-11-27)

### 進行中
- [ ] Day 1: P0 功能驗證

### 待完成
- [ ] Day 2: P1 功能 + 設備測試
- [ ] Day 3: 安全檢查 + 最終報告

---

*此計劃將根據實際測試結果動態調整。所有發現的問題將立即記錄並分類處理。*






























