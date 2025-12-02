const WebSocket = require('ws');

const WS_URL = 'wss://battle-ws.fly.dev/ws/battle';

console.log(`Testing connection to ${WS_URL}...`);

const ws = new WebSocket(WS_URL);

ws.on('open', () => {
    console.log('✅ Connection successful!');
    ws.close();
    process.exit(0);
});

ws.on('error', (err) => {
    console.error('❌ Connection failed:', err.message);
    process.exit(1);
});
