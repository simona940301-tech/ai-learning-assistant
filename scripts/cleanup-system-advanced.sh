#!/bin/bash

# 🧹 高级系统数据清理脚本
# 处理 Time Machine 快照删除失败的情况

set -e

echo "🧹 开始高级系统数据清理..."
echo ""

# 1. 尝试禁用 Time Machine 本地快照（如果启用）
echo "📸 处理 Time Machine 本地快照..."
if tmutil listlocalsnapshots / &>/dev/null; then
  echo "   发现本地快照，尝试删除..."
  
  # 方法 1: 逐个删除快照
  for snapshot in $(tmutil listlocalsnapshots / 2>/dev/null | grep "com.apple.TimeMachine" | sed 's/com.apple.TimeMachine.//'); do
    echo "   尝试删除快照: $snapshot"
    sudo tmutil deletelocalsnapshot "$snapshot" 2>/dev/null || echo "   ⚠️  无法删除快照: $snapshot"
  done
  
  # 方法 2: 尝试禁用本地快照功能
  echo "   尝试禁用本地快照功能..."
  sudo tmutil disablelocal 2>/dev/null || echo "   ⚠️  无法禁用本地快照"
  
  echo "✅ Time Machine 快照处理完成"
else
  echo "✅ 没有找到本地快照"
fi
echo ""

# 2. 清理大型缓存目录
echo "📦 清理大型缓存目录..."

# Xcode 缓存（如果存在）
if [ -d ~/Library/Developer/Xcode/DerivedData ]; then
  XCODE_SIZE=$(du -sh ~/Library/Developer/Xcode/DerivedData 2>/dev/null | cut -f1 || echo "0")
  echo "   清理 Xcode DerivedData: $XCODE_SIZE"
  rm -rf ~/Library/Developer/Xcode/DerivedData/* 2>/dev/null || true
  echo "✅ Xcode DerivedData 已清理"
fi

# Xcode 归档（如果存在）
if [ -d ~/Library/Developer/Xcode/Archives ]; then
  ARCHIVE_SIZE=$(du -sh ~/Library/Developer/Xcode/Archives 2>/dev/null | cut -f1 || echo "0")
  echo "   清理 Xcode 归档: $ARCHIVE_SIZE"
  rm -rf ~/Library/Developer/Xcode/Archives/* 2>/dev/null || true
  echo "✅ Xcode 归档已清理"
fi

# Docker 缓存（如果使用 Docker）
if command -v docker &> /dev/null; then
  echo "   清理 Docker 缓存..."
  docker system prune -f 2>/dev/null || true
  echo "✅ Docker 缓存已清理"
fi

# pnpm 缓存
if command -v pnpm &> /dev/null; then
  echo "   清理 pnpm 缓存..."
  pnpm store prune 2>/dev/null || true
  echo "✅ pnpm 缓存已清理"
fi

echo ""

# 3. 清理其他大型目录
echo "🗂️  清理其他大型目录..."

# 清理下载文件夹中的大文件（可选，谨慎使用）
# find ~/Downloads -type f -size +100M -mtime +30 -ls 2>/dev/null | head -10

# 清理垃圾桶（如果很大）
TRASH_SIZE=$(du -sh ~/.Trash 2>/dev/null | cut -f1 || echo "0")
if [ "$TRASH_SIZE" != "0" ] && [ "$TRASH_SIZE" != "" ]; then
  echo "   垃圾桶大小: $TRASH_SIZE"
  echo "   提示: 可以手动清空垃圾桶来释放空间"
fi

echo ""

# 4. 显示空间使用情况
echo "📊 当前空间使用情况:"
df -h / | tail -1
echo ""

echo "✅ 高级系统数据清理完成！"
echo ""
echo "💡 如果 Time Machine 快照仍然存在，可以尝试："
echo "   1. 重启 Mac（有时可以释放被占用的快照）"
echo "   2. 在系统设置中关闭 Time Machine"
echo "   3. 使用第三方工具如 CleanMyMac 或 DaisyDisk 来清理"

