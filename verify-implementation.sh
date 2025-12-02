#!/bin/bash

echo "🔍 驗證 Super Mario 風格實作"
echo "================================"
echo ""

# 檢查新建檔案
echo "📁 檢查新建檔案..."
files=(
  "apps/web/styles/mario-design-system.css"
  "apps/web/lib/haptics.ts"
  "apps/web/components/play/RadarWaveAnimation.tsx"
  "apps/web/components/play/DataStreamAnimation.tsx"
  "apps/web/components/play/AnimatedAvatar.tsx"
  "apps/web/components/play/MatchmakingMiniGame.tsx"
  "apps/web/components/ui/count-up.tsx"
  "MARIO_STYLE_IMPLEMENTATION_COMPLETE.md"
  "CRITICAL_FIXES_APPLIED.md"
  "TESTING_CHECKLIST.md"
)

for file in "${files[@]}"; do
  if [ -f "$file" ]; then
    echo "  ✅ $file"
  else
    echo "  ❌ $file (缺失)"
  fi
done

echo ""
echo "🔧 檢查關鍵修改..."

# 檢查 layout.tsx
if grep -q "mario-design-system.css" apps/web/app/layout.tsx; then
  echo "  ✅ layout.tsx - Mario CSS 已引入"
else
  echo "  ❌ layout.tsx - Mario CSS 未引入"
fi

if grep -q "ThemeProvider" apps/web/app/layout.tsx; then
  echo "  ✅ layout.tsx - ThemeProvider 已掛載"
else
  echo "  ❌ layout.tsx - ThemeProvider 未掛載"
fi

# 檢查 globals.css
if grep -q "overflow: hidden; */ /\* ❌" apps/web/app/globals.css; then
  echo "  ✅ globals.css - 全域滾動鎖定已移除"
else
  echo "  ❌ globals.css - 全域滾動鎖定仍存在"
fi

if grep -q '\[data-page="ask"\]' apps/web/app/globals.css; then
  echo "  ✅ globals.css - Ask 頁面條件鎖定已添加"
else
  echo "  ❌ globals.css - Ask 頁面條件鎖定未添加"
fi

# 檢查 ask/page.tsx
if grep -q 'data-page="ask"' apps/web/app/\(app\)/ask/page.tsx; then
  echo "  ✅ ask/page.tsx - data-page 屬性已添加"
else
  echo "  ❌ ask/page.tsx - data-page 屬性未添加"
fi

echo ""
echo "📊 統計..."
echo "  新建檔案: ${#files[@]} 個"
echo "  總行數: $(wc -l apps/web/styles/mario-design-system.css apps/web/lib/haptics.ts apps/web/components/play/*.tsx apps/web/components/ui/count-up.tsx 2>/dev/null | tail -1 | awk '{print $1}')"

echo ""
echo "🚀 開發服務器狀態..."
if lsof -i:3000 > /dev/null 2>&1; then
  echo "  ✅ Port 3000 正在運行"
  echo "  🔗 http://127.0.0.1:3000"
else
  echo "  ⚠️ Port 3000 未運行"
  echo "  💡 執行: pnpm --filter web dev"
fi

echo ""
echo "✨ 驗證完成!"
