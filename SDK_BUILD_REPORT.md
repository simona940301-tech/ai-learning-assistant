# 📦 PLMS Shared SDK 建置報告

執行日期: 2025-10-25

---

## ✅ 執行摘要

已成功建立完整的 `@plms/shared` SDK package，作為 PLMS 跨平台專案的**唯一邏輯來源**。

---

## 📁 建立的檔案結構

```
packages/shared/
├── 📄 package.json                 ✅ Package 配置
├── 📄 tsconfig.json                ✅ TypeScript 配置
├── 📄 index.ts                     ✅ 主入口檔案
├── 📄 README_SDK.md                ✅ SDK 使用文檔
├── 📄 test-sdk.ts                  ✅ 測試腳本
│
├── 📁 types/                       ✅ Zod Schemas + TypeScript Types
│   ├── index.ts                    (匯出所有型別)
│   ├── user.ts                     UserSchema
│   ├── question.ts                 QuestionSchema
│   ├── readyScore.ts               ReadyScoreResultSchema
│   └── errorBook.ts                ErrorItemSchema
│
├── 📁 sdk/                         ✅ API Clients + 業務邏輯
│   ├── baseClient.ts               BaseClient (統一 HTTP client)
│   ├── auth.ts                     createAuthAPI (3 methods)
│   ├── readyScore.ts               createReadyScoreAPI (2 methods)
│   ├── question.ts                 createQuestionAPI (2 methods)
│   ├── errorBook.ts                createErrorBookAPI (2 methods)
│   └── index.ts                    createPLMSClient (主入口)
│
├── 📁 config/                      ✅ Feature Flags & Remote Config
│   ├── flags.ts                    featureFlags + getFlag()
│   └── remoteConfig.ts             remoteConfig (apiBase, version, platform)
│
├── 📁 analytics/                   ✅ Analytics 追蹤
│   └── index.ts                    track() 函式
│
└── 📁 utils/                       ✅ 工具函式
    ├── index.ts                    (匯出所有 utils)
    ├── date.ts                     formatDate()
    ├── validation.ts               isEmail()
    └── string.ts                   capitalize()
```

**總計**: 20 個檔案

---

## 📊 可用方法清單

### 🔐 Authentication (3 methods)
- `plms.auth.login(email, password)` - 登入
- `plms.auth.register(email, password, name)` - 註冊
- `plms.auth.getCurrentUser()` - 取得當前使用者

### 📝 Ready Score (2 methods)
- `plms.readyScore.submitTest(answers)` - 提交測驗
- `plms.readyScore.calculateLevel(score)` - 計算等級 (client-side helper)

### 📚 Questions (2 methods)
- `plms.question.getQuestion(id)` - 取得題目
- `plms.question.searchQuestions(keyword)` - 搜尋題目

### 📖 Error Book (2 methods)
- `plms.errorBook.getErrors()` - 取得錯題列表
- `plms.errorBook.addError(item)` - 新增錯題

### 🎛️ Feature Flags (6 flags)
- `auth_enabled` ✅ (預設啟用)
- `ready_score_v2` ✅ (預設啟用)
- `error_book` ✅ (預設啟用)
- `question_camera` ✅ (預設啟用)
- `ai_tutor` ❌ (預設關閉)
- `parent_dashboard` ❌ (預設關閉)

### 📊 Analytics (6 events)
- `login` - 登入事件
- `logout` - 登出事件
- `submit_ready_score` - 提交測驗
- `view_question` - 查看題目
- `add_error` - 新增錯題
- `review_complete` - 完成複習

### 🧩 Utils (3 functions)
- `formatDate(iso)` - 格式化日期
- `isEmail(value)` - 驗證 Email
- `capitalize(text)` - 首字母大寫

**總計可用方法**: 9 個 API 方法 + 1 個 client-side helper + 6 個 flags + 6 個 events + 3 個 utils = **25 個功能**

---

## 🎯 型別定義 (4 Zod Schemas)

### User
```typescript
{
  id: string;
  email: string;
  name: string;
  role: 'student' | 'parent' | 'teacher';
  createdAt: string;
}
```

### Question
```typescript
{
  id: string;
  subject: string;
  stem: string;
  choices: string[];
  answer: string;
  explanation?: string;
}
```

### ReadyScoreResult
```typescript
{
  id: string;
  score: number;
  level: 'A' | 'B' | 'C';
  createdAt: string;
}
```

### ErrorItem
```typescript
{
  id: string;
  questionId: string;
  cause: string;
  mastered: boolean;
  createdAt: string;
}
```

---

## 🚀 使用方式

### 初始化 SDK

```typescript
import { createPLMSClient } from '@plms/shared/sdk';

const plms = createPLMSClient({
  baseUrl: 'http://localhost:3000',
  platform: 'web', // or 'mobile' | 'desktop'
});
```

### 呼叫 API

```typescript
// 登入
const { user, token } = await plms.auth.login('email@example.com', 'password');

// 計算等級 (不需呼叫 API)
const level = plms.readyScore.calculateLevel(88); // 'A'

// 取得題目
const question = await plms.question.getQuestion('question-id');
```

### 使用 Feature Flags

```typescript
import { getFlag } from '@plms/shared/config/flags';

if (getFlag('ready_score_v2')) {
  // 顯示 Ready Score v2 功能
}
```

### 追蹤事件

```typescript
import { track } from '@plms/shared/analytics';

track('submit_ready_score', { score: 88, level: 'A' });
```

### 使用工具函式

```typescript
import { formatDate, isEmail, capitalize } from '@plms/shared/utils';

formatDate('2025-10-25T10:00:00Z'); // '2025/10/25 上午10:00:00'
isEmail('test@example.com'); // true
capitalize('hello'); // 'Hello'
```

---

## ✅ 建置與測試

### 建置指令

```bash
# 建置 shared package
pnpm build:shared

# 或在 packages/shared 目錄下
cd packages/shared
pnpm build
```

### 測試指令

```bash
# 執行測試腳本
cd packages/shared
npx tsx test-sdk.ts
```

### 預期輸出

```
🧪 測試 SDK 初始化...
✅ SDK 初始化成功
可用方法: [ 'auth', 'readyScore', 'question', 'errorBook' ]

🧪 測試 Ready Score calculateLevel...
Score 88 → Level: A

🧪 測試 Feature Flags...
ready_score_v2: true
ai_tutor: false

🧪 測試 Analytics...
[Analytics] login { userId: 'test-123' }

🧪 測試 Utils...
formatDate: 2025/10/25 上午10:00:00
isEmail: true
capitalize: Hello world

✅ 所有測試通過！
```

---

## 🔗 在 Web 與 Mobile 中使用

### Web (Next.js)

```typescript
// apps/web/lib/plms-client.ts
import { createPLMSClient } from '@plms/shared/sdk';

export const plms = createPLMSClient({
  baseUrl: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000',
  platform: 'web',
});
```

```typescript
// apps/web/app/page.tsx
import { plms } from '@/lib/plms-client';

export default async function HomePage() {
  const level = plms.readyScore.calculateLevel(88);
  return <div>Level: {level}</div>;
}
```

### Mobile (Expo)

```typescript
// apps/mobile/app/index.tsx
import { createPLMSClient } from '@plms/shared/sdk';

const plms = createPLMSClient({
  baseUrl: process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3000',
  platform: 'mobile',
});

export default function HomeScreen() {
  const level = plms.readyScore.calculateLevel(88);
  return <Text>Level: {level}</Text>;
}
```

---

## 📋 驗收確認

✅ **目錄結構建立完成** - 20 個檔案
✅ **Types 層完成** - 4 個 Zod schemas
✅ **SDK 層完成** - 9 個 API 方法 + 1 個 helper
✅ **Config 層完成** - 6 個 feature flags + remote config
✅ **Analytics 層完成** - 6 個事件追蹤
✅ **Utils 層完成** - 3 個工具函式
✅ **package.json 配置** - 包含 build、dev、lint 腳本
✅ **tsconfig.json 配置** - TypeScript 設定完成
✅ **README_SDK.md 文檔** - 使用說明完成
✅ **測試腳本建立** - test-sdk.ts 驗證功能

---

## 🎯 下一步

### 1. 安裝依賴並建置

```bash
# 在專案根目錄
pnpm install

# 建置 shared package
pnpm build:shared
```

### 2. 測試 SDK

```bash
cd packages/shared
npx tsx test-sdk.ts
```

### 3. 在 Web/Mobile 中使用

參考上方「在 Web 與 Mobile 中使用」章節。

### 4. 開發新功能

當需要新增功能時：
1. 在 `types/` 新增 Zod schema
2. 在 `sdk/` 新增 API 方法
3. 在 `index.ts` 匯出
4. Web 與 Mobile 直接使用，無需重複實作

---

## 🌟 核心優勢

### ✅ 單一真相來源
所有業務邏輯只在 `@plms/shared` 定義一次，Web 和 Mobile 共用。

### ✅ 型別安全
使用 Zod schemas 確保型別正確性，編譯時期就能發現錯誤。

### ✅ 易於維護
修改 SDK 一次，所有平台同步更新，無需重複修改。

### ✅ 開發效率
前端開發者只需呼叫 SDK 方法，不需關心 API 細節。

### ✅ 測試容易
集中測試 SDK，確保所有平台行為一致。

---

## 📞 後續支援

- **SDK 文檔**: [packages/shared/README_SDK.md](packages/shared/README_SDK.md)
- **主文檔**: [README_SDK.md](README_SDK.md)
- **開發規範**: [CONTRIBUTING.md](CONTRIBUTING.md)

---

**建置完成！可以開始使用 @plms/shared SDK 了！** 🎉

**日期**: 2025-10-25
**狀態**: ✅ 建置完成，可立即使用
