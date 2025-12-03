# WebSocket 服務器編譯錯誤修復指南

## 問題描述

編譯錯誤：`error[E0391]: cycle detected when computing type of opaque`

這是一個 Rust 編譯器的循環依賴問題，發生在 `ai_answer_handler.rs` 和 `lobby_timer.rs` 之間。

## 錯誤原因

循環依賴鏈：
1. `lobby_timer.rs` 調用 `ai_answer_handler::start_round`
2. `start_round` → `start_round_impl` → `start_ai_answer_flow` → `submit_ai_answer`
3. `submit_ai_answer` 在 `tokio::spawn` 中遞歸調用 `start_round`
4. 形成循環依賴

## 解決方案

### 方案 1：使用 `#[allow(unsafe_code)]` 和 `unsafe impl Send`（不推薦）

```rust
#[allow(unsafe_code)]
unsafe impl Send for StartRoundFuture {}
```

### 方案 2：完全重構遞歸調用為非遞歸（推薦）

將遞歸調用改為使用消息隊列或事件系統。

### 方案 3：使用 `Box<dyn Send>` 明確標記

```rust
let future: Box<dyn Future<Output = ()> + Send> = Box::pin(async move {
    start_round(...).await;
});
tokio::spawn(future);
```

## 當前狀態

- 已嘗試多種方法，但循環依賴仍然存在
- 需要進一步重構代碼結構

## 臨時解決方案

如果需要立即測試，可以：
1. 暫時註釋掉遞歸調用
2. 使用手動觸發下一輪的方式
3. 或者使用消息隊列系統

## 下一步行動

1. 重構 `submit_ai_answer` 中的遞歸調用
2. 使用消息隊列或事件系統代替直接遞歸
3. 或者將遞歸調用改為非遞歸的循環結構





























