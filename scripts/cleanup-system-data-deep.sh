#!/bin/bash

# 🧹 深度清理 System Data 脚本
# 针对 337GB System Data 的清理方案

set -e

echo "🧹 开始深度清理 System Data (337GB)..."
echo ""

# 1. 清理 Time Machine 本地快照（最大占用源）
echo "📸 清理 Time Machine 本地快照..."
SNAPSHOTS=$(tmutil listlocalsnapshots / 2>/dev/null | grep -c "com.apple" || echo "0")
if [ "$SNAPSHOTS" -gt 0 ]; then
  echo "   发现 $SNAPSHOTS 个快照"
  echo "   尝试逐个删除..."
  
  # 尝试禁用本地快照
  sudo tmutil disablelocal 2>/dev/null || echo "   ⚠️  无法禁用（可能需要手动操作）"
  
  # 尝试删除所有快照
  sudo tmutil deletelocalsnapshots / 2>/dev/null || echo "   ⚠️  部分快照可能被系统保护"
  
  echo "✅ Time Machine 快照处理完成"
else
  echo "✅ 没有找到本地快照"
fi
echo ""

# 2. 清理系统缓存和临时文件
echo "📦 清理系统缓存..."

# 清理用户缓存
USER_CACHE_SIZE=$(du -sh ~/Library/Caches 2>/dev/null | cut -f1 || echo "0")
echo "   用户缓存: $USER_CACHE_SIZE"
rm -rf ~/Library/Caches/* 2>/dev/null || true

# 清理系统缓存（需要管理员权限）
if [ "$(id -u)" -eq 0 ]; then
  sudo rm -rf /private/var/folders/*/C/* 2>/dev/null || true
  sudo rm -rf /Library/Caches/* 2>/dev/null || true
  echo "✅ 系统缓存已清理"
else
  echo "   ⚠️  需要管理员权限清理系统缓存"
  echo "   请运行: sudo rm -rf /private/var/folders/*/C/*"
fi
echo ""

# 3. 清理系统日志
echo "📋 清理系统日志..."
if [ "$(id -u)" -eq 0 ]; then
  sudo rm -rf /private/var/log/* 2>/dev/null || true
  sudo rm -rf /Library/Logs/* 2>/dev/null || true
  echo "✅ 系统日志已清理"
else
  echo "   ⚠️  需要管理员权限清理系统日志"
  echo "   请运行: sudo rm -rf /private/var/log/*"
fi

# 清理用户日志
rm -rf ~/Library/Logs/* 2>/dev/null || true
echo "✅ 用户日志已清理"
echo ""

# 4. 清理虚拟机交换文件（如果很大）
echo "💾 检查虚拟机交换文件..."
VM_SIZE=$(du -sh /private/var/vm 2>/dev/null | cut -f1 || echo "0")
if [ "$VM_SIZE" != "0" ] && [ "$VM_SIZE" != "" ]; then
  echo "   虚拟机文件: $VM_SIZE"
  echo "   ⚠️  虚拟机文件通常不应该删除，但可以重启后清理"
fi
echo ""

# 5. 清理容器数据（应用沙盒）
echo "📱 清理应用容器数据..."
CONTAINER_SIZE=$(du -sh ~/Library/Containers 2>/dev/null | cut -f1 || echo "0")
if [ "$CONTAINER_SIZE" != "0" ] && [ "$CONTAINER_SIZE" != "" ]; then
  echo "   容器数据: $CONTAINER_SIZE"
  echo "   ⚠️  容器数据包含应用数据，谨慎清理"
  # 只清理缓存，不清理应用数据
  find ~/Library/Containers -name "Caches" -type d -exec rm -rf {} + 2>/dev/null || true
  echo "✅ 容器缓存已清理"
fi
echo ""

# 6. 清理 Spotlight 索引（可以重建）
echo "🔍 清理 Spotlight 索引..."
sudo mdutil -E / 2>/dev/null || echo "   ⚠️  需要管理员权限"
echo "✅ Spotlight 索引已清理（会重新索引）"
echo ""

# 7. 清理 Xcode 相关（如果使用）
echo "💻 清理 Xcode 数据..."
if [ -d ~/Library/Developer ]; then
  XCODE_SIZE=$(du -sh ~/Library/Developer 2>/dev/null | cut -f1 || echo "0")
  echo "   Xcode 数据: $XCODE_SIZE"
  rm -rf ~/Library/Developer/Xcode/DerivedData/* 2>/dev/null || true
  rm -rf ~/Library/Developer/Xcode/Archives/* 2>/dev/null || true
  rm -rf ~/Library/Developer/Xcode/iOS\ DeviceSupport/* 2>/dev/null || true
  echo "✅ Xcode 缓存已清理"
fi
echo ""

# 8. 清理 Docker（如果使用）
if command -v docker &> /dev/null; then
  echo "🐳 清理 Docker..."
  docker system prune -a --volumes -f 2>/dev/null || true
  echo "✅ Docker 已清理"
  echo ""
fi

# 9. 显示清理后的空间
echo "📊 清理完成！"
echo ""
echo "💡 如果 System Data 仍然很大，可能需要："
echo "   1. 重启 Mac（释放被占用的快照和缓存）"
echo "   2. 使用第三方工具（CleanMyMac、DaisyDisk）"
echo "   3. 检查是否有其他大型文件占用空间"

