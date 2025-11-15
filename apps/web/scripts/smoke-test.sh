#!/bin/bash
# 冒煙測試腳本
# 用途：快速驗證 API 功能是否正常

set -e

BASE_URL="${BASE_URL:-http://localhost:4001}"
echo "🧪 開始冒煙測試 (BASE_URL: $BASE_URL)"
echo ""

# 顏色輸出
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# 測試計數器
PASSED=0
FAILED=0

# 測試函數
test_api() {
  local name=$1
  local method=$2
  local endpoint=$3
  local data=$4
  local expected_field=$5

  echo -n "測試 $name... "
  
  if [ "$method" = "POST" ]; then
    response=$(curl -s -X POST "$BASE_URL$endpoint" \
      -H "Content-Type: application/json" \
      -d "$data" 2>&1)
  else
    response=$(curl -s -X GET "$BASE_URL$endpoint" 2>&1)
  fi

  # 檢查是否包含預期字段
  if echo "$response" | grep -q "$expected_field"; then
    echo -e "${GREEN}✓ 通過${NC}"
    ((PASSED++))
    return 0
  else
    echo -e "${RED}✗ 失敗${NC}"
    echo "  響應: $response"
    ((FAILED++))
    return 1
  fi
}

# A. Solve API 測試
echo "📋 A. Solve API 測試"
test_api \
  "Solve (成功)" \
  "POST" \
  "/api/solve" \
  '{"subject":"math","prompt":"解方程 x+1=2","mode":"step"}' \
  "success"

test_api \
  "Solve (錯誤處理)" \
  "POST" \
  "/api/solve" \
  '{"subject":"invalid_subject","prompt":"test"}' \
  "error"

echo ""

# B. Explain API 測試
echo "📋 B. Explain API 測試"
test_api \
  "Explain" \
  "POST" \
  "/api/explain" \
  '{"input":{"text":"What is the answer?"},"mode":"fast"}' \
  "markdown"

echo ""

# C. Warmup API 測試
echo "📋 C. Warmup API 測試"
test_api \
  "Warmup MCQ" \
  "POST" \
  "/api/warmup/keypoint-mcq" \
  '{"prompt":"數學題目","subject":"math"}' \
  "phase"

echo ""

# 總結
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo -e "測試結果: ${GREEN}通過 $PASSED${NC} / ${RED}失敗 $FAILED${NC}"
echo ""

if [ $FAILED -eq 0 ]; then
  echo -e "${GREEN}✅ 所有測試通過！${NC}"
  exit 0
else
  echo -e "${RED}❌ 有測試失敗，請檢查上述輸出${NC}"
  exit 1
fi

