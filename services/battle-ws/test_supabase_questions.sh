#!/bin/bash

# 測試 Supabase 題目獲取腳本

echo "🧪 測試 Supabase 題目獲取"
echo "================================"
echo ""

# 檢查環境變量
echo "📋 檢查環境變量..."
if [ -f .env ]; then
    echo "✅ 找到 .env 文件"
    source .env
    echo "   NEXTJS_API_URL: ${NEXTJS_API_URL:-未設置}"
    echo "   INTERNAL_API_KEY: ${INTERNAL_API_KEY:+已設置（隱藏）}"
else
    echo "❌ 未找到 .env 文件"
    exit 1
fi

echo ""
echo "🔍 檢查 Next.js API 連接..."
API_URL="${NEXTJS_API_URL:-http://localhost:3000}"
API_KEY="${INTERNAL_API_KEY:-}"

# 測試 API 連接
if curl -s -f "${API_URL}/api/health" > /dev/null 2>&1; then
    echo "✅ Next.js API 可訪問: ${API_URL}"
else
    echo "⚠️  Next.js API 無法訪問: ${API_URL}"
    echo "   請確認 Next.js 服務器正在運行"
fi

echo ""
echo "📡 測試 PVE Questions API..."
echo "   端點: ${API_URL}/api/play/pve/questions"
echo ""

# 構建請求
REQUEST_BODY='{"userId":"dev_user","numQuestions":5,"focusOnWeakness":false}'

# 發送請求
if [ -n "$API_KEY" ]; then
    RESPONSE=$(curl -s -w "\n%{http_code}" -X POST "${API_URL}/api/play/pve/questions" \
        -H "Content-Type: application/json" \
        -H "x-internal-api-key: ${API_KEY}" \
        -d "${REQUEST_BODY}")
else
    RESPONSE=$(curl -s -w "\n%{http_code}" -X POST "${API_URL}/api/play/pve/questions" \
        -H "Content-Type: application/json" \
        -d "${REQUEST_BODY}")
fi

# 分離響應體和狀態碼
HTTP_BODY=$(echo "$RESPONSE" | sed '$d')
HTTP_CODE=$(echo "$RESPONSE" | tail -n 1)

echo "   狀態碼: ${HTTP_CODE}"

if [ "$HTTP_CODE" = "200" ]; then
    echo "✅ API 請求成功"
    echo ""
    echo "📊 響應內容:"
    echo "$HTTP_BODY" | jq '.' 2>/dev/null || echo "$HTTP_BODY"
    
    # 檢查題目數量
    QUESTION_COUNT=$(echo "$HTTP_BODY" | jq '.questions | length' 2>/dev/null || echo "0")
    if [ "$QUESTION_COUNT" -gt 0 ]; then
        echo ""
        echo "✅ 成功獲取 ${QUESTION_COUNT} 道題目"
        
        # 檢查題目來源
        echo ""
        echo "📚 題目來源分析:"
        echo "$HTTP_BODY" | jq '.questions[] | {id: .id, hasText: (.question_text != null), hasOptions: (.options != null), hasAnswer: (.correct_answer != null)}' 2>/dev/null || echo "無法解析題目結構"
    else
        echo ""
        echo "⚠️  警告：題目列表為空"
    fi
else
    echo "❌ API 請求失敗"
    echo ""
    echo "錯誤響應:"
    echo "$HTTP_BODY"
    echo ""
    echo "💡 可能的原因:"
    echo "   1. Next.js 服務器未運行"
    echo "   2. Supabase 連接失敗"
    echo "   3. seed_questions 表沒有數據"
    echo "   4. API Key 驗證失敗"
fi

echo ""
echo "================================"
echo "✅ 測試完成"

