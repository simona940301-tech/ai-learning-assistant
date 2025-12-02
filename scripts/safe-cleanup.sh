#!/bin/bash

# 🧹 安全清理脚本 - 只清理缓存，不影响项目运行
# 所有清理的文件都可以自动重新生成

set -e

echo "🧹 开始安全清理（不影响项目运行）..."
echo ""

# 记录清理前的空间
BEFORE=$(du -sh . 2>/dev/null | cut -f1)
echo "📊 清理前项目大小: $BEFORE"
echo ""

# 1. 清理 Next.js 构建缓存（可以重新构建）
echo "📦 清理 Next.js 构建缓存 (.next)..."
find . -type d -name ".next" -not -path "*/node_modules/*" -exec rm -rf {} + 2>/dev/null || true
echo "✅ Next.js 构建缓存已清理（运行 'pnpm dev' 时会自动重新构建）"
echo ""

# 2. 清理 TypeScript 构建输出（可以重新构建）
echo "📝 清理 TypeScript 构建输出 (dist, build)..."
find . -type d -name "dist" -not -path "*/node_modules/*" -exec rm -rf {} + 2>/dev/null || true
find . -type d -name "build" -not -path "*/node_modules/*" -exec rm -rf {} + 2>/dev/null || true
echo "✅ TypeScript 构建输出已清理"
echo ""

# 3. 清理日志文件（可以重新生成）
echo "📋 清理日志文件..."
find . -type f -name "*.log" -not -path "*/node_modules/*" -delete 2>/dev/null || true
find . -type f -name "*.log.*" -not -path "*/node_modules/*" -delete 2>/dev/null || true
echo "✅ 日志文件已清理"
echo ""

# 4. 清理临时文件
echo "🗂️  清理临时文件..."
find . -type f -name "*.tmp" -not -path "*/node_modules/*" -delete 2>/dev/null || true
find . -type f -name "*.temp" -not -path "*/node_modules/*" -delete 2>/dev/null || true
find . -type f -name ".DS_Store" -not -path "*/node_modules/*" -delete 2>/dev/null || true
echo "✅ 临时文件已清理"
echo ""

# 5. 清理 Turbo 缓存（可以重新生成）
echo "⚡ 清理 Turbo 缓存..."
find . -type d -name ".turbo" -not -path "*/node_modules/*" -exec rm -rf {} + 2>/dev/null || true
echo "✅ Turbo 缓存已清理"
echo ""

# 6. 清理 ESLint 缓存（可以重新生成）
echo "🔍 清理 ESLint 缓存..."
find . -type f -name ".eslintcache" -not -path "*/node_modules/*" -delete 2>/dev/null || true
echo "✅ ESLint 缓存已清理"
echo ""

# 7. 清理 Parcel 缓存（如果有）
echo "📦 清理 Parcel 缓存..."
find . -type d -name ".parcel-cache" -not -path "*/node_modules/*" -exec rm -rf {} + 2>/dev/null || true
find . -type d -name ".cache" -not -path "*/node_modules/*" -exec rm -rf {} + 2>/dev/null || true
echo "✅ Parcel 缓存已清理"
echo ""

# 8. 清理 TypeScript 构建信息（可以重新生成）
echo "📝 清理 TypeScript 构建信息..."
find . -type f -name "*.tsbuildinfo" -not -path "*/node_modules/*" -delete 2>/dev/null || true
echo "✅ TypeScript 构建信息已清理"
echo ""

# 记录清理后的空间
AFTER=$(du -sh . 2>/dev/null | cut -f1)
echo "📊 清理后项目大小: $AFTER"
echo ""

echo "✅ 安全清理完成！"
echo ""
echo "💡 提示："
echo "  - 所有清理的文件都可以自动重新生成"
echo "  - 源代码、配置文件和依赖都没有被删除"
echo "  - 运行 'pnpm dev' 时会自动重新构建项目"
echo "  - 项目功能完全不受影响"

