// Test Redis connection
const { getRedisClient, ensureRedisConnected } = require('./lib/redis.ts');

async function testRedis() {
    console.log('Testing Redis connection...');

    const client = getRedisClient();
    if (!client) {
        console.error('❌ Failed to create Redis client');
        return;
    }

    console.log('✅ Redis client created');

    try {
        const connected = await ensureRedisConnected();
        if (!connected) {
            console.error('❌ Failed to connect to Redis');
            return;
        }

        console.log('✅ Redis connected');

        // Test write
        await client.set('test:key', 'test value', { EX: 60 });
        console.log('✅ Write test passed');

        // Test read
        const value = await client.get('test:key');
        console.log('✅ Read test passed:', value);

        // Cleanup
        await client.del('test:key');
        console.log('✅ All tests passed!');

    } catch (error) {
        console.error('❌ Redis test failed:', error);
    }
}

testRedis().then(() => process.exit(0)).catch(e => {
    console.error(e);
    process.exit(1);
});
