#!/bin/bash

# Rust WebSocket 服務器啟動腳本（帶日誌文件）

echo "🚀 啟動 Battle WebSocket 服務器（日誌模式）..."
echo ""

# 檢查 Rust 是否安裝
if ! command -v cargo &> /dev/null; then
    echo "❌ Rust 未安裝！"
    echo "請先安裝 Rust: curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh"
    exit 1
fi

# 檢查是否在正確的目錄
if [ ! -f "Cargo.toml" ]; then
    echo "❌ 請在 services/battle-ws 目錄下運行此腳本"
    exit 1
fi

# 設置日誌級別
export RUST_LOG=info

# 運行服務器（後台運行，日誌輸出到文件）
echo "📡 WebSocket 服務器將在 ws://localhost:8080/ws/battle 啟動"
echo "📝 日誌文件: battle-ws.log"
echo "   查看日誌: tail -f battle-ws.log"
echo "   停止服務: pkill -f battle-ws"
echo ""

# 後台運行並輸出日誌到文件
nohup cargo run > battle-ws.log 2>&1 &
PID=$!

echo "✅ 服務器已啟動（PID: $PID）"
echo "📝 查看日誌: tail -f battle-ws.log"
echo "🛑 停止服務: kill $PID"
echo ""

# 顯示最後幾行日誌
sleep 2
echo "--- 最新日誌 ---"
tail -n 20 battle-ws.log

