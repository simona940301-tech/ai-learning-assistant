# Contributing to PLMS

歡迎貢獻 PLMS 專案！本文檔說明開發新功能的標準流程。

---

## 🎯 核心原則

### 單一真相來源 (Single Source of Truth)
- **所有業務邏輯只定義一次**，存放在 `packages/shared/sdk`
- **所有型別只定義一次**，存放在 `packages/shared/types`
- **前端應用禁止直接呼叫 API**，必須透過 SDK
- **任何資料流邏輯不可重複實作**

### 開發流程（必須遵守）
```
後端 API 實作 → shared/types 定義型別 → shared/sdk 建立邏輯 → 前端呼叫 SDK
```

---

## 🚀 開發新功能流程

### Step 1: 後端 API 實作

在 `apps/web/app/api/` 創建 API 端點：

```typescript
// apps/web/app/api/your-feature/route.ts
import { NextRequest, NextResponse } from 'next/server';
import type { ApiResponse, YourFeature } from '@plms/shared/types';

export async function POST(req: NextRequest) {
  try {
    const data = await req.json();

    // Implement your logic
    const result: YourFeature = {
      id: '123',
      name: data.name,
      // ...
    };

    const response: ApiResponse<YourFeature> = {
      success: true,
      data: result,
      timestamp: new Date().toISOString(),
    };

    return NextResponse.json(response);
  } catch (error) {
    const response: ApiResponse<never> = {
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      timestamp: new Date().toISOString(),
    };

    return NextResponse.json(response, { status: 500 });
  }
}
```

**注意事項**：
- ✅ 必須使用 `ApiResponse<T>` 包裝回傳
- ✅ 成功回傳：`{ success: true, data: T, timestamp }`
- ✅ 失敗回傳：`{ success: false, error: {...}, timestamp }`
- ❌ 不可直接回傳資料物件

---

### Step 2: shared/types 定義型別

在 `packages/shared/types/` 創建 Zod schema：

```typescript
// packages/shared/types/your-feature.ts
import { z } from 'zod';

/**
 * Your Feature schema
 */
export const YourFeatureSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1),
  description: z.string().optional(),
  status: z.enum(['active', 'inactive']).default('active'),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

export type YourFeature = z.infer<typeof YourFeatureSchema>;

/**
 * Request/Response types
 */
export const CreateYourFeatureSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
});

export type CreateYourFeature = z.infer<typeof CreateYourFeatureSchema>;
```

**匯出型別**：

```typescript
// packages/shared/types/index.ts
export * from './your-feature';
```

**最佳實踐**：
- ✅ 使用 Zod schema 定義所有型別
- ✅ 提供完整的 JSDoc 註解
- ✅ 區分 Request/Response 型別
- ✅ 使用 `z.infer` 生成 TypeScript 型別
- ❌ 不要直接寫 `interface` 或 `type`

---

### Step 3: shared/sdk 建立業務邏輯

在 `packages/shared/sdk/` 創建 SDK 模組：

```typescript
// packages/shared/sdk/your-feature.ts
import type { BaseClient } from './base-client';
import type { YourFeature, CreateYourFeature } from '../types';

/**
 * Your Feature SDK
 *
 * Handles your feature operations:
 * - Create feature
 * - Get feature
 * - Update feature
 * - Delete feature
 */
export class YourFeatureSDK {
  constructor(private client: BaseClient) {}

  /**
   * Create new feature
   */
  async create(data: CreateYourFeature): Promise<YourFeature> {
    return this.client.post<YourFeature>('/api/your-feature', data);
  }

  /**
   * Get feature by ID
   */
  async get(id: string): Promise<YourFeature> {
    return this.client.get<YourFeature>(`/api/your-feature/${id}`);
  }

  /**
   * List features
   */
  async list(params: {
    status?: 'active' | 'inactive';
    limit?: number;
    offset?: number;
  }): Promise<YourFeature[]> {
    return this.client.get<YourFeature[]>('/api/your-feature', params);
  }

  /**
   * Update feature
   */
  async update(id: string, data: Partial<CreateYourFeature>): Promise<YourFeature> {
    return this.client.put<YourFeature>(`/api/your-feature/${id}`, data);
  }

  /**
   * Delete feature
   */
  async delete(id: string): Promise<{ success: boolean }> {
    return this.client.delete(`/api/your-feature/${id}`);
  }

  /**
   * Client-side helper: Validate feature name
   */
  validateName(name: string): boolean {
    return name.length >= 3 && name.length <= 50;
  }
}
```

**整合到主 SDK**：

```typescript
// packages/shared/sdk/index.ts
import { YourFeatureSDK } from './your-feature';

export class PLMSClient {
  public readonly yourFeature: YourFeatureSDK;

  constructor(config: SDKConfig) {
    // ...existing code...
    this.yourFeature = new YourFeatureSDK(this.baseClient);
  }
}

// Export the module
export { YourFeatureSDK } from './your-feature';
```

**最佳實踐**：
- ✅ 所有 API 呼叫都透過 `this.client.get/post/put/delete`
- ✅ 提供完整的 JSDoc 註解
- ✅ 區分「API 呼叫」與「Client-side helper」
- ✅ Client-side helper 用於計算、驗證等不需呼叫 API 的邏輯
- ❌ 禁止在 SDK 中使用 `fetch` 或 `axios`

---

### Step 4: 前端呼叫 SDK

#### Web (Next.js)

```typescript
// apps/web/app/your-feature/page.tsx
'use client';

import { useState } from 'react';
import { plmsClient } from '@/lib/plms-client';
import type { YourFeature } from '@plms/shared/types';

export default function YourFeaturePage() {
  const [features, setFeatures] = useState<YourFeature[]>([]);
  const [loading, setLoading] = useState(false);

  const loadFeatures = async () => {
    setLoading(true);
    try {
      const result = await plmsClient.yourFeature.list({
        status: 'active',
        limit: 10,
      });
      setFeatures(result);
    } catch (error) {
      console.error('Failed to load features:', error);
    } finally {
      setLoading(false);
    }
  };

  const createFeature = async (name: string) => {
    try {
      const newFeature = await plmsClient.yourFeature.create({ name });
      setFeatures([...features, newFeature]);
    } catch (error) {
      console.error('Failed to create feature:', error);
    }
  };

  return (
    <div>
      <h1>Your Features</h1>
      {/* UI code */}
    </div>
  );
}
```

#### Mobile (Expo)

```typescript
// apps/mobile/app/your-feature.tsx
import { useState } from 'react';
import { View, Text, Button } from 'react-native';
import { createPLMSClient } from '@plms/shared/sdk';
import type { YourFeature } from '@plms/shared/types';

export default function YourFeatureScreen() {
  const [features, setFeatures] = useState<YourFeature[]>([]);

  const plms = createPLMSClient({
    baseUrl: process.env.EXPO_PUBLIC_API_URL!,
    platform: 'mobile',
  });

  const loadFeatures = async () => {
    try {
      const result = await plms.yourFeature.list({ limit: 10 });
      setFeatures(result);
    } catch (error) {
      console.error('Failed to load features:', error);
    }
  };

  return (
    <View>
      <Text>Your Features</Text>
      <Button title="Load" onPress={loadFeatures} />
      {/* UI code */}
    </View>
  );
}
```

**最佳實踐**：
- ✅ 統一使用 `plmsClient.yourFeature.method()`
- ✅ 使用 `try-catch` 處理錯誤
- ✅ 型別匯入使用 `import type`
- ❌ 禁止直接呼叫 `fetch('/api/...')`
- ❌ 禁止重複實作業務邏輯

---

## 🎛️ Feature Flags

### 為新功能添加 Feature Flag

```typescript
// packages/shared/config/flags.ts
const DEFAULT_FLAGS: FeatureFlagConfig[] = [
  // ...existing flags...
  {
    flag: 'your_feature',
    enabled: false, // Start disabled
    platforms: ['web', 'mobile'], // Available platforms
    description: 'Enable your awesome feature',
    rolloutPercentage: 10, // Gradual rollout: 10% of users
  },
];
```

### 在前端使用 Feature Flag

```typescript
import { createFeatureFlags } from '@plms/shared/config';

const flags = createFeatureFlags('mobile');

if (flags.isEnabled('your_feature')) {
  // Show the feature
  return <YourFeatureComponent />;
}

// Show placeholder
return <ComingSoonComponent />;
```

**最佳實踐**：
- ✅ 所有新功能必須包在 Feature Flag 中
- ✅ 先設為 `enabled: false`，測試完成後再啟用
- ✅ 使用 `rolloutPercentage` 進行灰度發布
- ✅ 生產環境穩定後移除 Feature Flag

---

## 📊 Analytics

### 為新功能添加事件追蹤

```typescript
// packages/shared/types/analytics.ts
export const AnalyticsEventNameSchema = z.enum([
  // ...existing events...
  'your_feature_created',
  'your_feature_viewed',
  'your_feature_updated',
]);
```

### 在功能中追蹤事件

```typescript
import { createAnalytics } from '@plms/shared/analytics';

const analytics = createAnalytics();

// Track feature usage
analytics.track('your_feature_created', {
  featureId: newFeature.id,
  featureName: newFeature.name,
  userId: currentUser.id,
});

analytics.track('your_feature_viewed', {
  featureId: feature.id,
  source: 'list_view',
});
```

**最佳實踐**：
- ✅ 追蹤重要的使用者行為
- ✅ 包含足夠的 context 資訊（userId, featureId 等）
- ✅ 使用一致的命名規範：`feature_action`
- ❌ 不要追蹤敏感資訊（密碼、個人資料等）

---

## 🧪 測試

### 單元測試（TODO：待補充測試框架設定）

```typescript
// packages/shared/sdk/__tests__/your-feature.test.ts
import { YourFeatureSDK } from '../your-feature';
import { BaseClient } from '../base-client';

describe('YourFeatureSDK', () => {
  let sdk: YourFeatureSDK;
  let mockClient: jest.Mocked<BaseClient>;

  beforeEach(() => {
    mockClient = {
      get: jest.fn(),
      post: jest.fn(),
      put: jest.fn(),
      delete: jest.fn(),
    } as any;

    sdk = new YourFeatureSDK(mockClient);
  });

  test('create should call POST endpoint', async () => {
    const mockFeature = { id: '123', name: 'Test' };
    mockClient.post.mockResolvedValue(mockFeature);

    const result = await sdk.create({ name: 'Test' });

    expect(mockClient.post).toHaveBeenCalledWith('/api/your-feature', {
      name: 'Test',
    });
    expect(result).toEqual(mockFeature);
  });
});
```

---

## 🔍 Code Review Checklist

提交 PR 前，請確認：

### 後端 API
- [ ] 使用 `ApiResponse<T>` 包裝回傳
- [ ] 實作錯誤處理
- [ ] 新增必要的 validation
- [ ] 測試 API 端點可正常運作

### shared/types
- [ ] 使用 Zod schema 定義型別
- [ ] 提供 JSDoc 註解
- [ ] 匯出到 `types/index.ts`
- [ ] Request/Response 型別分開定義

### shared/sdk
- [ ] 所有 API 呼叫透過 `BaseClient`
- [ ] 提供完整 JSDoc 註解
- [ ] 區分 API 方法與 client-side helper
- [ ] 整合到 `PLMSClient` 主類別
- [ ] 匯出到 `sdk/index.ts`

### shared/config
- [ ] 新功能加入 Feature Flag
- [ ] 設定適當的 platform 限制
- [ ] 預設為 `enabled: false`

### shared/analytics
- [ ] 新增事件到 `AnalyticsEventNameSchema`
- [ ] 在關鍵位置追蹤事件

### 前端應用
- [ ] 使用 SDK 而非直接 fetch
- [ ] 使用 `import type` 匯入型別
- [ ] 實作錯誤處理（try-catch）
- [ ] 檢查 Feature Flag
- [ ] 追蹤 Analytics 事件

### 文檔
- [ ] 更新 `README_SDK.md`
- [ ] 更新 `MIGRATION_MAP.md`（若涉及組件遷移）
- [ ] 更新 API 文檔

---

## 🛠️ 開發工具與指令

### 安裝依賴
```bash
pnpm install
```

### 開發模式
```bash
# 啟動所有專案
pnpm dev

# 只啟動 web
pnpm dev:web

# 只啟動 mobile
pnpm dev:mobile

# 只 build shared package
pnpm dev:shared
```

### 建置
```bash
# 建置所有專案
pnpm build

# 只建置 shared package
pnpm build:shared
```

### 型別檢查
```bash
pnpm type-check
```

### Lint
```bash
pnpm lint
```

### 格式化
```bash
pnpm format
```

---

## 📁 專案結構

```
plms/
├── apps/
│   ├── web/                    # Next.js web app
│   │   ├── app/
│   │   │   ├── api/           # ✅ 後端 API 端點
│   │   │   └── (pages)/       # ✅ 前端頁面（呼叫 SDK）
│   │   └── package.json
│   └── mobile/                 # Expo React Native app
│       ├── app/                # ✅ 前端頁面（呼叫 SDK）
│       └── package.json
│
├── packages/
│   └── shared/                 # ✅ 共用 SDK、型別、工具
│       ├── types/              # ✅ Step 2: Zod schemas + TS types
│       ├── sdk/                # ✅ Step 3: API client + 業務邏輯
│       ├── config/             # Feature flags
│       ├── analytics/          # Analytics interface
│       ├── utils/              # Common utilities
│       └── package.json
│
├── README_SDK.md               # SDK 使用文檔
├── CONTRIBUTING.md             # 本文檔
├── MIGRATION_MAP.md            # 組件遷移對照
└── turbo.json                  # Turborepo 設定
```

---

## ❌ 常見錯誤

### 1. 直接在前端呼叫 API
```typescript
// ❌ 錯誤
const response = await fetch('/api/your-feature');
const data = await response.json();

// ✅ 正確
const data = await plmsClient.yourFeature.get('id');
```

### 2. 重複實作業務邏輯
```typescript
// ❌ 錯誤：在 web 和 mobile 各寫一次計算邏輯
// apps/web/lib/calculate-score.ts
export function calculateScore(answers) { /* ... */ }

// apps/mobile/utils/calculate-score.ts
export function calculateScore(answers) { /* ... */ }

// ✅ 正確：邏輯只在 SDK 寫一次
// packages/shared/sdk/ready-score.ts
export class ReadyScoreSDK {
  calculateLevel(score: number): ReadyScoreLevel {
    if (score >= 90) return 'master';
    // ...
  }
}
```

### 3. 不使用 Zod schema
```typescript
// ❌ 錯誤
export interface YourFeature {
  id: string;
  name: string;
}

// ✅ 正確
export const YourFeatureSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1),
});

export type YourFeature = z.infer<typeof YourFeatureSchema>;
```

### 4. API 不回傳 ApiResponse 格式
```typescript
// ❌ 錯誤
return NextResponse.json({ id: '123', name: 'Test' });

// ✅ 正確
const response: ApiResponse<YourFeature> = {
  success: true,
  data: { id: '123', name: 'Test' },
  timestamp: new Date().toISOString(),
};
return NextResponse.json(response);
```

---

## 🤝 需要幫助？

- 📖 **SDK 文檔**: 查看 `README_SDK.md`
- 🗺️ **組件對照**: 查看 `MIGRATION_MAP.md`
- 💬 **問題回報**: 使用 GitHub Issues
- 📧 **聯絡團隊**: [email placeholder]

---

**感謝您為 PLMS 做出貢獻！🎉**
