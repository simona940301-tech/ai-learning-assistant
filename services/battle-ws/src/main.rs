mod battle_models;
mod ws_handler;
mod match_logic;
mod match_postscript;
mod lobby_timer;
mod redis_pool;
mod battle_event_sender;
mod progression_api_client;
mod elo;
mod elo_api_client;
mod pve_api_client;
mod onboarding_api_client; // New module for onboarding questions
mod ai_answer_planner;
mod ai_answer_handler;
mod score_system;
mod dda;
mod tempo;

use ws_handler::{BattleServer, handle_websocket};
use redis_pool::init_redis_pool;
use tokio::net::TcpListener;
use tracing::info;
use std::env;

// ============================================
// 主函數
// ============================================

#[tokio::main]
async fn main() {
    dotenv().ok();
    tracing_subscriber::fmt::init();

    let addr = env::var("WS_ADDRESS").unwrap_or_else(|_| "0.0.0.0:8080".to_string());
    let listener = TcpListener::bind(&addr).await.expect("Failed to bind");
    println!("Battle WebSocket server listening on: {}", addr);

    // 初始化 Redis 連接池
    let redis_pool = Arc::new(RedisPool::new().await.expect("Failed to connect to Redis"));
    
    // 初始化戰鬥狀態存儲
    let battles = Arc::new(Mutex::new(std::collections::HashMap::<String, BattleState>::new()));

    while let Ok((stream, addr)) = listener.accept().await {
        let battles = battles.clone();
        let redis_pool = redis_pool.clone();
        
        tokio::spawn(async move {
            // Simple routing based on URL path is tricky with raw TcpStream
            // For now, we accept the connection and check the path during handshake if possible,
            // or just assume it's a WS connection.
            // Ideally, we should use a proper HTTP framework like Axum or Warp for routing.
            // But since we are using raw tokio-tungstenite, we can peek at the request or just accept.
            
            // NOTE: Since we are using raw TCP, we can't easily route /ws/battle vs /ws/telemetry without parsing HTTP headers manually.
            // For this MVP, we will use a workaround:
            // We will accept the websocket handshake. If the client sends a specific subprotocol or initial message, we route accordingly.
            // OR, we can use a library like `tungstenite`'s `accept_hdr` to check headers.
            
            // Let's try to upgrade and see.
            // A better approach for production is to use `warp` or `axum`.
            // For now, let's assume all connections to this port are handled by a router if we had one.
            // Since we don't, we will implement a simple header check using `accept_hdr`.
            
            let callback = |req: &tokio_tungstenite::tungstenite::handshake::server::Request, response: tokio_tungstenite::tungstenite::handshake::server::Response| {
                let path = req.uri().path();
                println!("Incoming connection path: {}", path);
                
                // We can attach the path to the response or context, but here we just return the response.
                // We need to know the path AFTER the handshake to route.
                // A hacky way is to check the path here and decide.
                
                if path == "/ws/telemetry" {
                    Ok(response)
                } else {
                    Ok(response)
                }
            };

            // To properly route, we need to inspect the request before accepting.
            // Since `accept_async` doesn't give us the path easily in the return value,
            // we will use `accept_hdr_async`.
            
            let mut path = String::new();
            let ws_stream = tokio_tungstenite::accept_hdr_async(stream, |req: &tokio_tungstenite::tungstenite::handshake::server::Request, response| {
                path = req.uri().path().to_string();
                Ok(response)
            }).await;

            match ws_stream {
                Ok(ws_stream) => {
                    if path == "/ws/telemetry" {
                        telemetry_handler::handle_telemetry_connection(ws_stream, addr).await;
                    } else {
                        // Default to battle handler
                        ws_handler::handle_connection(ws_stream, battles, redis_pool, addr).await;
                    }
                }
                Err(e) => eprintln!("Error during WebSocket handshake: {}", e),
            }
        });
    }
}
