#!/bin/bash

# 🧹 系统数据清理脚本（不影响项目）
# 只清理系统缓存和 Time Machine 快照

set -e

echo "🧹 开始清理系统数据..."
echo ""

# 1. 清理 Time Machine 本地快照
echo "📸 清理 Time Machine 本地快照..."
if [ "$(id -u)" -eq 0 ]; then
  # 如果是 root 用户，直接执行
  tmutil deletelocalsnapshots / 2>/dev/null || true
  echo "✅ Time Machine 本地快照已清理"
else
  # 需要 sudo 权限
  echo "⚠️  需要管理员权限来清理 Time Machine 快照"
  echo "   请运行: sudo tmutil deletelocalsnapshots /"
  echo ""
fi

# 2. 清理用户缓存（不需要管理员权限）
echo "📦 清理用户缓存..."
CACHE_SIZE_BEFORE=$(du -sh ~/Library/Caches 2>/dev/null | cut -f1 || echo "0")
echo "   清理前缓存大小: $CACHE_SIZE_BEFORE"

# 清理各种应用缓存
rm -rf ~/Library/Caches/* 2>/dev/null || true

CACHE_SIZE_AFTER=$(du -sh ~/Library/Caches 2>/dev/null | cut -f1 || echo "0")
echo "   清理后缓存大小: $CACHE_SIZE_AFTER"
echo "✅ 用户缓存已清理"
echo ""

# 3. 清理系统日志（需要管理员权限）
echo "📋 清理系统日志..."
if [ "$(id -u)" -eq 0 ]; then
  rm -rf /private/var/log/* 2>/dev/null || true
  echo "✅ 系统日志已清理"
else
  echo "⚠️  需要管理员权限来清理系统日志"
  echo "   请运行: sudo rm -rf /private/var/log/*"
  echo ""
fi

# 4. 清理用户日志
echo "📋 清理用户日志..."
rm -rf ~/Library/Logs/* 2>/dev/null || true
echo "✅ 用户日志已清理"
echo ""

echo "✅ 系统数据清理完成！"
echo ""
echo "💡 提示："
echo "  - 如果还有 Time Machine 快照，请运行: sudo tmutil deletelocalsnapshots /"
echo "  - 所有清理的缓存都可以自动重新生成"
echo "  - 项目功能完全不受影响"

