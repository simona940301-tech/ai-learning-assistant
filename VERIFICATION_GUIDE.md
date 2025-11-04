# ✅ 验收脚本使用指南

**目的**: 在部署前快速检查核心功能是否正常工作  
**适用场景**: 本地测试、CI/CD Pipeline、上线前验收

---

## 📋 验收项目

### 1. Subject Detection (科目检测)
- ✅ English 检测准确性
- ✅ Math 检测准确性
- ✅ Chinese 检测准确性
- ✅ API 响应结构完整性

---

## 🚀 快速开始

### 前置条件

1. **启动开发服务器**:
```bash
cd "/Users/simonac/Desktop/moonshot idea"
pnpm run dev
```

2. **等待服务器就绪**:
```bash
# 等待看到
web:dev: ▲ Next.js 14.1.0
web:dev: - Local: http://localhost:3000
web:dev: ✓ Ready in 2.1s
```

### 运行验收脚本

```bash
# 方式 1: 使用 npm script (推荐)
pnpm run verify:subject

# 方式 2: 直接运行
node scripts/verify-subject-detection.mjs
```

---

## 📊 预期输出

### 成功示例

```bash
🧪 Subject Detection Verification Script
=========================================

📋 Testing: English MCQ
   Prompt: Imagery is found throughout literature and allow...
   ✅ detected = english | expected = english

📋 Testing: Math (Cosine Law)
   Prompt: 下列哪一個描述最符合餘弦定理？ c^2=a^2+b^2-2ab cos ...
   ✅ detected = matha | expected = matha

📋 Testing: Chinese 文意選填
   Prompt: 下列何者為文意選填之常見誤解？請選出最合適的選項。...
   ✅ detected = chinese | expected = chinese

=========================================
📊 Summary: 3 passed, 0 failed

✅ All tests passed!
```

### 失败示例

```bash
📋 Testing: English MCQ
   Prompt: Imagery is found throughout literature and allow...
   ❌ Mismatch: expected english, got unknown

=========================================
📊 Summary: 2 passed, 1 failed

❌ Some tests failed!
```

---

## 🔧 故障排查

### 问题 1: 连接失败

**错误信息**:
```
❌ Error: connect ECONNREFUSED 127.0.0.1:3000
```

**解决方案**:
```bash
# 1. 确认服务器正在运行
lsof -ti:3000

# 2. 如果没有输出，启动服务器
pnpm run dev

# 3. 等待 2-3 秒后重试
pnpm run verify:subject
```

---

### 问题 2: HTTP 500 错误

**错误信息**:
```
❌ HTTP 500 - Expected 200
```

**解决方案**:
```bash
# 1. 查看服务器日志
# 在运行 pnpm run dev 的终端查看错误

# 2. 检查环境变量
cat .env.local
# 确认 OPENAI_API_KEY, SUPABASE_URL 等已设置

# 3. 重启服务器
Ctrl+C
pnpm run dev
```

---

### 问题 3: Subject 检测错误

**错误信息**:
```
❌ Mismatch: expected english, got unknown
```

**解决方案**:
```bash
# 1. 检查 subject-classifier.ts 是否正确
cat apps/web/lib/subject-classifier.ts

# 2. 检查 solve-simple API 是否使用正确的 classifier
cat apps/web/app/api/solve-simple/route.ts

# 3. 手动测试 API
curl -X POST http://localhost:3000/api/solve-simple \
  -H "Content-Type: application/json" \
  -d '{"prompt":"Imagery is found in literature","mode":"step"}'
```

---

## 🔄 CI/CD 集成

### GitHub Actions 示例

```yaml
name: Verification Tests

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main]

jobs:
  verify:
    runs-on: ubuntu-latest
    
    steps:
      - uses: actions/checkout@v3
      
      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'
      
      - name: Install pnpm
        run: npm install -g pnpm@8.15.0
      
      - name: Install dependencies
        run: pnpm install
      
      - name: Build project
        run: pnpm run build
      
      - name: Start server in background
        run: pnpm run dev &
        env:
          OPENAI_API_KEY: ${{ secrets.OPENAI_API_KEY }}
          NEXT_PUBLIC_SUPABASE_URL: ${{ secrets.SUPABASE_URL }}
          NEXT_PUBLIC_SUPABASE_ANON_KEY: ${{ secrets.SUPABASE_ANON_KEY }}
      
      - name: Wait for server
        run: sleep 30
      
      - name: Run verification
        run: pnpm run verify:subject
      
      - name: Stop server
        run: pkill -f "next dev"
```

---

## 📝 自定义测试用例

### 添加新的测试

编辑 `scripts/verify-subject-detection.mjs`:

```javascript
const tests = [
  // ... 现有测试 ...
  
  // 添加新测试
  {
    name: 'Physics Question',
    prompt: '一個物體受到重力和摩擦力的作用，請計算其加速度。',
    expect: 'physics',
  },
];
```

### 测试其他 API

创建新的验收脚本:

```javascript
// scripts/verify-warmup-api.mjs
const API_URL = 'http://localhost:3000/api/warmup/keypoint-mcq-simple';

const res = await fetch(API_URL, {
  method: 'POST',
  headers: { 'content-type': 'application/json' },
  body: JSON.stringify({
    prompt: '三角形 ABC，已知 a=5, b=7, C=60°，求 c=?',
    subject: 'MathA'
  }),
});

const data = await res.json();

// 验证结构
if (data.phase === 'warmup' && data.question?.options?.length === 4) {
  console.log('✅ Warmup API verification passed!');
  process.exit(0);
} else {
  console.error('❌ Warmup API verification failed!');
  process.exit(1);
}
```

添加到 `package.json`:
```json
{
  "scripts": {
    "verify:warmup": "node scripts/verify-warmup-api.mjs",
    "verify:all": "npm run verify:subject && npm run verify:warmup"
  }
}
```

---

## 📊 验收报告模板

### 部署前检查清单

```markdown
# 部署前验收报告

**日期**: 2025-10-26
**环境**: Production
**版本**: v1.5.0

## ✅ 验收结果

### Subject Detection
- ✅ English: PASS
- ✅ Math: PASS
- ✅ Chinese: PASS

### API 端点
- ✅ /api/solve-simple: 200 OK
- ✅ /api/warmup/keypoint-mcq-simple: 200 OK

### 性能指标
- ✅ API 响应时间: < 500ms
- ✅ 成功率: 100%

## 📋 测试命令

\`\`\`bash
pnpm run verify:all
\`\`\`

## 📸 证据

[附上验收脚本输出截图]

## ✅ 签核

- [ ] 后端工程师: _______
- [ ] 前端工程师: _______
- [ ] QA: _______
- [ ] 产品经理: _______

---

**状态**: ✅ 通过验收，可以部署
```

---

## 🔗 相关文档

- **修复报告**: `BUGFIX_WARMUP_OPTIONS.md`
- **测试指南**: `TEST_EXECUTION_GUIDE.md`
- **API 文档**: `apps/web/lib/contract-v2.ts`

---

## 💡 最佳实践

### 1. 部署前必做

```bash
# 在本地运行完整验收
pnpm run dev &
sleep 10
pnpm run verify:all

# 检查输出
# ✅ All tests passed! → 可以部署
# ❌ Some tests failed! → 修复后重试
```

### 2. CI/CD Pipeline

将验收脚本集成到 CI/CD：
- **Pull Request**: 运行验收检查
- **Merge to Main**: 运行完整测试套件
- **Deploy**: 在 staging 环境运行验收

### 3. 定期检查

```bash
# 每天自动运行 (cron job)
0 9 * * * cd /path/to/project && pnpm run verify:all

# 或使用 GitHub Actions schedule
on:
  schedule:
    - cron: '0 9 * * *'  # 每天早上 9 点
```

---

## 🎯 快速参考

| 命令 | 用途 |
|------|------|
| `pnpm run verify:subject` | 验收科目检测 |
| `pnpm run verify:all` | 运行所有验收脚本 |
| `node scripts/verify-subject-detection.mjs` | 直接运行脚本 |

---

**✅ 验收脚本已就绪！**

在每次部署前运行 `pnpm run verify:all` 确保核心功能正常。

