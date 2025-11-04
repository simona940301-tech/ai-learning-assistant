# Vercel 快速部署命令

## 一键部署脚本

复制以下命令到终端执行：

```bash
cd "/Users/simonac/Desktop/moonshot idea"

# Step 1: 登录 Vercel (首次部署)
vercel login

# Step 2: 部署项目
vercel

# 当提示时，选择：
# - Set up and deploy? → Yes
# - Which scope? → 选择你的账户
# - Link to existing project? → No
# - Project name? → plms-learning
# - Directory? → apps/web ⚠️ 重要！

# Step 3: 添加环境变量
vercel env add OPENAI_API_KEY
# 粘贴: 你的 OpenAI API Key（請從環境變數或 Vercel Dashboard 中取得）
# 选择环境: Production, Preview, Development (全部)

vercel env add NEXT_PUBLIC_SUPABASE_URL
# 粘贴: https://umzqjgxsetsmwzhniemw.supabase.co
# 选择环境: Production, Preview, Development (全部)

vercel env add NEXT_PUBLIC_SUPABASE_ANON_KEY
# 粘贴: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVtenFqZ3hzZXRzbXd6aG5pZW13Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTk1NzEwOTAsImV4cCI6MjA3NTE0NzA5MH0.xipxP226DkGWnzZCXYZSf5sX_0HUId-ZuX9jznTbb-Y
# 选择环境: Production, Preview, Development (全部)

# Step 4: 重新部署应用环境变量
vercel --prod

# Step 5: 访问你的网站
# Vercel 会显示部署 URL，例如: https://plms-learning.vercel.app
```

## 验证部署

部署完成后，访问：
- 首页: `https://your-project.vercel.app`
- 解题页面: `https://your-project.vercel.app/ask`

测试 streaming 打字机效果：输入题目，应该看到实时生成效果。

