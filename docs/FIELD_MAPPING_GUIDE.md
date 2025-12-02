# 🔄 字段映射工具使用指南

## 概述

字段映射工具自動處理數據庫格式 (snake_case) 與 API 格式 (camelCase) 之間的轉換，消除手動轉換的錯誤風險。

## 核心優勢

✅ **零錯誤** - 自動轉換，消除手動映射錯誤  
✅ **代碼簡化** - 減少 60-80% 的字段轉換代碼  
✅ **自動擴展** - 新增字段無需手動添加轉換  
✅ **類型安全** - TypeScript 編譯時檢查  
✅ **架構合規** - 完全遵循專案 ARCHITECTURE.md 規範  

## 基本用法

### 1. API Route 中使用

```typescript
// ❌ BEFORE: 手動轉換 (容易出錯)
export async function GET(req: NextRequest) {
  const { data: packs } = await supabase.from('packs').select('*');
  
  const result = packs.map(pack => ({
    id: pack.id,
    itemCount: pack.item_count,           // 手動轉換
    hasExplanation: pack.has_explanation, // 手動轉換
    avgConfidence: pack.avg_confidence,   // 手動轉換
    createdAt: pack.created_at,          // 手動轉換
    // ... 更多手動轉換
  }));
  
  return NextResponse.json(ok(result));
}

// ✅ AFTER: 自動轉換 (零錯誤)
import { okWithTransform } from '@/lib/utils/api-response-builder';

export async function GET(req: NextRequest) {
  const { data: packs } = await supabase.from('packs').select('*');
  
  // 直接返回，自動轉換所有字段
  return NextResponse.json(okWithTransform(packs));
}
```

### 2. 複雜數據處理

```typescript
import { dbToApiFormat, dbArrayToApiFormat } from '@/lib/utils/field-mapping';

// 單個對象轉換
const dbRecord = { user_id: '123', pack_id: '456', created_at: '2024-01-01' };
const apiRecord = dbToApiFormat(dbRecord);
// 結果: { userId: '123', packId: '456', createdAt: '2024-01-01' }

// 數組轉換
const dbArray = [
  { user_id: '123', pack_id: '456' },
  { user_id: '789', pack_id: '101' }
];
const apiArray = dbArrayToApiFormat(dbArray);

// 混合業務邏輯
const packsWithStatus = (dbPacks || []).map(pack => {
  const autoConverted = dbToApiFormat(pack);
  return {
    ...autoConverted, // 自動轉換所有字段
    // 只需手動處理業務邏輯
    isInstalled: installedPackIds.includes(pack.id),
    confidenceBadge: getConfidenceBadge(pack.avg_confidence),
  };
});
```

## 支援的字段映射

### 自動映射規則

| 數據庫 (snake_case) | API (camelCase) |
|-------------------|-----------------|
| `user_id` | `userId` |
| `pack_id` | `packId` |
| `created_at` | `createdAt` |
| `updated_at` | `updatedAt` |
| `item_count` | `itemCount` |
| `has_explanation` | `hasExplanation` |
| `avg_confidence` | `avgConfidence` |

### 通用轉換規則

- **snake_case → camelCase**: `field_name` → `fieldName`
- **camelCase → snake_case**: `fieldName` → `field_name`
- **嵌套對象**: 遞歸轉換所有層級
- **數組**: 自動處理數組中的每個元素

## API 設計模式

### 標準 Route 結構

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseClient } from '@/lib/api/auth';
import { okWithTransform, fail } from '@/lib/utils/api-response-builder';

export async function GET(req: NextRequest) {
  try {
    const supabase = getSupabaseClient(req);
    
    // 1. 數據庫查詢 (保持 snake_case)
    const { data, error } = await supabase
      .from('table_name')
      .select('*')
      .eq('user_id', userId); // 數據庫層使用 snake_case
    
    if (error) {
      return NextResponse.json(fail('QUERY_FAILED', error.message), { status: 500 });
    }
    
    // 2. 自動轉換並返回
    return NextResponse.json(okWithTransform(data));
    
  } catch (error) {
    return NextResponse.json(fail('INTERNAL_ERROR', error.message), { status: 500 });
  }
}
```

## 最佳實踐

### ✅ 推薦做法

1. **使用 okWithTransform()** - 適用於簡單數據返回
2. **使用 dbToApiFormat()** - 適用於需要額外業務邏輯的場景
3. **保持數據庫查詢原始格式** - 讓工具處理轉換
4. **業務邏輯分離** - 只在必要時手動處理

### ❌ 避免做法

1. **混用命名風格** - 不要在同一響應中混用 snake_case 和 camelCase
2. **手動轉換已支援字段** - 讓自動轉換處理標準字段
3. **忽略類型檢查** - 始終使用 TypeScript 類型

## 團隊協作

### Code Review 檢查點

- [ ] 新 API 是否使用了 `okWithTransform()` 或 `dbToApiFormat()`？
- [ ] 是否還存在手動字段轉換？
- [ ] 響應格式是否遵循 camelCase 規範？
- [ ] 是否正確導入了相關工具函數？

### 添加新字段

當數據庫添加新字段時：

1. **如果是標準命名** (如 `new_field`) - 無需額外配置，自動轉換為 `newField`
2. **如果是特殊命名** - 在 `lib/utils/field-mapping.ts` 的 `FIELD_MAPPING` 中添加映射

## 故障排除

### 常見問題

**Q: 轉換後的字段名不正確**  
A: 檢查 `FIELD_MAPPING` 中是否有對應映射，或使用通用 snake_case 命名

**Q: 嵌套對象沒有轉換**  
A: 確保使用 `dbToApiFormat()` 而不是簡單的展開運算符

**Q: 性能問題**  
A: 對於大量數據，考慮在業務邏輯層進行批量處理優化

### 調試工具

```typescript
import { dbToApiFormatWithMeta } from '@/lib/utils/field-mapping';

// 調試模式：查看轉換過程
const { data, meta } = dbToApiFormatWithMeta(dbRecord);
console.log('原始字段:', meta.originalKeys);
console.log('轉換結果:', data);
```

## 測試指南

### 驗證腳本

```bash
# 測試字段映射功能
npm run verify:field-mapping

# 檢查代碼合規性
npm run check:field-mapping

# 完整架構檢查
npm run check:architecture-full
```

### 單元測試範例

```typescript
import { dbToApiFormat } from '@/lib/utils/field-mapping';

describe('Field Mapping', () => {
  it('should convert snake_case to camelCase', () => {
    const input = { user_id: '123', pack_id: '456' };
    const output = dbToApiFormat(input);
    expect(output).toEqual({ userId: '123', packId: '456' });
  });
});
```

## 更新日誌

### v1.0.0 (2024-01-27)
- ✅ 初始發布
- ✅ 支援基本 snake_case ↔ camelCase 轉換
- ✅ 集成 ApiResponseBuilder
- ✅ 完整測試套件
- ✅ POC 驗證 (Packs API 優化成功)

---

**需要幫助？** 查閱 [ARCHITECTURE.md](../ARCHITECTURE.md) 或聯繫架構團隊。