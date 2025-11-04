# Vercel 部署指南

## 快速部署步骤

### Step 1: 登录 Vercel

```bash
cd "/Users/simonac/Desktop/moonshot idea"
vercel login
```

选择登录方式：GitHub、GitLab 或 Email

### Step 2: 部署项目

```bash
vercel
```

按提示回答：
- "Set up and deploy?" → **Yes**
- "Which scope?" → 选择团队 `team_AU75Q3xAosycSaeFNySuPVju`
- "Link to existing project?" → **Yes**，选择 `plms-learning`
- "What’s your project’s directory?" → 输入 `./`

### Step 3: 设置环境变量

部署完成后，添加环境变量：

```bash
# OpenAI API Key
vercel env add OPENAI_API_KEY
# 粘贴: 你的 OpenAI API Key（請從環境變數或 Vercel Dashboard 中取得）

# Supabase URL (Public)
vercel env add NEXT_PUBLIC_SUPABASE_URL
# 粘贴: https://umzqjgxsetsmwzhniemw.supabase.co

# Supabase Anon Key (Public)
vercel env add NEXT_PUBLIC_SUPABASE_ANON_KEY
# 粘贴: 你的 Supabase Anon Key（請從環境變數或 Supabase Dashboard 中取得）
```

**对于每个变量，选择环境：**
- ✅ Production
- ✅ Preview  
- ✅ Development

### Step 4: 重新部署（应用环境变量）

```bash
vercel --prod
```

### Step 5: 访问你的网站

部署完成后，Vercel 会提供 URL，例如：
- https://plms-learning.vercel.app

测试页面：
- https://plms-learning.vercel.app/ask

## 项目配置

已创建 `vercel.json`：
- Root Directory: `./`
- Install Command: `pnpm install --frozen-lockfile`
- Build Command: `pnpm --filter web build`
- Output Directory: `apps/web/.next`
- Framework: Next.js
- Node.js Version: `20.x`

## 环境变量清单

### 必需的环境变量：

| 变量名 | 说明 | 环境 |
|--------|------|------|
| `OPENAI_API_KEY` | OpenAI API 密钥 | Production, Preview, Development |
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase 项目 URL | Production, Preview, Development |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase 匿名密钥 | Production, Preview, Development |

### 可选的环境变量：

| 变量名 | 说明 | 默认值 |
|--------|------|--------|
| `NEXT_PUBLIC_USE_STREAMING` | 启用 streaming 功能 | `true` |
| `DEBUG` | 调试模式 | `false` |
| `NEXT_PUBLIC_DEBUG` | 前端调试模式 | `false` |
| `NEXT_PUBLIC_HIDE_DEV_BANNER` | 隐藏开发横幅 | `false` |

## 替代方案：通过 Vercel Dashboard 部署

如果 CLI 不熟悉，可以：

1. 访问 [vercel.com](https://vercel.com) 并登录
2. 点击 "Add New Project"
3. 导入 GitHub 仓库（或上传文件夹）
4. **设置 Root Directory 为**: `./`
5. 在 Dashboard 中添加环境变量
6. 点击 "Deploy"

## 故障排除

### 构建失败

如果构建失败，检查：
1. Root Directory 是否正确设置为 `./`
2. 所有环境变量是否已设置
3. 查看 Vercel 构建日志中的错误信息

### 环境变量未生效

1. 确保在 **所有环境**（Production, Preview, Development）中都设置了变量
2. 重新部署：`vercel --prod`
3. 清除缓存：在 Vercel Dashboard → Settings → Environment Variables → 重新部署

### Streaming 功能不工作

1. 检查 `NEXT_PUBLIC_USE_STREAMING` 环境变量
2. 查看浏览器控制台是否有错误
3. 检查 Network 标签中的 `/api/ai/route-solver-stream` 请求

## 部署后验证

✅ 访问首页：`https://your-project.vercel.app`
✅ 访问解题页面：`https://your-project.vercel.app/ask`
✅ 测试 streaming 功能：输入题目，查看打字机效果
✅ 检查浏览器控制台：确保没有错误

## 后续更新

部署后，每次 push 到 GitHub 会自动触发 Preview 部署。

要部署到 Production：
```bash
vercel --prod
```

或者合并到 main 分支会自动部署到 Production（如果配置了自动部署）。
