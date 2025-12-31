#!/bin/bash

# 🚨 紧急清理 337GB System Data 脚本
# 针对 macOS System Data 占用过多的问题

set -e

echo "🚨 开始清理 337GB System Data..."
echo ""

# 1. 强制清理 Time Machine 本地快照（最可能的原因）
echo "📸 步骤 1: 强制清理 Time Machine 本地快照..."
echo "   这是 System Data 占用过多的最常见原因"
echo ""

# 检查快照
SNAPSHOTS=$(tmutil listlocalsnapshots / 2>/dev/null | grep "com.apple" | wc -l | tr -d ' ')
echo "   发现 $SNAPSHOTS 个本地快照"

if [ "$SNAPSHOTS" -gt 0 ]; then
  echo ""
  echo "   ⚠️  需要手动执行以下命令（需要管理员权限）："
  echo ""
  echo "   方法 1: 禁用本地快照后删除"
  echo "   sudo tmutil disablelocal"
  echo "   sudo tmutil deletelocalsnapshots /"
  echo ""
  echo "   方法 2: 重启后删除（推荐）"
  echo "   # 重启 Mac，然后运行："
  echo "   sudo tmutil deletelocalsnapshots /"
  echo ""
  echo "   方法 3: 通过系统设置"
  echo "   系统设置 > 通用 > 存储空间 > 推荐 > 清理 Time Machine 快照"
  echo ""
fi
echo ""

# 2. 清理系统缓存（需要管理员权限）
echo "📦 步骤 2: 清理系统缓存..."
echo "   需要管理员权限，请手动执行："
echo ""
echo "   sudo rm -rf /private/var/folders/*/C/*"
echo "   sudo rm -rf /Library/Caches/*"
echo "   sudo rm -rf /System/Library/Caches/*"
echo ""

# 3. 清理系统日志
echo "📋 步骤 3: 清理系统日志..."
echo "   sudo rm -rf /private/var/log/*"
echo "   sudo rm -rf /Library/Logs/*"
echo ""

# 4. 清理虚拟机文件（重启后会自动清理）
echo "💾 步骤 4: 虚拟机交换文件..."
echo "   重启 Mac 后，交换文件会自动清理"
echo ""

# 5. 清理 Spotlight 索引
echo "🔍 步骤 5: 重建 Spotlight 索引..."
echo "   sudo mdutil -E /"
echo "   这会清理索引并重新建立（可能需要一些时间）"
echo ""

# 6. 清理用户数据（可以自动执行）
echo "📱 步骤 6: 清理用户缓存和数据..."
USER_CACHE_SIZE=$(du -sh ~/Library/Caches 2>/dev/null | cut -f1 || echo "0")
echo "   用户缓存: $USER_CACHE_SIZE"
rm -rf ~/Library/Caches/* 2>/dev/null || true

# 清理容器缓存
find ~/Library/Containers -name "Caches" -type d -exec rm -rf {} + 2>/dev/null || true
find ~/Library/Group\ Containers -name "Caches" -type d -exec rm -rf {} + 2>/dev/null || true

echo "✅ 用户缓存已清理"
echo ""

# 7. 清理 Xcode（如果使用）
if [ -d ~/Library/Developer/Xcode ]; then
  echo "💻 步骤 7: 清理 Xcode..."
  XCODE_SIZE=$(du -sh ~/Library/Developer/Xcode 2>/dev/null | cut -f1 || echo "0")
  echo "   Xcode 数据: $XCODE_SIZE"
  rm -rf ~/Library/Developer/Xcode/DerivedData/* 2>/dev/null || true
  rm -rf ~/Library/Developer/Xcode/Archives/* 2>/dev/null || true
  rm -rf ~/Library/Developer/Xcode/iOS\ DeviceSupport/* 2>/dev/null || true
  echo "✅ Xcode 缓存已清理"
  echo ""
fi

# 8. 显示当前空间使用
echo "📊 当前空间使用："
df -h / | tail -1
echo ""

echo "✅ 自动清理完成！"
echo ""
echo "🎯 下一步操作（需要管理员权限）："
echo ""
echo "1. 清理 Time Machine 快照（最重要）："
echo "   sudo tmutil disablelocal"
echo "   sudo tmutil deletelocalsnapshots /"
echo ""
echo "2. 清理系统缓存："
echo "   sudo rm -rf /private/var/folders/*/C/*"
echo ""
echo "3. 清理系统日志："
echo "   sudo rm -rf /private/var/log/*"
echo ""
echo "4. 重启 Mac（推荐）："
echo "   重启后，系统会自动清理一些被占用的快照和缓存"
echo ""
echo "💡 如果仍然很大，考虑使用第三方工具："
echo "   - CleanMyMac X"
echo "   - DaisyDisk"
echo "   - OmniDiskSweeper"

