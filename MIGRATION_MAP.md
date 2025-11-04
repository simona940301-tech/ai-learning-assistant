# Web ↔ Mobile 組件遷移對照表

本文檔說明 Web (Next.js) 和 Mobile (React Native) 之間的組件對照關係，幫助開發者在兩個平台間遷移功能。

---

## 🎯 基本原則

### 邏輯層（100% 共用）
| 分類 | 位置 | 說明 |
|------|------|------|
| API 呼叫 | `@plms/shared/sdk` | Web 和 Mobile 完全共用 |
| 型別定義 | `@plms/shared/types` | Web 和 Mobile 完全共用 |
| 業務邏輯 | `@plms/shared/sdk` | 計算、驗證等邏輯完全共用 |
| Feature Flags | `@plms/shared/config` | Web 和 Mobile 完全共用 |
| Analytics | `@plms/shared/analytics` | 介面共用，實作各自實現 |

### UI 層（各自實作）
| 分類 | Web | Mobile | 說明 |
|------|-----|--------|------|
| 組件 | React + Shadcn/ui | React Native | UI 組件各自實作 |
| 導航 | Next.js App Router | Expo Router | 路由系統不同 |
| 樣式 | Tailwind CSS | StyleSheet | 樣式系統不同 |
| 動畫 | Framer Motion | React Native Reanimated | 動畫庫不同 |

---

## 📦 組件庫對照

### UI 組件庫

| 功能 | Web (Shadcn/ui) | Mobile (React Native) | 說明 |
|------|-----------------|----------------------|------|
| 按鈕 | `Button` | `Button` / `Pressable` | 基本一致 |
| 輸入框 | `Input` | `TextInput` | API 略有不同 |
| 下拉選單 | `Select` | `Picker` | 互動方式不同 |
| 對話框 | `Dialog` | `Modal` | 名稱不同，功能相似 |
| 卡片 | `Card` | `View` + StyleSheet | Mobile 需自訂樣式 |
| 標籤頁 | `Tabs` | `Tab Navigator` | Mobile 使用 navigation |
| Toast | `Toast` / `Sonner` | `Toast` (custom) | Mobile 需自行實作 |
| 下拉式選單 | `DropdownMenu` | `ActionSheet` | 互動方式不同 |
| 開關 | `Switch` | `Switch` | 基本一致 |
| 進度條 | `Progress` | `ProgressBar` | API 略有不同 |
| 骨架屏 | `Skeleton` | 自訂 | Mobile 需自行實作 |

### 導航系統

| 功能 | Web (Next.js) | Mobile (Expo Router) |
|------|---------------|----------------------|
| 頁面路由 | `app/page.tsx` | `app/index.tsx` |
| 動態路由 | `app/[id]/page.tsx` | `app/[id].tsx` |
| 巢狀路由 | `app/folder/page.tsx` | `app/folder/index.tsx` |
| Layout | `app/layout.tsx` | `app/_layout.tsx` |
| 導航連結 | `<Link href="/">` | `<Link href="/">` |
| 編程導航 | `router.push()` | `router.push()` |
| 返回 | `router.back()` | `router.back()` |

### 表單處理

| 功能 | Web | Mobile | 套件 |
|------|-----|--------|------|
| 表單驗證 | React Hook Form | React Hook Form | 可共用 |
| Schema 驗證 | Zod | Zod | 完全共用（`@plms/shared/types`） |
| 檔案上傳 | `<input type="file">` | `expo-image-picker` | API 不同 |
| 相機拍照 | WebRTC | `expo-camera` | 完全不同 |

### 資料獲取

| 功能 | Web | Mobile | 說明 |
|------|-----|--------|------|
| SDK 呼叫 | `plmsClient.*.method()` | `plms.*.method()` | **完全相同** |
| 狀態管理 | React State / Context | React State / Context | 完全相同 |
| 資料快取 | TanStack Query (可選) | TanStack Query (可選) | 完全相同 |

---

## 🔄 頁面遷移對照

### Ask (AI 助手) 頁面

| 功能 | Web 組件 | Mobile 組件 | SDK 方法 |
|------|----------|-------------|---------|
| 問答界面 | `components/ask/ChatContainer.tsx` | 需新建 | `plms.question.*` |
| 訊息氣泡 | `components/ask/messages/AIMessage.tsx` | 需新建 | - |
| 輸入區 | `components/ask/InputDock.tsx` | 需新建 | - |
| 模式切換 | `components/ask/ModeTabs.tsx` | 需新建 | `flags.isEnabled()` |
| 解釋卡片 | `components/ask/ExplanationCard.tsx` | 需新建 | - |
| 概念標籤 | `components/ask/ConceptChips.tsx` | 需新建 | - |

**SDK 使用（完全相同）**：
```typescript
// Web 和 Mobile 使用相同的 SDK 方法
const solution = await plms.question.getSolution(questionId);
const explanation = await plms.question.generateSolution(questionId);
```

### Ready Score 頁面

| 功能 | Web 組件 | Mobile 組件 | SDK 方法 |
|------|----------|-------------|---------|
| 測驗頁面 | `app/(app)/ready-score/page.tsx` | `app/ready-score.tsx` | `plms.readyScore.*` |
| 題目卡片 | 需新建 | 需新建 | - |
| 答題介面 | 需新建 | 需新建 | - |
| 結果頁面 | 需新建 | 需新建 | - |
| 進度指示器 | 需新建 | 需新建 | - |

**SDK 使用（完全相同）**：
```typescript
// 生成測驗
const questions = await plms.readyScore.generateTest({
  subject: 'math',
  level: 'junior_high_1',
  questionCount: 10,
});

// 提交測驗
const result = await plms.readyScore.submitTest({
  userId: currentUser.id,
  subject: 'math',
  level: 'junior_high_1',
  answers: userAnswers,
  startedAt: startTime,
  completedAt: new Date().toISOString(),
});

// 計算等級（client-side helper，完全相同）
const level = plms.readyScore.calculateLevel(result.score);
```

### Error Book (錯題本) 頁面

| 功能 | Web 組件 | Mobile 組件 | SDK 方法 |
|------|----------|-------------|---------|
| 列表頁面 | 需新建 | `app/error-book.tsx` | `plms.errorBook.getErrors()` |
| 錯題卡片 | 需新建 | 需新建 | - |
| 詳情頁面 | 需新建 | 需新建 | `plms.errorBook.getError()` |
| 複習模式 | 需新建 | 需新建 | `plms.errorBook.startReviewSession()` |
| 統計頁面 | 需新建 | 需新建 | `plms.errorBook.getStats()` |

**SDK 使用（完全相同）**：
```typescript
// 獲取錯題列表
const errors = await plms.errorBook.getErrors({
  userId: currentUser.id,
  subject: 'math',
  isMastered: false,
  limit: 20,
});

// 標記為已掌握
await plms.errorBook.markAsMastered(errorId);

// 開始複習
const session = await plms.errorBook.startReviewSession({
  userId: currentUser.id,
  errorBookIds: selectedErrors.map(e => e.id),
});
```

### 拍題功能

| 功能 | Web 組件 | Mobile 組件 | SDK 方法 |
|------|----------|-------------|---------|
| 相機介面 | WebRTC (可選) | `expo-camera` | - |
| 上傳圖片 | `<input type="file">` | `expo-image-picker` | - |
| OCR 識別 | - | - | `plms.question.uploadImage()` |
| 題目提交 | - | - | `plms.question.submitQuestion()` |
| 解題顯示 | - | - | `plms.question.getSolution()` |

**SDK 使用（完全相同）**：
```typescript
// Web (使用 file input)
const file = event.target.files[0];
const base64 = await fileToBase64(file);

const extracted = await plms.question.uploadImage({
  userId: currentUser.id,
  imageData: base64,
  subject: 'math',
});

// Mobile (使用 expo-image-picker)
const result = await ImagePicker.launchCameraAsync({
  mediaTypes: ImagePicker.MediaTypeOptions.Images,
  base64: true,
});

const extracted = await plms.question.uploadImage({
  userId: currentUser.id,
  imageData: result.base64!,
  subject: 'math',
});

// 之後的流程完全相同
const question = await plms.question.submitQuestion({
  userId: currentUser.id,
  subject: extracted.suggestedSubject,
  questionType: 'multiple_choice',
  content: extracted.extractedText,
  source: {
    type: 'camera',
    imageUrl: uploadedImageUrl,
  },
});
```

---

## 🎨 樣式遷移

### Tailwind CSS → React Native StyleSheet

#### 布局

| Tailwind (Web) | StyleSheet (Mobile) |
|----------------|---------------------|
| `flex` | `display: 'flex'` |
| `flex-col` | `flexDirection: 'column'` |
| `flex-row` | `flexDirection: 'row'` |
| `justify-center` | `justifyContent: 'center'` |
| `items-center` | `alignItems: 'center'` |
| `gap-4` | `gap: 16` (需轉換為數字) |
| `p-4` | `padding: 16` |
| `px-4` | `paddingHorizontal: 16` |
| `py-4` | `paddingVertical: 16` |
| `m-4` | `margin: 16` |
| `mx-auto` | `marginHorizontal: 'auto'` |

#### 文字

| Tailwind (Web) | StyleSheet (Mobile) |
|----------------|---------------------|
| `text-lg` | `fontSize: 18` |
| `text-xl` | `fontSize: 20` |
| `text-2xl` | `fontSize: 24` |
| `font-bold` | `fontWeight: 'bold'` |
| `text-center` | `textAlign: 'center'` |
| `text-gray-600` | `color: '#718096'` |

#### 背景與邊框

| Tailwind (Web) | StyleSheet (Mobile) |
|----------------|---------------------|
| `bg-white` | `backgroundColor: '#fff'` |
| `rounded-lg` | `borderRadius: 8` |
| `border` | `borderWidth: 1` |
| `border-gray-300` | `borderColor: '#D1D5DB'` |
| `shadow-md` | `shadowColor`, `shadowOpacity`, `shadowRadius`, `elevation` |

#### 範例對照

**Web (Tailwind)**:
```tsx
<div className="flex flex-col items-center p-4 bg-white rounded-lg shadow-md">
  <h1 className="text-2xl font-bold text-gray-900">Title</h1>
  <p className="text-base text-gray-600">Description</p>
</div>
```

**Mobile (StyleSheet)**:
```tsx
<View style={styles.container}>
  <Text style={styles.title}>Title</Text>
  <Text style={styles.description}>Description</Text>
</View>

const styles = StyleSheet.create({
  container: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#fff',
    borderRadius: 8,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#111827',
  },
  description: {
    fontSize: 16,
    color: '#4B5563',
  },
});
```

---

## 🔧 工具函式對照

### Storage

| 功能 | Web | Mobile |
|------|-----|--------|
| 儲存資料 | `localStorage.setItem()` | `AsyncStorage.setItem()` |
| 讀取資料 | `localStorage.getItem()` | `AsyncStorage.getItem()` |
| 安全儲存 | 不支援 | `expo-secure-store` |

### Navigation

| 功能 | Web (Next.js) | Mobile (Expo Router) |
|------|---------------|----------------------|
| 導航 | `router.push('/path')` | `router.push('/path')` |
| 返回 | `router.back()` | `router.back()` |
| 替換 | `router.replace('/path')` | `router.replace('/path')` |
| 取得參數 | `useSearchParams()` | `useLocalSearchParams()` |

### Platform-Specific

| 功能 | Web | Mobile |
|------|-----|--------|
| 檢測平台 | `typeof window !== 'undefined'` | `Platform.OS === 'ios'` |
| 取得裝置資訊 | `navigator.userAgent` | `expo-device` |
| 推播通知 | Web Push API | `expo-notifications` |
| 分享 | Web Share API | `expo-sharing` |

---

## 📋 遷移 Checklist

### 從 Web 遷移到 Mobile

- [ ] **邏輯層**
  - [ ] 確認已使用 `@plms/shared/sdk`，不直接呼叫 API
  - [ ] 確認已使用 `@plms/shared/types` 定義型別
  - [ ] 業務邏輯已在 SDK 中實作

- [ ] **UI 組件**
  - [ ] 將 HTML 元素改為 React Native 組件 (`div` → `View`, `p` → `Text`)
  - [ ] 將 Tailwind classes 改為 StyleSheet
  - [ ] 替換 Shadcn/ui 組件為 React Native 等價組件
  - [ ] 處理 Mobile 特有的互動（觸控、手勢等）

- [ ] **導航**
  - [ ] 使用 Expo Router 替換 Next.js routing
  - [ ] 處理頁面間參數傳遞
  - [ ] 設定 tab navigation / stack navigation

- [ ] **資料獲取**
  - [ ] SDK 呼叫方式相同，無需修改
  - [ ] 考慮使用 TanStack Query 做快取（Web/Mobile 相同）

- [ ] **功能適配**
  - [ ] 相機功能：使用 `expo-camera`
  - [ ] 圖片選擇：使用 `expo-image-picker`
  - [ ] 儲存：使用 `AsyncStorage` 或 `expo-secure-store`
  - [ ] Feature Flags：確認 platform = 'mobile'

- [ ] **測試**
  - [ ] iOS 測試
  - [ ] Android 測試
  - [ ] 效能測試

### 從 Mobile 遷移到 Web

- [ ] **UI 組件**
  - [ ] 將 React Native 組件改為 HTML 元素
  - [ ] 使用 Tailwind CSS 或 Shadcn/ui
  - [ ] 處理 Web 特有的互動（滑鼠懸停、鍵盤導航）

- [ ] **導航**
  - [ ] 使用 Next.js App Router
  - [ ] 處理 URL query parameters

- [ ] **功能適配**
  - [ ] 相機功能：使用 WebRTC 或檔案上傳
  - [ ] 儲存：使用 `localStorage`
  - [ ] Feature Flags：確認 platform = 'web'

- [ ] **測試**
  - [ ] 不同瀏覽器測試
  - [ ] 響應式設計測試

---

## ✅ 最佳實踐

### 1. 共用邏輯，分離 UI
```typescript
// ✅ 正確：邏輯在 SDK
const result = await plms.readyScore.calculateLevel(score);

// Web UI
<div className="text-2xl font-bold">{result}</div>

// Mobile UI
<Text style={styles.title}>{result}</Text>
```

### 2. 使用統一的 Feature Flags
```typescript
// Web 和 Mobile 使用相同的 flag 檢查
const flags = createFeatureFlags(platform); // 'web' or 'mobile'

if (flags.isEnabled('ready_score_v2')) {
  // 顯示功能
}
```

### 3. Platform-Specific 組件
```typescript
// 使用條件渲染處理平台差異
{Platform.OS === 'ios' && <IOSSpecificComponent />}
{Platform.OS === 'android' && <AndroidSpecificComponent />}
```

### 4. 共用樣式邏輯
```typescript
// 使用共用的設計 tokens
const colors = {
  primary: '#3B82F6',
  secondary: '#10B981',
  // ...
};

// Web: Tailwind config
module.exports = {
  theme: {
    extend: {
      colors: colors,
    },
  },
};

// Mobile: StyleSheet
const styles = StyleSheet.create({
  primary: {
    color: colors.primary,
  },
});
```

---

## 🤝 需要幫助？

- 📖 **SDK 文檔**: 查看 `README_SDK.md`
- 📝 **開發流程**: 查看 `CONTRIBUTING.md`
- 💬 **問題回報**: 使用 GitHub Issues

---

**Happy Coding! 🚀**
