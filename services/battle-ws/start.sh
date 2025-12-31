#!/bin/sh

echo "=== Battle WebSocket Server Starting ==="
echo "Current directory: $(pwd)"
echo "Binary file info:"
ls -lh /app/battle-ws
file /app/battle-ws || echo "file command not available"
echo "ldd info:"
ldd /app/battle-ws || echo "ldd command not available"
echo "Environment variables:"
env | grep -E "NEXTJS|API|REDIS|RUST" || echo "No relevant env vars found"
echo "=== Starting battle-ws ==="
exec /app/battle-ws
