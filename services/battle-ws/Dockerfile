# 多階段構建 Dockerfile for Rust WebSocket Server
# 優化鏡像大小和構建速度

# ============================================
# Stage 1: 構建階段
# ============================================
FROM rust:1.83-slim as builder

# 安裝構建依賴
RUN apt-get update && apt-get install -y \
    pkg-config \
    libssl-dev \
    ca-certificates \
    && rm -rf /var/lib/apt/lists/*

# 設置工作目錄
WORKDIR /app

# 複製 Cargo 文件（利用 Docker 緩存）
COPY Cargo.toml Cargo.lock ./

# 複製源代碼
COPY src ./src

# 構建應用（確保使用正確的目標架構）
RUN cargo build --release

# ============================================
# Stage 2: 運行階段
# ============================================
FROM debian:bookworm-slim

# 安裝運行時依賴
RUN apt-get update && apt-get install -y \
    ca-certificates \
    libssl3 \
    file \
    curl \
    && rm -rf /var/lib/apt/lists/*

# 創建非 root 用戶
RUN useradd -m -u 1000 appuser

# 設置工作目錄
WORKDIR /app

# 從構建階段複製二進制文件
COPY --from=builder /app/target/release/battle-ws /app/battle-ws

# 複製配置文件（如果有）
COPY config ./config

# 複製啟動腳本
COPY start.sh /app/start.sh

# 更改所有權並設置執行權限
RUN chown -R appuser:appuser /app && \
    chmod +x /app/battle-ws && \
    chmod +x /app/start.sh

# 切換到非 root 用戶
USER appuser

# 暴露端口
EXPOSE 8080

# 運行應用
CMD ["/app/start.sh"]

