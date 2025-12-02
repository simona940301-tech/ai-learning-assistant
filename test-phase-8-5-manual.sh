#!/bin/bash

# Phase 8.5 Manual Test Script
# Run this after executing SEED_TEST_PACKS_QUESTIONS.sql in Supabase

echo "=== Phase 8.5 手動測試腳本 ==="
echo ""

echo "📋 測試步驟："
echo "1. 已在 Supabase SQL Editor 中執行 SEED_TEST_PACKS_QUESTIONS.sql"
echo "2. 確認看到 'Created pack/chapter/question' 訊息"
echo ""

echo "🔍 步驟 1：檢查測試題目是否存在"
echo "執行：curl http://localhost:3000/api/test-question-id"
echo "結果："
curl -s http://localhost:3000/api/test-question-id | jq .
echo ""

echo "💾 步驟 2：測試 Backpack 路徑（應該成功）"
echo "執行：curl -X POST http://localhost:3000/api/mcp/core ..."
echo "結果："
curl -s -X POST http://localhost:3000/api/mcp/core \
  -H "Content-Type: application/json" \
  -d '{
    "action": "finalize_explain_card",
    "args": {
      "cardId": "test-backpack",
      "outputs": {
        "userId": "e770f9cd-52a7-43de-b983-70f6f78d2f53",
        "explainResult": {
          "markdown": "# Backpack Test\n\nThis should save to backpack_notes.",
          "status": "full",
          "meta": {"layer": "universal"}
        },
        "payload": {"text": "Test question", "source": "ask"}
      }
    }
  }' | jq '.result'
echo ""

echo "❓ 步驟 3：如果測試題目存在，測試 Error Book 路徑"
echo "執行：curl -X POST http://localhost:3000/api/mcp/core ..."
QUESTION_ID=$(curl -s http://localhost:3000/api/test-question-id | jq -r '.questionId // empty')
if [ -n "$QUESTION_ID" ]; then
  echo "找到測試題目 ID: $QUESTION_ID"
  echo "測試 Error Book 路徑："
  curl -s -X POST http://localhost:3000/api/mcp/core \
    -H "Content-Type: application/json" \
    -d "{
      \"action\": \"finalize_explain_card\",
      \"args\": {
        \"cardId\": \"test-error-book\",
        \"outputs\": {
          \"userId\": \"e770f9cd-52a7-43de-b983-70f6f78d2f53\",
          \"explainResult\": {
            \"markdown\": \"# Error Book Test\n\nThis should save to error_book.\",
            \"status\": \"full\",
            \"meta\": {\"layer\": \"universal\"}
          },
          \"questionId\": \"$QUESTION_ID\"
        }
      }
    }" | jq '.result'
else
  echo "⚠️ 測試題目不存在，跳過 Error Book 測試"
fi
echo ""

echo "📊 步驟 4：檢查資料庫結果"
echo "在 Supabase SQL Editor 中執行："
echo "SELECT eb.*, pq.stem FROM error_book eb"
echo "JOIN pack_questions pq ON eb.question_id = pq.id"
echo "WHERE eb.user_id = 'e770f9cd-52a7-43de-b983-70f6f78d2f53'"
echo "ORDER BY eb.created_at DESC LIMIT 5;"
echo ""

echo "🎯 步驟 5：UI 測試"
echo "開啟瀏覽器訪問：http://localhost:3000/test-question"
echo "1. 確認載入測試題目"
echo "2. 點擊「加入錯題本」"
echo "3. 檢查 Console 和 Network 請求"
echo "4. 驗證 DB 中的資料"

echo ""
echo "=== 測試完成 ==="
