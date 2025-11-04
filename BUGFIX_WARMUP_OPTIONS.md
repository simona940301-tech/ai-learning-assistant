# 🐛 Bugfix: Warmup Options 数据结构错误

**修复时间**: 2025-10-26  
**问题**: 答题流程跑不出来，Console 显示 `TypeError: Cannot read properties of undefined (reading 'map')`

---

## 🔍 问题分析

### Console 错误
```
Tutor flow error: TypeError: Cannot read properties of undefined (reading 'map')
at eval (page.tsx:117:68)
at async handleSubmit (InputDock.tsx:39:5)
```

### 根本原因

**错误代码** (`apps/web/app/(app)/ask/page.tsx:117`):
```typescript
// ❌ 错误：假设 warmupResponse.options 存在
const conceptChips: ConceptChip[] = warmupResponse.options.map((opt: any) => ({
  id: opt.option_id,
  label: opt.label
}));
```

**API 实际返回结构** (`/api/warmup/keypoint-mcq-simple`):
```json
{
  "phase": "warmup",
  "session_id": "session_1761523543171",
  "subject": "MathA",
  "keypoint": { ... },
  "question": {
    "stem": "下列哪一個描述最符合「餘弦定理」？",
    "options": [
      { "id": "opt_0", "label": "...", "is_correct": false },
      { "id": "opt_1", "label": "...", "is_correct": false },
      { "id": "opt_2", "label": "...", "is_correct": false },
      { "id": "opt_3", "label": "...", "is_correct": true }
    ]
  },
  "ui": { ... }
}
```

**问题**:
- 代码尝试访问 `warmupResponse.options` ❌
- 正确路径应该是 `warmupResponse.question.options` ✅

---

## ✅ 修复方案

### 修改文件
`apps/web/app/(app)/ask/page.tsx` (3 处修复)

### 修复点 #1: handleSubmit 中的 conceptChips (第 117-121 行)

**修复前**:
```typescript
const conceptChips: ConceptChip[] = warmupResponse.options.map((opt: any) => ({
  id: opt.option_id,
  label: opt.label
}));
```

**修复后**:
```typescript
// Note: Contract v2 response has question.options, not just options
const conceptChips: ConceptChip[] = (warmupResponse.question?.options || []).map((opt: any) => ({
  id: opt.id,         // ✅ 修改：opt.option_id → opt.id
  label: opt.label    // ✅ 保持不变
}));
```

### 修复点 #2: UI 渲染中的 stem (第 369 行)

**修复前**:
```typescript
{warmupData.stem}
```

**修复后**:
```typescript
{warmupData.question?.stem || '請選擇考點'}
```

### 修复点 #3: UI 渲染中的 options (第 372-383 行)

**修复前**:
```typescript
{warmupData.options.map((option: any, index: number) => (
  <motion.button
    key={option.option_id}
    onClick={() => handleConceptSelect({ id: option.option_id, label: option.label })}
  >
```

**修复后**:
```typescript
{(warmupData.question?.options || []).map((option: any, index: number) => (
  <motion.button
    key={option.id}
    onClick={() => handleConceptSelect({ id: option.id, label: option.label })}
  >
```

### 关键改动总结
1. ✅ **路径修正**: `warmupData.options` → `warmupData.question?.options`
2. ✅ **路径修正**: `warmupData.stem` → `warmupData.question?.stem`
3. ✅ **空值保护**: 添加 `|| []` 和 `|| '請選擇考點'` 防止 undefined
4. ✅ **字段修正**: `option.option_id` → `option.id` (Contract v2 使用 `id`)

---

## 🧪 验证测试

### API 测试结果
```bash
$ npx tsx scripts/test-warmup-api.ts

✅ Status: 200
📥 Response structure:
- phase: warmup
- session_id: session_1761523543171
- subject: MathA
- keypoint: { id: 'kp1', code: 'TRIG_COS_LAW', name: '餘弦定理' }
- question.stem: 下列哪一個描述最符合「餘弦定理」？
- question.options (count): 4

✅ API Test PASSED
```

### 预期结果

**修复前**:
- ❌ Console 错误: `Cannot read properties of undefined (reading 'map')`
- ❌ 答题流程中断
- ❌ 无法显示选项

**修复后**:
- ✅ Console 无错误
- ✅ 答题流程正常
- ✅ 正确显示 4 个选项
- ✅ 可以选择考点继续答题

---

## 📊 Contract v2 数据结构

### Warmup Response Schema
```typescript
interface WarmupResponse {
  phase: 'warmup';
  session_id: string;
  subject: string;
  subject_confidence: number;
  keypoint: {
    id: string;
    code: string;
    name: string;
    category?: string;
  };
  question: {
    stem: string;
    options: Array<{
      id: string;          // ✅ 注意：使用 "id"，不是 "option_id"
      label: string;
      is_correct?: boolean;
    }>;
  };
  ui: {
    mode: 'mcq' | 'text';
    next_action: string;
  };
  telemetry?: {
    latency_ms: number;
    model_used?: string;
  };
}
```

### 关键字段映射

| Legacy 字段 | Contract v2 字段 | 说明 |
|------------|-----------------|------|
| `options` | `question.options` | 嵌套在 `question` 下 |
| `opt.option_id` | `opt.id` | 字段名简化 |
| `stem` | `question.stem` | 嵌套在 `question` 下 |

---

## 🔄 测试步骤

### 1. 刷新浏览器
HMR 应该自动刷新，如果没有：
```bash
# 硬刷新
Cmd + Shift + R (Mac)
Ctrl + Shift + R (Windows)
```

### 2. 测试答题流程
1. 访问: `http://localhost:3000/ask`
2. 输入题目: `三角形 ABC，已知 a=5, b=7, C=60°，求 c=?`
3. 点击提交或按 Enter
4. **预期**: 显示 4 个选项（考点选择）
5. 点击任意选项
6. **预期**: 显示详解

### 3. 检查 Console
```javascript
// 应该看到
[时间戳] 检测到题目...
[时间戳] Warmup 完成...
[时间戳] 显示选项...

// 不应该看到
❌ TypeError: Cannot read properties of undefined
```

### 4. 检查 Network
```
Request: POST /api/warmup/keypoint-mcq-simple
Status: 200 OK
Time: ~60ms
Response: { phase: "warmup", question: { options: [...] } }
```

---

## 📁 相关文件

### 修改的文件
- ✅ `apps/web/app/(app)/ask/page.tsx` (第 117-121 行)

### 相关 API
- `apps/web/app/api/warmup/keypoint-mcq-simple/route.ts`
- `apps/web/lib/contract-v2.ts`

### 测试脚本
- ✅ `scripts/test-warmup-api.ts` (新建)

---

## ⚠️ 注意事项

### Contract v2 vs Legacy

**Contract v2** (新版，使用中):
```typescript
{
  question: {
    options: [
      { id: "opt_0", label: "...", is_correct: false }
    ]
  }
}
```

**Legacy** (旧版，已弃用):
```typescript
{
  options: [
    { option_id: "opt_0", label: "..." }
  ],
  answer_index: 3
}
```

### 未来改进建议

1. **类型安全**: 使用 TypeScript 接口定义 `WarmupResponse`
2. **错误处理**: 添加更详细的错误日志
3. **测试覆盖**: 添加单元测试验证数据结构
4. **文档更新**: 在代码注释中说明 Contract v2 结构

---

## ✅ 修复状态

- ✅ **根因分析**: 完成 (发现 3 处数据结构错误)
- ✅ **代码修复**: 完成 (已修复全部 3 处)
- ✅ **API 测试**: 通过
- ✅ **修复验证**: 已确认无遗漏
- ⏳ **浏览器测试**: 待用户确认

---

## 📞 下一步

请刷新浏览器并测试答题流程：

1. **刷新页面**: `Cmd+Shift+R` (硬刷新)
2. **提交题目**: 输入任意数学题目
3. **验证流程**: 应该能看到 4 个选项
4. **选择考点**: 点击任意选项
5. **查看详解**: 应该能正常显示

如果仍有问题，请提供：
- Console 完整错误信息
- Network 标签截图
- 当前的 URL

---

**修复完成！** ✅

等待用户反馈测试结果。

