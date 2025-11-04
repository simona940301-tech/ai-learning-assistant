#!/bin/bash

# 🚀 自動部署腳本
# 用途：修改檔案後自動提交、推送並觸發 Vercel 預覽部署
# 使用方式：./scripts/auto-deploy.sh "你的提交訊息"

set -e

# 顏色定義
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# 檢查是否在專案根目錄
if [ ! -f "pnpm-workspace.yaml" ]; then
  echo -e "${RED}❌ 錯誤：請在專案根目錄執行此腳本${NC}"
  exit 1
fi

# 獲取提交訊息（第一個參數，或使用默認值）
COMMIT_MSG="${1:-chore: auto-deploy via script}"

# 獲取當前分支
CURRENT_BRANCH=$(git branch --show-current)

echo -e "${BLUE}🚀 開始自動部署流程...${NC}"
echo -e "${BLUE}📋 當前分支: ${CURRENT_BRANCH}${NC}"
echo ""

# 步驟 1: 檢查是否有變更
if [ -z "$(git status --porcelain)" ]; then
  echo -e "${YELLOW}⚠️  沒有檔案變更，跳過部署${NC}"
  exit 0
fi

# 步驟 2: 顯示變更狀態
echo -e "${BLUE}📝 檔案變更：${NC}"
git status --short
echo ""

# 步驟 3: 添加所有變更（排除敏感檔案）
echo -e "${BLUE}➕ 添加所有變更...${NC}"
git add .
# 移除敏感檔案（如果意外加入）
git reset HEAD .env.preview 2>/dev/null || true
git reset HEAD .env 2>/dev/null || true
git reset HEAD .env.local 2>/dev/null || true
git reset HEAD .env.*.local 2>/dev/null || true
echo -e "${GREEN}✅ 已添加所有變更${NC}"
echo ""

# 步驟 4: 提交
echo -e "${BLUE}💾 提交變更...${NC}"
git commit -m "$COMMIT_MSG

🤖 Auto-deployed via script
$(date '+%Y-%m-%d %H:%M:%S')"
echo -e "${GREEN}✅ 已提交變更${NC}"
echo ""

# 步驟 5: 推送到遠端（觸發 Vercel 自動部署）
echo -e "${BLUE}📤 推送到遠端並觸發 Vercel 部署...${NC}"
if git push origin "$CURRENT_BRANCH"; then
  echo -e "${GREEN}✅ 已推送到遠端${NC}"
  echo ""
  echo -e "${GREEN}🎉 部署觸發成功！${NC}"
  echo -e "${BLUE}📊 查看部署狀態：${NC}"
  echo -e "   ${YELLOW}https://vercel.com/dashboard${NC}"
  echo ""
  echo -e "${BLUE}⏱️  預覽連結將在 2-3 分鐘內可用${NC}"
  echo -e "${BLUE}💡 提示：Vercel 會自動偵測 Git push 並開始建置${NC}"
else
  echo -e "${RED}❌ 推送失敗，請檢查 Git 設定${NC}"
  exit 1
fi

