# @plms/shared SDK

PLMS 跨平台共用 SDK，支援 Web、Mobile 和 Desktop。

## 🚀 快速開始

### 安裝

```bash
pnpm add @plms/shared
```

### 初始化 SDK

```typescript
import { createPLMSClient } from '@plms/shared/sdk';

const plms = createPLMSClient({
  baseUrl: 'http://localhost:3000',
  platform: 'web', // or 'mobile' | 'desktop'
});
```

## 📚 可用 API

### Authentication

```typescript
// 登入
const { user, token } = await plms.auth.login('email@example.com', 'password');

// 註冊
const { user, token } = await plms.auth.register('email@example.com', 'password', 'Name');

// 取得當前使用者
const user = await plms.auth.getCurrentUser();
```

### Ready Score

```typescript
// 提交測驗
const result = await plms.readyScore.submitTest({
  answers: [/* answers */],
});

// 計算等級 (client-side helper)
const level = plms.readyScore.calculateLevel(88); // 'A'
```

### Questions

```typescript
// 取得題目
const question = await plms.question.getQuestion('question-id');

// 搜尋題目
const questions = await plms.question.searchQuestions('keyword');
```

### Error Book

```typescript
// 取得錯題列表
const errors = await plms.errorBook.getErrors();

// 新增錯題
const error = await plms.errorBook.addError({
  questionId: 'q-123',
  cause: 'calculation error',
  mastered: false,
});
```

## 🎛️ Feature Flags

```typescript
import { getFlag } from '@plms/shared/config/flags';

if (getFlag('ready_score_v2')) {
  // 顯示 Ready Score v2
}
```

### 可用 Flags

- `auth_enabled`: 啟用驗證系統 (預設: true)
- `ready_score_v2`: Ready Score v2 (預設: true)
- `error_book`: 錯題本功能 (預設: true)
- `question_camera`: 相機拍題 (預設: true)
- `ai_tutor`: AI 導師 (預設: false)
- `parent_dashboard`: 家長儀表板 (預設: false)

## 📊 Analytics

```typescript
import { track } from '@plms/shared/analytics';

track('login', { userId: 'user-123' });
track('submit_ready_score', { score: 88 });
track('add_error', { questionId: 'q-123' });
```

## 🧩 Utils

```typescript
import { formatDate, isEmail, capitalize } from '@plms/shared/utils';

formatDate('2025-10-25T10:00:00Z'); // '2025/10/25 上午10:00:00'
isEmail('test@example.com'); // true
capitalize('hello'); // 'Hello'
```

## 📦 Types

所有型別都使用 Zod schemas 定義，提供完整的型別安全：

```typescript
import { User, Question, ReadyScoreResult, ErrorItem } from '@plms/shared/types';
```

## 🏗️ 建置

```bash
# 開發模式（watch）
pnpm dev

# 建置
pnpm build

# 型別檢查
pnpm typecheck
```

## ✅ 使用範例

### Web (Next.js)

```typescript
// app/providers.tsx
import { createPLMSClient } from '@plms/shared/sdk';

export const plms = createPLMSClient({
  baseUrl: process.env.NEXT_PUBLIC_API_URL!,
  platform: 'web',
});
```

### Mobile (Expo)

```typescript
// app/index.tsx
import { createPLMSClient } from '@plms/shared/sdk';

const plms = createPLMSClient({
  baseUrl: process.env.EXPO_PUBLIC_API_URL!,
  platform: 'mobile',
});
```

## 📖 更多文檔

查看主專案的 [README_SDK.md](../../README_SDK.md) 以獲取完整文檔。
