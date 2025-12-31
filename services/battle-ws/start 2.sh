#!/bin/bash

# Rust WebSocket 服務器啟動腳本

echo "🚀 啟動 Battle WebSocket 服務器..."
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

# 運行服務器
echo "📡 WebSocket 服務器將在 ws://localhost:8080/ws/battle 啟動"
echo "📝 日誌將同時輸出到終端和文件: battle-ws.log"
echo "   查看日誌文件: tail -f battle-ws.log"
echo "按 Ctrl+C 停止服務器"
echo ""

# 同時輸出到終端和文件
cargo run 2>&1 | tee battle-ws.log

