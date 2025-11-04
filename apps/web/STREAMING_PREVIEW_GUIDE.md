# Streaming 打字机效果 - 预览指南

## 预览方式

### 开发服务器（固定端口 3000）

```bash
cd apps/web
pnpm dev
```

服务器会在 `http://localhost:3000` 启动

### 访问页面

- 主页面: http://localhost:3000
- 解题页面: http://localhost:3000/ask

## 功能检查清单

### ✅ Streaming 打字机效果
1. 输入题目后，应该立即看到"正在生成詳解..."
2. 生成过程中会显示实时文本（打字机效果）
3. 完成后显示完整详解卡片

### ✅ UI 组件
- `StreamingExplainPlaceholder`: 显示streaming状态
- `TypewriterText`: 打字机效果组件
- `ReadingExplain`: 最终详解展示

### ✅ API 端点
- `/api/ai/route-solver-stream`: Streaming API（SSE）
- `/api/ai/route-solver`: 常规 API（fallback）

## 故障排除

### 如果无法预览：

1. **检查端口占用**
   ```bash
   lsof -ti:3000 | xargs kill -9
   ```

2. **重启开发服务器**
   ```bash
   cd apps/web
   pnpm dev
   ```

3. **检查环境变量**
   - Streaming 默认启用（可通过 `NEXT_PUBLIC_USE_STREAMING=false` 禁用）

4. **查看浏览器控制台**
   - 检查是否有 JavaScript 错误
   - 检查 Network 标签中的 API 请求

## 代码结构

```
apps/web/
├── app/api/ai/route-solver-stream/route.ts  # Streaming API
├── lib/english/templates-streaming.ts      # Streaming 生成逻辑
├── components/
│   ├── ask/AnySubjectSolver.tsx           # 主页面组件
│   └── solve/
│       ├── StreamingExplainPlaceholder.tsx # Streaming UI
│       └── explain/
│           └── TypewriterText.tsx          # 打字机效果
```

## 预期行为

1. **用户输入题目** → 点击"送出"
2. **立即显示** → "正在生成詳解..." + 加载动画
3. **Streaming 开始** → 实时文本逐字显示（打字机效果）
4. **生成完成** → 显示完整详解卡片（ReadingExplain）

## 性能优化

- ✅ Prompt 优化：文章从 800→600 字符
- ✅ 精简格式：移除冗长示例
- ✅ 流式生成：边生成边显示
- ✅ 打字机效果：提升用户体验

