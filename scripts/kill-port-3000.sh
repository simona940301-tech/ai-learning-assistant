#!/bin/bash

# 清理 3000 埠和 Next.js 開發環境的腳本

echo "🔍 尋找佔用 3000 埠的進程..."

# 檢查是否有進程佔用 3000 埠
PIDS=$(lsof -ti:3000 2>/dev/null)

if [ -z "$PIDS" ]; then
  echo "✅ 3000 埠目前沒有被佔用"
else
  echo "發現進程 PID: $PIDS"
  echo "正在終止..."
  
  # 終止所有相關進程
  echo "$PIDS" | xargs kill -9 2>/dev/null
  
  # 等待一下
  sleep 1
  
  # 再次檢查
  REMAINING=$(lsof -ti:3000 2>/dev/null)
  if [ -n "$REMAINING" ]; then
    echo "⚠️  仍有進程運行，強制終止..."
    echo "$REMAINING" | xargs kill -9 2>/dev/null
    sleep 1
  fi
  
  if lsof -ti:3000 >/dev/null 2>&1; then
    echo "❌ 無法終止所有進程，請手動執行: kill -9 \$(lsof -ti:3000)"
    exit 1
  else
    echo "✅ 3000 埠已釋放"
  fi
fi

# 可選：清理 .next 目錄（如果是開發環境問題）
if [ "$1" == "--clean-next" ]; then
  echo "🧹 清理 .next 目錄..."
  rm -rf apps/web/.next 2>/dev/null
  echo "✅ .next 目錄已清理"
fi

if [ "$1" == "--full-clean" ]; then
  echo "🧹 執行完整清理..."
  rm -rf apps/web/.next 2>/dev/null
  rm -rf node_modules/.cache 2>/dev/null
  echo "✅ 完整清理完成"
fi

