#!/bin/bash

# 快速測試重點統整功能
# 執行前請確保：
# 1. 已執行 pnpm install
# 2. 已在 Supabase Dashboard 執行 migration
# 3. 開發伺服器正在運行

echo "🔍 重點統整功能快速測試"
echo "================================"
echo ""

# 1. 檢查 pdf-parse 安裝
echo "✓ 檢查 1: pdf-parse 模組"
if [ -f "apps/web/node_modules/pdf-parse/package.json" ]; then
    VERSION=$(cat apps/web/node_modules/pdf-parse/package.json | grep '"version"' | head -1 | cut -d'"' -f4)
    echo "  ✅ pdf-parse 已安裝 (v$VERSION)"
else
    echo "  ❌ pdf-parse 未安裝"
    echo "  → 執行: pnpm --filter web install"
    exit 1
fi

echo ""

# 2. 檢查環境變數
echo "✓ 檢查 2: 環境變數"
if [ -f "apps/web/.env.local" ]; then
    if grep -q "GEMINI_API_KEY" apps/web/.env.local; then
        echo "  ✅ GEMINI_API_KEY 已設置"
    else
        echo "  ⚠️  GEMINI_API_KEY 未設置（AI 摘要將無法生成）"
        echo "  → 添加: echo 'GEMINI_API_KEY=your-key' >> apps/web/.env.local"
    fi

    if grep -q "NEXT_PUBLIC_SUPABASE_URL" apps/web/.env.local; then
        echo "  ✅ Supabase 配置存在"
    else
        echo "  ❌ Supabase 配置缺失"
    fi
else
    echo "  ❌ .env.local 文件不存在"
    exit 1
fi

echo ""

# 3. 創建測試文件
echo "✓ 檢查 3: 創建測試文件"
cat > test-summary-upload.txt << 'EOF'
學測數學重點整理

一、數與式
1. 指數律：a^m × a^n = a^(m+n)
2. 對數律：log(ab) = log(a) + log(b)
3. 複數運算：i² = -1

二、方程式
1. 一元二次方程式：ax² + bx + c = 0
2. 判別式：Δ = b² - 4ac
3. 公式解：x = (-b ± √Δ) / 2a

三、函數與圖形
1. 一次函數：y = mx + b
2. 二次函數頂點：(-b/2a, f(-b/2a))
3. 對稱軸：x = -b/2a

四、數列與級數
1. 等差數列第 n 項：an = a1 + (n-1)d
2. 等比數列第 n 項：an = a1 × r^(n-1)
3. 等差級數和：Sn = n(a1 + an)/2

五、排列組合
1. 排列：P(n,r) = n!/(n-r)!
2. 組合：C(n,r) = n!/(r!(n-r)!)
3. 二項式定理：(a+b)^n 展開式

重點提醒：
- 熟記所有公式
- 注意定義域和值域限制
- 多做歷屆試題
- 掌握計算技巧
EOF

echo "  ✅ 測試文件已創建: test-summary-upload.txt"
echo "  📄 文件大小: $(wc -c < test-summary-upload.txt) bytes"

echo ""

# 4. 檢查伺服器
echo "✓ 檢查 4: 開發伺服器"
if curl -s http://localhost:3000/api/health > /dev/null 2>&1; then
    echo "  ✅ 開發伺服器正在運行"
else
    echo "  ⚠️  開發伺服器未運行"
    echo "  → 啟動: pnpm --filter web dev"
fi

echo ""
echo "================================"
echo "📋 下一步操作："
echo ""
echo "1. 確保已執行資料庫 migration"
echo "   → https://supabase.com/dashboard/project/umzqjgxsetsmwzhniemw/sql/new"
echo "   → 執行 supabase/migrations/20251123_create_rag_notebook_schema.sql"
echo ""
echo "2. 啟動開發伺服器（如果未運行）"
echo "   → pnpm --filter web dev"
echo ""
echo "3. 訪問應用並測試"
echo "   → http://localhost:3000/ask"
echo "   → 切換到「重點統整」Tab"
echo "   → 上傳 test-summary-upload.txt"
echo "   → 點擊「開始分析」"
echo ""
echo "4. 驗證結果"
echo "   ✓ 無 403 或 500 錯誤"
echo "   ✓ 成功生成摘要"
echo "   ✓ 顯示關鍵詞標籤"
echo "   ✓ 可以存到筆記本"
echo ""
echo "================================"
echo "📚 詳細文檔："
echo "   → FINAL_FIX_REPORT.md（最終修復報告）"
echo "   → CRITICAL_FIX_SUMMARY_UPLOAD.md（詳細指南）"
echo ""
