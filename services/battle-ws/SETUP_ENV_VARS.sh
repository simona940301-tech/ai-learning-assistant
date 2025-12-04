#!/bin/bash

# 設置 Fly.io 環境變數腳本
# 使用前請替換以下變數：
# - NEXTJS_API_URL: 您的 Next.js 應用 URL
# - INTERNAL_API_KEY: 已生成的 API Key

cd "$(dirname "$0")"

# ============================================
# 配置變數（請修改這些值）
# ============================================

# 您的 Next.js 應用 URL（Vercel）
NEXTJS_API_URL="${NEXTJS_API_URL:-https://your-app.vercel.app}"

# API Key（已生成）
INTERNAL_API_KEY="${INTERNAL_API_KEY:-8dbdfedbd7eb8cfff5ebf2f35c48f100bdf6fec6e819ecdff7b5c0a3e3db3ab8}"

# Battle Events API URL（自動從 NEXTJS_API_URL 生成）
BATTLE_EVENTS_API_URL="${BATTLE_EVENTS_API_URL:-${NEXTJS_API_URL}/api/play/battle/events}"

# ============================================
# 設置環境變數
# ============================================

echo "🚀 設置 Fly.io 環境變數..."
echo ""
echo "Next.js API URL: $NEXTJS_API_URL"
echo "API Key: ${INTERNAL_API_KEY:0:16}..." # 只顯示前 16 個字符
echo ""

# 設置必需的環境變數
~/.fly/bin/flyctl secrets set NEXTJS_API_URL="$NEXTJS_API_URL"
~/.fly/bin/flyctl secrets set INTERNAL_API_KEY="$INTERNAL_API_KEY"

# 設置 Battle Events API URL
~/.fly/bin/flyctl secrets set BATTLE_EVENTS_API_URL="$BATTLE_EVENTS_API_URL"

# 設置日誌級別
~/.fly/bin/flyctl secrets set RUST_LOG="info"

echo ""
echo "✅ 環境變數設置完成！"
echo ""
echo "查看已設置的環境變數："
~/.fly/bin/flyctl secrets list




































