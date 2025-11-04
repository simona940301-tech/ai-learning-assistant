#!/bin/bash

# 🚀 自動部署到 Vercel
# 使用方式：./scripts/deploy-to-vercel.sh "your commit message"

set -e  # 遇到錯誤立即停止

# 顏色定義
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${BLUE}════════════════════════════════════════════════════════════════${NC}"
echo -e "${BLUE}🚀 自動部署到 Vercel${NC}"
echo -e "${BLUE}════════════════════════════════════════════════════════════════${NC}"

# 檢查是否提供了 commit message
COMMIT_MSG="${1:-Update: Auto-deploy to Vercel}"

# 1. 檢查 Git 狀態
echo -e "\n${YELLOW}[1/5]${NC} 檢查 Git 狀態..."
if [[ -n $(git status -s) ]]; then
    echo -e "${GREEN}✓${NC} 發現未提交的更改"
    git status -s
else
    echo -e "${YELLOW}⚠${NC}  沒有未提交的更改"
    read -p "是否仍要推送到遠端？ (y/n) " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        echo -e "${RED}✗${NC} 部署已取消"
        exit 1
    fi
fi

# 2. 添加所有更改
echo -e "\n${YELLOW}[2/5]${NC} 添加所有更改到 Git..."
git add -A
echo -e "${GREEN}✓${NC} 已添加所有更改"

# 3. 提交更改
echo -e "\n${YELLOW}[3/5]${NC} 提交更改..."
FULL_COMMIT_MSG="${COMMIT_MSG}

🤖 Generated with [Claude Code](https://claude.com/claude-code)

Co-Authored-By: Claude <noreply@anthropic.com>"

git commit -m "$FULL_COMMIT_MSG" || {
    echo -e "${YELLOW}⚠${NC}  沒有新的提交（可能沒有更改）"
}
echo -e "${GREEN}✓${NC} 提交完成"

# 4. 推送到 GitHub
echo -e "\n${YELLOW}[4/5]${NC} 推送到 GitHub..."
CURRENT_BRANCH=$(git branch --show-current)
echo -e "${BLUE}當前分支：${NC}${CURRENT_BRANCH}"

git push origin "$CURRENT_BRANCH"
echo -e "${GREEN}✓${NC} 推送成功"

# 5. Vercel 自動部署
echo -e "\n${YELLOW}[5/5]${NC} Vercel 自動部署已觸發..."
echo -e "${GREEN}✓${NC} GitHub 已收到推送，Vercel 將自動開始部署"

# 顯示部署資訊
echo -e "\n${BLUE}════════════════════════════════════════════════════════════════${NC}"
echo -e "${GREEN}🎉 部署完成！${NC}"
echo -e "${BLUE}════════════════════════════════════════════════════════════════${NC}"
echo -e ""
echo -e "📋 部署資訊："
echo -e "   分支: ${BLUE}${CURRENT_BRANCH}${NC}"
echo -e "   提交: ${COMMIT_MSG}"
echo -e ""
echo -e "🔗 查看部署狀態："
echo -e "   Vercel Dashboard: ${BLUE}https://vercel.com/dashboard${NC}"
echo -e "   GitHub Repo: ${BLUE}https://github.com/simona940301-tech/ai-learning-assistant${NC}"
echo -e ""
echo -e "⏱  預計 2-3 分鐘後部署完成"
echo -e "${BLUE}════════════════════════════════════════════════════════════════${NC}"
