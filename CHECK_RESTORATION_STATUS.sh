#!/bin/bash

echo "🔍 檢查多文件統整功能恢復狀態"
echo "========================================"
echo ""

# 檢查 SummaryWorkbench.tsx
echo "1️⃣ 檢查 SummaryWorkbench.tsx"
if grep -q "selectedFileIds" apps/web/components/ask/SummaryWorkbench.tsx; then
    echo "✅ selectedFileIds state 存在"
else
    echo "❌ selectedFileIds state 缺失"
fi

if grep -q "pendingAnalysisIds" apps/web/components/ask/SummaryWorkbench.tsx; then
    echo "✅ pendingAnalysisIds state 存在"
else
    echo "❌ pendingAnalysisIds state 缺失"
fi

if grep -q "FileSelectionChips" apps/web/components/ask/SummaryWorkbench.tsx; then
    echo "✅ FileSelectionChips import 存在"
else
    echo "❌ FileSelectionChips import 缺失"
fi

if grep -q "showConfirmToast" apps/web/components/ask/SummaryWorkbench.tsx; then
    echo "✅ showConfirmToast state 存在"
else
    echo "❌ showConfirmToast state 缺失"
fi

if grep -q "重新統整" apps/web/components/ask/SummaryWorkbench.tsx; then
    echo "✅ 重新統整按鈕存在"
else
    echo "❌ 重新統整按鈕缺失"
fi

echo ""
echo "2️⃣ 檢查 ProgressiveAnalysisCard.tsx"
if grep -q "documentNames" apps/web/components/ask/ProgressiveAnalysisCard.tsx; then
    echo "✅ documentNames state 存在"
else
    echo "❌ documentNames state 缺失"
fi

if grep -q "fetchDocumentNames" apps/web/components/ask/ProgressiveAnalysisCard.tsx; then
    echo "✅ fetchDocumentNames 邏輯存在"
else
    echo "❌ fetchDocumentNames 邏輯缺失"
fi

if grep -q "selectedDocIds" apps/web/components/ask/ProgressiveAnalysisCard.tsx; then
    echo "✅ selectedDocIds prop 存在"
else
    echo "❌ selectedDocIds prop 缺失"
fi

echo ""
echo "3️⃣ 檢查相關文件"
files=(
    "apps/web/components/ask/FileSelectionChips.tsx"
    "apps/web/hooks/useSummaryWorkbench.ts"
    "apps/web/app/api/rag/analyze-object/route.ts"
)

for file in "${files[@]}"; do
    if [ -f "$file" ]; then
        echo "✅ $file 存在"
    else
        echo "❌ $file 缺失"
    fi
done

echo ""
echo "4️⃣ 對比關鍵差異"
echo "檢查 SummaryWorkbench.tsx 行數："
wc -l apps/web/components/ask/SummaryWorkbench.tsx CORRECT_SummaryWorkbench.tsx 2>/dev/null | tail -1

echo ""
echo "檢查 ProgressiveAnalysisCard.tsx 行數："
wc -l apps/web/components/ask/ProgressiveAnalysisCard.tsx CORRECT_ProgressiveAnalysisCard.tsx 2>/dev/null | tail -1

echo ""
echo "========================================"
echo "🏁 檢查完成"
