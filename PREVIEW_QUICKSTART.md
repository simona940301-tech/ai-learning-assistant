# 🚀 预览模式快速开始

## ✅ 当前状态

预览服务器已成功启动！

- **服务器地址**: `http://localhost:3000`
- **预览页面**: `http://localhost:3000/preview`
- **状态**: ✅ 运行中（端口 3000）
- **HMR**: ✅ 已启用（文件修改后自动刷新）

---

## 🎯 快速测试

### 1. 查看 Batch 1.5 配置

浏览器已自动打开到 `http://localhost:3000/preview`

你会看到所有 flags 的状态：
- ✅ **BATCH 1.5**: true
- ✅ **Single CTA**: true
- ✅ **Near Difficulty**: true
- ✅ **Batch API**: true
- ✅ **Sampler Performance**: true

### 2. 测试主要功能

**Ask 页面（单题模式）**:
```
http://localhost:3000/ask
```
- 粘贴题目
- 查看 Single CTA 按钮（只显示一个操作按钮）
- 检查解题流程

**Community 页面**:
```
http://localhost:3000/community
```

**Backpack（错题本）**:
```
http://localhost:3000/backpack
```

---

## 🎛️ 切换 Flags（实时，无需重启）

### 方法 1: 修改 .env.preview 文件

```bash
# 编辑配置
nano .env.preview

# 修改任意 flag
NEXT_PUBLIC_HOTFIX_BATCH1_5_SINGLE_CTA=false  # 改为 false

# 保存后，刷新浏览器页面即可生效
```

### 方法 2: 浏览器开发工具

1. 打开浏览器（`F12`）
2. Console 标签
3. 查看日志输出（彩色编码）

---

## 📊 监控日志

### 在浏览器控制台查看实时日志

**打开 DevTools**: `F12` 或 `Cmd + Option + I`

**日志类型**:
- 📊 **Analytics** - 用户行为追踪（紫色）
- 🎲 **Sampler** - 题目采样性能（绿色）
- ℹ️ **Info** - 一般信息（蓝色）
- ⚠️ **Warning** - 警告（黄色）
- ❌ **Error** - 错误（红色）

**示例日志输出**:
```javascript
[ANALYTICS] Question Submitted { id: 'q123', source: 'ask_page' }
[SAMPLER] Questions selected { count: 5, duration: 45ms }
```

---

## 🔄 HMR (热模块替换)

### 自动刷新的内容

✅ **即时生效（无需刷新）**:
- React 组件 (`.tsx`, `.jsx`)
- CSS 样式
- JavaScript/TypeScript 文件

⚠️ **需要刷新页面**:
- Environment variables (修改 `.env.preview` 后)
- Next.js 配置 (需重启服务器)

### 测试 HMR

1. 打开 `apps/web/app/(app)/ask/page.tsx`
2. 修改任意文本或样式
3. 保存 (`Cmd + S`)
4. 浏览器自动刷新 ✨

---

## 🧪 验证 Batch 1.5 功能

### 1. Single CTA

**测试步骤**:
1. 访问 `/ask` 页面
2. 输入题目：`三角形 ABC，已知 a=5, b=7, C=60°，求 c=?`
3. 提交
4. 查看详解卡底部
5. **预期**: 只显示 1 个主要操作按钮（而非 2-3 个）

### 2. Near Difficulty

**测试步骤**:
1. 提交题目后
2. 打开浏览器控制台
3. 查找日志: `🎲 [Sampler] Selected questions near difficulty`
4. **预期**: 显示基于难度的智能采样

### 3. Batch API

**测试步骤**:
1. 打开 Network 标签（DevTools）
2. 提交多个题目（批次模式）
3. 查看请求
4. **预期**: 并行请求（而非顺序）

### 4. Sampler Performance

**测试步骤**:
1. 控制台查找: `[Sampler]` 日志
2. 查看 `duration` 字段
3. **预期**: 处理时间 < 100ms

---

## 🛠️ 常用命令

### 停止服务器

```bash
# 按 Ctrl+C 停止当前进程

# 或强制杀死端口 3000 上的进程
lsof -ti:3000 | xargs kill -9
```

### 重新启动预览

```bash
# 使用预览脚本
bash scripts/preview.sh

# 或手动启动
cd "/Users/simonac/Desktop/moonshot idea"
export $(cat .env.preview | grep -v '^#' | grep -v '^$' | xargs)
pnpm run dev
```

### 查看环境变量

```bash
cat .env.preview
```

### 查看运行的进程

```bash
ps aux | grep "next dev"
```

---

## 📝 修改配置

### 启用/禁用单个 Flag

编辑 `.env.preview`:

```bash
# 禁用 Single CTA
NEXT_PUBLIC_HOTFIX_BATCH1_5_SINGLE_CTA=false

# 启用 Single CTA
NEXT_PUBLIC_HOTFIX_BATCH1_5_SINGLE_CTA=true
```

保存后，**刷新浏览器页面**即可生效。

---

## 🔍 故障排查

### 端口 3000 被占用

```bash
# 查看占用端口的进程
lsof -ti:3000

# 杀死进程
lsof -ti:3000 | xargs kill -9

# 重新启动
bash scripts/preview.sh
```

### Flags 未生效

1. **检查 .env.preview 文件是否存在**:
   ```bash
   ls -la .env.preview
   ```

2. **验证环境变量已加载**:
   - 访问 `http://localhost:3000/preview`
   - 查看所有 flags 状态

3. **刷新浏览器** (Hard refresh):
   - Mac: `Cmd + Shift + R`
   - Windows: `Ctrl + Shift + R`

### 页面无法加载

1. **检查服务器状态**:
   ```bash
   curl http://localhost:3000
   ```

2. **查看进程**:
   ```bash
   ps aux | grep "next dev"
   ```

3. **查看日志**:
   - 服务器终端输出
   - 浏览器控制台

---

## 📚 更多资源

- **完整指南**: `PREVIEW_WORKFLOW.md`
- **集成示例**: `INTEGRATION_GUIDE.md`
- **设置完成**: `PREVIEW_SETUP_COMPLETE.md`

---

## 💡 快捷键

| 快捷键 | 功能 |
|--------|------|
| `F12` | 打开 DevTools |
| `Cmd + Shift + R` | 硬刷新（Mac） |
| `Ctrl + Shift + R` | 硬刷新（Windows） |
| `Cmd + K` | 清除控制台 |
| `Ctrl + C` | 停止服务器 |

---

## ✨ 你现在可以

- ✅ **实时预览**所有代码变更
- ✅ **切换 Flags** 无需重启服务器
- ✅ **监控日志** 追踪 Analytics & Sampler
- ✅ **测试功能** 验证 Batch 1.5 修复
- ✅ **快速迭代** HMR 自动刷新

---

**🎉 开始开发吧！**

访问 `http://localhost:3000/preview` 查看配置状态

