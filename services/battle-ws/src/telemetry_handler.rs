use futures_util::{StreamExt, SinkExt};
use tokio::net::TcpStream;
use tokio_tungstenite::tungstenite::Message;
use tokio_tungstenite::WebSocketStream;
use prost::Message as ProstMessage;
use std::net::SocketAddr;

// Import generated Protobuf code
pub mod telemetry {
    include!(concat!(env!("OUT_DIR"), "/telemetry.rs"));
}

use telemetry::TelemetryBatch;

pub async fn handle_telemetry_connection(
    ws_stream: WebSocketStream<TcpStream>,
    addr: SocketAddr,
) {
    println!("New telemetry connection from: {}", addr);

    let (mut _write, mut read) = ws_stream.split();

    while let Some(msg) = read.next().await {
        match msg {
            Ok(Message::Binary(data)) => {
                match TelemetryBatch::decode(data.as_slice()) {
                    Ok(batch) => {
                        println!(
                            "Received telemetry batch: session_id={}, user_id={}, events={}",
                            batch.session_id,
                            batch.user_id,
                            batch.events.len()
                        );
                        
                        // TODO: In the future, send to Kafka/ClickHouse
                        for event in batch.events {
                            // Simple heuristic detection (placeholder)
                            if event.r#type == 2 { // RAGE_CLICK
                                println!("⚠️ RAGE CLICK DETECTED for user {}", batch.user_id);
                            }
                        }
                    }
                    Err(e) => {
                        eprintln!("Failed to decode telemetry batch: {}", e);
                    }
                }
            }
            Ok(Message::Close(_)) => {
                println!("Telemetry connection closed: {}", addr);
                break;
            }
            Err(e) => {
                eprintln!("Error processing telemetry message: {}", e);
                break;
            }
            _ => {
                // Ignore other message types (Text, Ping, Pong)
            }
        }
    }
}
