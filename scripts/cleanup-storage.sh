#!/bin/bash

# 🧹 存储清理脚本
# 用于清理开发环境中的缓存和临时文件，释放系统空间

set -e

echo "🧹 开始清理存储空间..."

# 1. 清理 Next.js 构建缓存
echo "📦 清理 Next.js 构建缓存..."
find . -type d -name ".next" -exec rm -rf {} + 2>/dev/null || true
echo "✅ Next.js 缓存已清理"

# 2. 清理 node_modules（可选，需要时重新安装）
if [ "$1" == "--deep" ]; then
  echo "🗑️  深度清理：删除 node_modules..."
  find . -type d -name "node_modules" -exec rm -rf {} + 2>/dev/null || true
  echo "✅ node_modules 已删除（运行 pnpm install 重新安装）"
fi

# 3. 清理 TypeScript 构建输出
echo "📝 清理 TypeScript 构建输出..."
find . -type d -name "dist" -exec rm -rf {} + 2>/dev/null || true
find . -type d -name "build" -exec rm -rf {} + 2>/dev/null || true
echo "✅ TypeScript 构建输出已清理"

# 4. 清理日志文件
echo "📋 清理日志文件..."
find . -type f -name "*.log" -delete 2>/dev/null || true
find . -type f -name "*.log.*" -delete 2>/dev/null || true
echo "✅ 日志文件已清理"

# 5. 清理临时文件
echo "🗂️  清理临时文件..."
find . -type f -name "*.tmp" -delete 2>/dev/null || true
find . -type f -name "*.temp" -delete 2>/dev/null || true
find . -type f -name ".DS_Store" -delete 2>/dev/null || true
echo "✅ 临时文件已清理"

# 6. 清理 macOS 系统缓存（需要管理员权限）
if [ "$(id -u)" -eq 0 ]; then
  echo "🍎 清理 macOS 系统缓存..."
  sudo rm -rf ~/Library/Caches/* 2>/dev/null || true
  echo "✅ macOS 系统缓存已清理"
else
  echo "ℹ️  跳过 macOS 系统缓存清理（需要管理员权限）"
fi

# 7. 清理 pnpm 缓存（可选）
if command -v pnpm &> /dev/null; then
  echo "📦 清理 pnpm 缓存..."
  pnpm store prune 2>/dev/null || true
  echo "✅ pnpm 缓存已清理"
fi

# 8. 显示清理后的空间使用情况
echo ""
echo "📊 清理完成！当前项目空间使用："
du -sh . 2>/dev/null || true
echo ""
echo "💡 提示："
echo "  - 运行 'pnpm install' 重新安装依赖（如果使用了 --deep）"
echo "  - 运行 'pnpm dev' 重新构建项目"
echo "  - 如果 System Data 仍然很大，可能是其他应用或系统缓存"

