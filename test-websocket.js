// 簡單的 WebSocket 測試腳本
const WebSocket = require('ws');

console.log('🧪 測試 WebSocket 連接...');

const ws = new WebSocket('ws://localhost:8080/ws/battle');

ws.on('open', function open() {
  console.log('✅ WebSocket 連接成功！');
  console.log('📤 發送測試消息...');

  // 發送一個簡單的消息
  ws.send(JSON.stringify({
    type: 'JOIN_QUEUE',
    userId: 'test-user-123',
    mode: 'PVE_TRAINING'
  }));
});

ws.on('message', function message(data) {
  console.log('📨 收到消息:', data.toString());
});

ws.on('error', function error(err) {
  console.error('❌ WebSocket 錯誤:', err);
});

ws.on('close', function close(code, reason) {
  console.log('🔌 WebSocket 連接關閉:', code, reason.toString());
});

// 30 秒後自動關閉
setTimeout(() => {
  console.log('⏰ 測試結束，關閉連接');
  ws.close();
}, 30000);
