# 🚀 PLMS - AI 學習輔助平台

> **基於 PLMS Agent System 的跨平台教育應用**

一個現代化的 AI 驅動學習平台，支援 Web、Mobile 和 Desktop（未來），採用 Turborepo Monorepo 架構，實現**單一後端、共用 SDK、多前端殼**的設計理念。

---

## ✨ 核心特色

### 🎯 跨平台統一體驗
- **Web** (Next.js) - 功能完整的網頁應用
- **Mobile** (Expo/React Native) - iOS + Android 原生體驗
- **Desktop** (Electron) - 未來支援

### 🧠 智能 AI 輔助
- **Ready Score 測試** - 快速評估學習程度
- **拍題即解** - 相機拍攝，即時解答
- **錯題本** - 自動整理，智能複習
- **詳解卡** - 結構化知識呈現

### 🏗️ 現代化架構
- **Turborepo Monorepo** - 統一管理多專案
- **共用 SDK** - 所有業務邏輯集中在 `@plms/shared`
- **型別安全** - Zod + TypeScript 全覆蓋
- **Feature Flags** - 灰度發布、平台控制

---

## 🚀 快速開始

### 安裝依賴

```bash
# 使用 pnpm（推薦）
pnpm install

# 或使用 npm
npm install
```

### 啟動開發環境

```bash
# 啟動所有專案 (Web + Mobile + Shared)
pnpm dev

# 只啟動 Web
pnpm dev:web

# 只啟動 Mobile
pnpm dev:mobile

# 只 build Shared SDK
pnpm dev:shared
```

### 訪問應用

- **Web**: http://localhost:3000
- **Mobile**: 使用 Expo Go 掃描 QR code

---

## 📁 專案結構

```
plms/
├── apps/
│   ├── web/                    # Next.js Web App
│   │   ├── app/api/           # ✅ 29 個 API 端點（後端）
│   │   ├── app/(app)/         # ✅ 前端頁面
│   │   ├── components/        # ✅ React 組件
│   │   └── lib/               # ✅ Web 工具函式
│   │
│   └── mobile/                 # Expo React Native App
│       ├── app/               # ✅ Expo Router 頁面
│       │   ├── index.tsx      # ✅ 首頁（示範 SDK 使用）
│       │   ├── ready-score.tsx # ✅ Ready Score 測驗
│       │   ├── error-book.tsx  # ✅ 錯題本
│       │   └── question.tsx    # ✅ 拍題功能
│       └── app.json           # ✅ Expo 配置
│
├── packages/
│   └── shared/                 # ✅ 共用 SDK Package
│       ├── types/             # ✅ Zod Schemas + TS Types (36 schemas)
│       ├── sdk/               # ✅ API Client + 業務邏輯 (37 methods)
│       ├── config/            # ✅ Feature Flags (14 flags)
│       ├── analytics/         # ✅ Analytics 介面 (20+ events)
│       └── utils/             # ✅ 工具函式
│
└── 📄 Documentation
    ├── README_SDK.md          # ✅ SDK 使用文檔（完整）
    ├── CONTRIBUTING.md        # ✅ 開發流程規範
    ├── MIGRATION_MAP.md       # ✅ Web/Mobile 組件對照
    └── ARCHITECTURE_REPORT.md # ✅ 架構報告
```

---

## 🛠️ 技術棧

### 前端
- **Web**: Next.js 14, React 18, TypeScript, Tailwind CSS, Shadcn/ui
- **Mobile**: Expo ~50, React Native 0.73, Expo Router, TypeScript

### 後端
- **Runtime**: Next.js API Routes (Serverless)
- **Database**: Supabase (PostgreSQL + RLS)
- **AI**: OpenAI GPT-5 Flow

### 共用
- **SDK**: TypeScript + Zod + tsup
- **Monorepo**: Turborepo + pnpm workspaces
- **型別**: Zod schemas (36 個)
- **Feature Flags**: 14 個可配置 flags
- **Analytics**: 統一追蹤介面

---

## 📚 核心 SDK 使用

### 初始化

```typescript
import { createPLMSClient } from '@plms/shared/sdk';

const plms = createPLMSClient({
  baseUrl: 'https://api.plms.com',
  platform: 'mobile', // or 'web' | 'desktop'
});

// 設定 token provider
plms.setTokenProvider(async () => {
  return await getStoredToken();
});
```

### Ready Score 測試

```typescript
// 生成測驗
const questions = await plms.readyScore.generateTest({
  subject: 'math',
  level: 'junior_high_1',
  questionCount: 10,
});

// 提交測驗
const result = await plms.readyScore.submitTest({
  userId: 'user-123',
  subject: 'math',
  level: 'junior_high_1',
  answers: [
    { questionId: 'q1', userAnswer: 'A', timeSpentSeconds: 30 },
  ],
  startedAt: '2025-10-25T10:00:00Z',
  completedAt: '2025-10-25T10:15:00Z',
});

console.log(`Score: ${result.score}, Level: ${result.readyLevel}`);
```

### 錯題本

```typescript
// 新增錯題
const error = await plms.errorBook.addError({
  userId: 'user-123',
  questionId: 'q-456',
  subject: 'math',
  category: 'calculation',
  userAnswer: '42',
  correctAnswer: '43',
  difficulty: 'medium',
});

// 獲取錯題列表
const errors = await plms.errorBook.getErrors({
  userId: 'user-123',
  subject: 'math',
  isMastered: false,
});

// 標記為已掌握
await plms.errorBook.markAsMastered(error.id);
```

### 拍題解題

```typescript
// 上傳圖片（OCR）
const extracted = await plms.question.uploadImage({
  userId: 'user-123',
  imageData: base64Image,
  subject: 'math',
});

// 提交題目
const question = await plms.question.submitQuestion({
  userId: 'user-123',
  subject: extracted.suggestedSubject,
  questionType: 'multiple_choice',
  content: extracted.extractedText,
  source: { type: 'camera', imageUrl: uploadedUrl },
});

// 取得解答
const solution = await plms.question.getSolution(question.id);
```

> 📖 **完整 SDK 文檔**: 查看 [README_SDK.md](README_SDK.md)

---

## 🎛️ Feature Flags

```typescript
import { createFeatureFlags } from '@plms/shared/config';

const flags = createFeatureFlags('mobile');

// 檢查功能是否啟用
if (flags.isEnabled('ready_score_v2')) {
  // 顯示 Ready Score v2
}

if (flags.isEnabled('question_camera')) {
  // 顯示相機按鈕（僅 mobile）
}
```

### 可用 Flags

| Flag | Platforms | Default | 說明 |
|------|-----------|---------|------|
| `ready_score_v2` | web, mobile | ✅ | Ready Score 測試 v2 |
| `error_book` | all | ✅ | 錯題本功能 |
| `question_camera` | mobile | ✅ | 相機拍題 |
| `ai_tutor` | all | ❌ | AI 導師（10% 灰度） |
| `parent_dashboard` | web | ❌ | 家長儀表板 |
| `gamification` | all | ✅ | 遊戲化功能 |

> 查看所有 14 個 Feature Flags: [README_SDK.md](README_SDK.md#feature-flags)

---

## 📊 Analytics

```typescript
import { createAnalytics } from '@plms/shared/analytics';

const analytics = createAnalytics();
analytics.setUserId('user-123');

// 追蹤事件
analytics.track('ready_score_completed', {
  score: 85,
  level: 'advanced',
  subject: 'math',
});

analytics.track('error_added', {
  subject: 'math',
  category: 'calculation',
});
```

### 預定義事件

- **User**: `user_login`, `user_register`, `profile_updated`
- **Question**: `question_captured`, `question_submitted`, `solution_viewed`
- **Ready Score**: `ready_score_started`, `ready_score_completed`
- **Error Book**: `error_added`, `error_reviewed`, `error_mastered`
- **Engagement**: `session_started`, `feature_discovered`

> 共 20+ 個預定義事件，查看 [README_SDK.md](README_SDK.md#analytics)

---

## 🔧 開發指令

```bash
# 開發
pnpm dev              # 啟動所有專案
pnpm dev:web          # 只啟動 Web
pnpm dev:mobile       # 只啟動 Mobile
pnpm dev:shared       # 只 build Shared SDK

# 建置
pnpm build            # 建置所有專案
pnpm build:shared     # 只建置 Shared SDK

# 檢查
pnpm type-check       # TypeScript 型別檢查
pnpm lint             # ESLint 檢查
pnpm format           # Prettier 格式化

# 清理
pnpm clean            # 清理所有建置產物
```

---

## 📖 文檔

| 文檔 | 說明 |
|------|------|
| [README_SDK.md](README_SDK.md) | SDK 使用文檔（完整） |
| [CONTRIBUTING.md](CONTRIBUTING.md) | 開發流程規範 |
| [MIGRATION_MAP.md](MIGRATION_MAP.md) | Web/Mobile 組件對照 |
| [ARCHITECTURE_REPORT.md](ARCHITECTURE_REPORT.md) | 架構報告 |
| [CLEANUP_REPORT.md](CLEANUP_REPORT.md) | iOS 清理報告 |

---

## 🎯 開發新功能流程

### 1️⃣ 後端 API 實作
```typescript
// apps/web/app/api/your-feature/route.ts
export async function POST(req: NextRequest) {
  const response: ApiResponse<YourFeature> = {
    success: true,
    data: { /* your data */ },
    timestamp: new Date().toISOString(),
  };
  return NextResponse.json(response);
}
```

### 2️⃣ shared/types 定義型別
```typescript
// packages/shared/types/your-feature.ts
export const YourFeatureSchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
});

export type YourFeature = z.infer<typeof YourFeatureSchema>;
```

### 3️⃣ shared/sdk 建立業務邏輯
```typescript
// packages/shared/sdk/your-feature.ts
export class YourFeatureSDK {
  constructor(private client: BaseClient) {}

  async get(id: string): Promise<YourFeature> {
    return this.client.get(`/api/your-feature/${id}`);
  }
}
```

### 4️⃣ 前端呼叫 SDK
```typescript
// Web or Mobile
const result = await plms.yourFeature.get('123');
```

> 📝 **完整開發流程**: 查看 [CONTRIBUTING.md](CONTRIBUTING.md)

---

## 🚀 接下來的開發重點

### Phase 1: Ready Score 小測試 (2-3 weeks)
- [ ] 後端 API 實作
- [ ] 測驗界面 UI（Web + Mobile）
- [ ] 結果分析頁面
- [ ] 歷史記錄查詢

### Phase 2: 拍題→解題→詳解卡 (3-4 weeks)
- [ ] 相機拍攝功能（Mobile）
- [ ] OCR 文字識別
- [ ] 題目解析引擎
- [ ] 詳解卡 UI 設計

### Phase 3: 錯題本 (2-3 weeks)
- [ ] 錯題自動整理
- [ ] 複習模式
- [ ] 統計分析
- [ ] 智能推薦

### Phase 4: 家長週報與任務追蹤 (2-3 weeks)
- [ ] 學習數據統計
- [ ] 週報生成系統
- [ ] 任務系統設計
- [ ] 家長端界面

---

## 🤝 貢獻指南

我們歡迎所有形式的貢獻！請遵循以下步驟：

1. **閱讀文檔**
   - [CONTRIBUTING.md](CONTRIBUTING.md) - 開發流程規範
   - [README_SDK.md](README_SDK.md) - SDK 使用方式

2. **開發新功能**
   - 必須遵循「後端→types→SDK→前端」流程
   - 所有業務邏輯只寫在 `packages/shared/sdk`
   - 禁止直接呼叫 API，必須透過 SDK

3. **提交 Pull Request**
   - 確保通過 `pnpm type-check` 和 `pnpm lint`
   - 提供清晰的 commit message
   - 描述變更內容和影響範圍

---

## 📄 授權

MIT License

---

## 🙏 致謝

- **OpenAI** - 提供強大的 AI 能力
- **Supabase** - 提供完整的後端服務
- **Next.js Team** - 提供優秀的 React 框架
- **Expo Team** - 提供跨平台 React Native 解決方案
- **Vercel** - 提供 Turborepo monorepo 工具

---

## 📞 支援

- **文檔**: 查看 `docs/` 目錄
- **問題回報**: 使用 GitHub Issues
- **功能請求**: 使用 GitHub Discussions

---

**🎉 讓每個學生都感覺自己是天才！**

**Built with ❤️ using Turborepo + Next.js + Expo**
