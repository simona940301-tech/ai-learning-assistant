# ⚡ 快速開始指南

## 🚀 3 分鐘啟動

### 1. 確認環境變數
```bash
# 檢查 .env.local 是否存在
cat .env.local | head -3

# 應該看到:
# OPENAI_API_KEY=sk-...
# NEXT_PUBLIC_SUPABASE_URL=https://...
# NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
```

### 2. 啟動開發服務器
```bash
npm run dev
```

###3. 訪問應用
```
http://localhost:3000           # 首頁
http://localhost:3000/ask       # 解題頁面
http://localhost:3000/backpack  # 錯題本
```

### 4. 測試解題功能
在 Ask 頁面輸入框貼上：
```
三角形 ABC，已知 a=5, b=7, C=60°，求 c=?
```
按 Enter 送出。

### 5. 驗證 API
```bash
# 另開一個終端
npm run verify:solve
```

---

## 📱 iOS App 測試

### 1. 確保 Next.js 運行
```bash
npm run dev  # 必須運行在 http://127.0.0.1:3000
```

### 2. 打開 Xcode
```bash
cd ios-app
open -a Xcode
```

### 3. 創建新的 iOS App 專案
- File > New > Project
- iOS > App
- Interface: SwiftUI
- Language: Swift

### 4. 添加檔案
- 拖放 `WebView.swift` 到專案
- 拖放 `ContentView.swift` 替換現有檔案
- 複製 `Info.plist` 內容到專案的 Info.plist

### 5. 運行
- 選擇 iPhone 模擬器
- Product > Run (Cmd+R)

---

## 🔍 除錯

### 問題: 輸入框無法貼上
**解決**: 已修復！使用非受控 textarea。

### 問題: API 回應 404
**檢查**:
```bash
npm run verify:solve
# 查看哪個階段失敗
```

### 問題: iOS App 顯示空白
**檢查**:
1. Next.js 是否運行？
2. 使用 `127.0.0.1` 而非 `localhost`？
3. Info.plist 包含 ATS 例外？

---

## 📊 服務器日誌範例

```bash
[solve][stage=parse] Starting request
[solve][stage=parse] Validated: { subject: 'MathA', mode: 'step' }
[solve][stage=subject] Resolving subject: MathA
[solve][stage=subject] Found: abc-123-...
[solve][stage=keypoints] Loaded keypoints: 45
[solve][stage=response] Success: { subject: 'MathA', keypoint: 'TRIG_COS_LAW' }
```

---

**🎉 開始使用吧！**

