#!/bin/bash

# 🔄 Git Post-Commit Hook
# 用途：每次 commit 後自動推送到遠端（觸發 Vercel 自動部署）
# 安裝方式：cp scripts/git-hook-post-commit.sh .git/hooks/post-commit && chmod +x .git/hooks/post-commit

# 只在非 CI 環境執行
if [ -n "$CI" ]; then
  exit 0
fi

# 檢查是否在專案根目錄
if [ ! -f "pnpm-workspace.yaml" ]; then
  exit 0
fi

# 獲取當前分支
CURRENT_BRANCH=$(git branch --show-current)

# 檢查是否有遠端分支
if ! git ls-remote --heads origin "$CURRENT_BRANCH" > /dev/null 2>&1; then
  echo "⚠️  遠端分支不存在，跳過自動推送"
  exit 0
fi

# 檢查是否有未推送的提交
if [ -z "$(git log origin/$CURRENT_BRANCH..HEAD 2>/dev/null)" ]; then
  exit 0
fi

echo ""
echo "🚀 偵測到新的 commit，準備推送到遠端..."
echo "📤 推送後 Vercel 會自動開始部署..."
echo ""

# 推送到遠端（非阻塞，避免影響 commit 流程）
(
  git push origin "$CURRENT_BRANCH" > /dev/null 2>&1 && \
  echo "✅ 已推送到遠端，Vercel 部署已觸發" || \
  echo "⚠️  推送失敗，請手動執行: git push origin $CURRENT_BRANCH"
) &

exit 0

