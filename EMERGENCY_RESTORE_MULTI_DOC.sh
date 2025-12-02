#!/bin/bash

# 緊急恢復多文件統整功能
# 本腳本將恢復被覆蓋的文件到正確版本

echo "🚨 緊急恢復多文件統整功能..."
echo ""

# 備份當前狀態
echo "📦 備份當前狀態..."
cp apps/web/components/ask/SummaryWorkbench.tsx apps/web/components/ask/SummaryWorkbench.tsx.broken
cp apps/web/components/ask/ProgressiveAnalysisCard.tsx apps/web/components/ask/ProgressiveAnalysisCard.tsx.broken
echo "✅ 備份完成"
echo ""

# 檢查是否存在我們的文件
if [ ! -f "apps/web/hooks/useSummaryWorkbench.ts" ]; then
    echo "❌ 錯誤: useSummaryWorkbench.ts 不存在"
    echo "   這個文件是多文件統整功能的核心"
    echo ""
    echo "需要手動恢復此文件,或者告訴我重新創建"
    exit 1
fi

if [ ! -f "apps/web/components/ask/FileSelectionChips.tsx" ]; then
    echo "❌ 錯誤: FileSelectionChips.tsx 不存在"
    echo "   這個文件用於選擇多個文件"
    echo ""
    echo "需要手動恢復此文件,或者告訴我重新創建"
    exit 1
fi

if [ ! -f "apps/web/app/api/rag/analyze-object/route.ts" ]; then
    echo "❌ 錯誤: analyze-object API route 不存在"
    echo "   這個 API 用於分析多個文件"
    echo ""
    echo "需要手動恢復此文件,或者告訴我重新創建"
    exit 1
fi

echo "✅ 所有必需文件都存在"
echo ""
echo "📝 問題診斷:"
echo "   - SummaryWorkbench.tsx 被改成了舊版 Elite RAG 版本"
echo "   - ProgressiveAnalysisCard.tsx 也被改成了舊版"
echo "   - 需要恢復到支持多文件統整的版本"
echo ""
echo "🔧 解決方案:"
echo "   1. 告訴 Claude 重新實現 SummaryWorkbench.tsx (多文件版本)"
echo "   2. 告訴 Claude 重新實現 ProgressiveAnalysisCard.tsx (多文件版本)"
echo "   3. 或者從 git stash/commit 恢復"
echo ""
echo "💡 建議:"
echo "   git stash  # 暫存當前錯誤的修改"
echo "   git log --oneline -10  # 查看最近的 commits"
echo "   git show <commit-hash>:apps/web/components/ask/SummaryWorkbench.tsx  # 查看歷史版本"
