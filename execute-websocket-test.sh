#!/bin/bash

# WebSocket 完整測試執行腳本

echo "🚀 WebSocket 完整流程測試"
echo "================================"
echo ""

# 顏色定義
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# 檢查 Node.js
if ! command -v node &> /dev/null; then
    echo -e "${RED}❌ Node.js 未安裝${NC}"
    exit 1
fi

# 檢查 tsx
if ! command -v npx &> /dev/null; then
    echo -e "${RED}❌ npx 未安裝${NC}"
    exit 1
fi

# 檢查 WebSocket 服務器
echo "📡 檢查 WebSocket 服務器狀態..."
if lsof -i :8080 | grep LISTEN > /dev/null; then
    echo -e "${GREEN}✅ WebSocket 服務器正在運行${NC}"
else
    echo -e "${YELLOW}⚠️  WebSocket 服務器未運行${NC}"
    echo "正在嘗試啟動服務器..."
    
    # 檢查 Rust 是否安裝
    if ! command -v cargo &> /dev/null; then
        echo -e "${RED}❌ Rust 未安裝，無法啟動 WebSocket 服務器${NC}"
        echo "請手動啟動服務器：cd services/battle-ws && cargo run"
        exit 1
    fi
    
    # 嘗試啟動服務器（背景運行）
    cd services/battle-ws 2>/dev/null || {
        echo -e "${RED}❌ 無法找到 services/battle-ws 目錄${NC}"
        exit 1
    }
    
    echo "啟動 WebSocket 服務器..."
    nohup cargo run > /tmp/battle-ws.log 2>&1 &
    WS_PID=$!
    echo "服務器 PID: $WS_PID"
    
    # 等待服務器啟動
    echo "等待服務器啟動（最多 30 秒）..."
    for i in {1..30}; do
        sleep 1
        if lsof -i :8080 | grep LISTEN > /dev/null; then
            echo -e "${GREEN}✅ WebSocket 服務器已啟動${NC}"
            break
        fi
        if [ $i -eq 30 ]; then
            echo -e "${RED}❌ WebSocket 服務器啟動超時${NC}"
            echo "請檢查日誌: tail -f /tmp/battle-ws.log"
            kill $WS_PID 2>/dev/null
            exit 1
        fi
    done
    
    cd - > /dev/null
fi

echo ""
echo "🧪 執行測試腳本..."
echo ""

# 執行測試
WS_URL=${WS_URL:-"ws://localhost:8080/ws/battle"}
export WS_URL

# 檢查測試文件是否存在
if [ ! -f "test-websocket-complete.ts" ]; then
    echo -e "${RED}❌ 測試文件不存在: test-websocket-complete.ts${NC}"
    exit 1
fi

# 執行測試
npx tsx test-websocket-complete.ts

TEST_EXIT_CODE=$?

echo ""
echo "================================"
if [ $TEST_EXIT_CODE -eq 0 ]; then
    echo -e "${GREEN}✅ 測試完成${NC}"
else
    echo -e "${RED}❌ 測試失敗（退出碼: $TEST_EXIT_CODE）${NC}"
fi

# 如果我們啟動了服務器，詢問是否要停止
if [ ! -z "$WS_PID" ]; then
    echo ""
    read -p "是否要停止 WebSocket 服務器？(y/n) " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        kill $WS_PID 2>/dev/null
        echo -e "${GREEN}✅ 服務器已停止${NC}"
    else
        echo "服務器將繼續運行（PID: $WS_PID）"
    fi
fi

exit $TEST_EXIT_CODE









































