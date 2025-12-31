#!/bin/bash

# 🚨 緊急恢復：多文件統整功能
# 本腳本將恢復被覆蓋的文件到正確的多文件統整版本

echo "🔧 開始恢復多文件統整功能..."
echo ""

# 1. 備份當前（錯誤的）版本
echo "📦 備份當前錯誤版本..."
cp apps/web/components/ask/SummaryWorkbench.tsx apps/web/components/ask/SummaryWorkbench.tsx.old-single-file
cp apps/web/components/ask/ProgressiveAnalysisCard.tsx apps/web/components/ask/ProgressiveAnalysisCard.tsx.old-single-file
echo "✅ 備份完成"
echo "   - SummaryWorkbench.tsx.old-single-file"
echo "   - ProgressiveAnalysisCard.tsx.old-single-file"
echo ""

# 2. 恢復正確版本
echo "🔄 恢復正確的多文件統整版本..."
cp CORRECT_SummaryWorkbench.tsx apps/web/components/ask/SummaryWorkbench.tsx
cp CORRECT_ProgressiveAnalysisCard.tsx apps/web/components/ask/ProgressiveAnalysisCard.tsx
echo "✅ 恢復完成"
echo ""

# 3. 驗證文件是否存在
echo "🔍 驗證依賴文件..."

if [ -f "apps/web/hooks/useSummaryWorkbench.ts" ]; then
    echo "✅ useSummaryWorkbench.ts 存在"
else
    echo "❌ 缺少 useSummaryWorkbench.ts"
fi

if [ -f "apps/web/components/ask/FileSelectionChips.tsx" ]; then
    echo "✅ FileSelectionChips.tsx 存在"
else
    echo "❌ 缺少 FileSelectionChips.tsx"
fi

if [ -f "apps/web/app/api/rag/analyze-object/route.ts" ]; then
    echo "✅ analyze-object API route 存在"
else
    echo "❌ 缺少 analyze-object API route"
fi

echo ""
echo "📊 恢復摘要:"
echo ""
echo "✅ 已恢復的功能:"
echo "   1. 多文件選擇 UI (FileSelectionChips)"
echo "   2. 確認 Toast UI (選擇改變時)"
echo "   3. 重新統整按鈕"
echo "   4. 多文件統整邏輯 (documentId + relatedDocIds)"
echo "   5. 來源標籤支持 (sourceDocId in schema)"
echo "   6. 修復無限循環 bug (useEffect dependencies)"
echo ""
echo "🎯 核心改進:"
echo "   - State 分離: selectedFileIds (用戶選擇) vs pendingAnalysisIds (實際分析)"
echo "   - Component Key: key={pendingAnalysisIds.join(',')} 強制重新掛載"
echo "   - Source Attribution: documentNames mapping for question sources"
echo "   - Fixed Infinite Loop: Removed 'submit' from useEffect dependencies"
echo ""
echo "🧪 測試建議:"
echo "   1. 單文件上傳測試 (baseline)"
echo "   2. 多文件上傳測試 (3個同科目PDF)"
echo "   3. 重新選擇測試 (改變選擇 + 重新統整)"
echo "   4. 來源標籤驗證 (檢查考題是否顯示來源)"
echo ""
echo "📚 相關文檔:"
echo "   - MULTI_DOCUMENT_SUMMARY_FIX.md"
echo "   - MULTI_DOCUMENT_TESTING_GUIDE.md"
echo ""
echo "✨ 恢復完成！現在可以測試多文件統整功能了。"
