#!/bin/bash

# 🚀 快速部署 (無提示)
# 使用方式：./scripts/quick-deploy.sh

set -e

echo "🚀 快速部署中..."

# 獲取當前分支
CURRENT_BRANCH=$(git branch --show-current)

# 添加、提交、推送 (一行完成)
git add -A && \
git commit -m "Update: Quick deploy to Vercel

🤖 Generated with [Claude Code](https://claude.com/claude-code)

Co-Authored-By: Claude <noreply@anthropic.com>" || echo "No changes to commit" && \
git push origin "$CURRENT_BRANCH"

echo "✅ 部署已觸發！"
echo "🔗 查看: https://vercel.com/dashboard"
