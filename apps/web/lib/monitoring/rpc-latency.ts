/**
 * RPC Latency Monitoring Utility
 * 
 * Instruments Supabase RPC calls to measure and log latency,
 * ensuring RAG retrieval meets < 50ms target in Edge Runtime.
 */

export interface RPCLatencyMetrics {
    operation: string
    latencyMs: number
    timestamp: number
    runtime: 'edge' | 'nodejs'
    success: boolean
    errorMessage?: string
}

const metrics: RPCLatencyMetrics[] = []
const MAX_METRICS = 1000 // Keep last 1000 measurements

/**
 * Wrap RPC call with latency measurement
 */
export async function measureRPCLatency<T>(
    operation: string,
    rpcCall: () => Promise<T>,
    runtime: 'edge' | 'nodejs' = 'nodejs'
): Promise<T> {
    const startTime = performance.now()
    let success = true
    let errorMessage: string | undefined

    try {
        const result = await rpcCall()
        return result
    } catch (error) {
        success = false
        errorMessage = error instanceof Error ? error.message : 'Unknown error'
        throw error
    } finally {
        const latencyMs = performance.now() - startTime

        const metric: RPCLatencyMetrics = {
            operation,
            latencyMs,
            timestamp: Date.now(),
            runtime,
            success,
            errorMessage,
        }

        // Log to console
        const emoji = latencyMs < 50 ? '✅' : latencyMs < 100 ? '⚠️' : '❌'
        console.log(
            `[RPC Latency] ${emoji} ${operation}: ${latencyMs.toFixed(2)}ms (${runtime})`
        )

        // Store metric
        metrics.push(metric)
        if (metrics.length > MAX_METRICS) {
            metrics.shift()
        }

        // Alert if exceeds target
        if (latencyMs > 50 && success) {
            console.warn(
                `[RPC Latency] ⚠️ ${operation} exceeded 50ms target: ${latencyMs.toFixed(2)}ms`
            )
        }

        // ⚡ Send to Sentry for production monitoring
        try {
            const { reportRPCLatencyToSentry } = await import('./sentry-rpc')
            reportRPCLatencyToSentry(metric)
        } catch (sentryError) {
            // Don't fail the request if Sentry reporting fails
            console.warn('[RPC Latency] Sentry reporting failed:', sentryError)
        }
    }
}

/**
 * Get latency statistics
 */
export function getRPCLatencyStats(operation?: string) {
    const filtered = operation
        ? metrics.filter(m => m.operation === operation)
        : metrics

    if (filtered.length === 0) {
        return null
    }

    const latencies = filtered.map(m => m.latencyMs)
    const sorted = [...latencies].sort((a, b) => a - b)

    return {
        count: filtered.length,
        min: Math.min(...latencies),
        max: Math.max(...latencies),
        avg: latencies.reduce((a, b) => a + b, 0) / latencies.length,
        p50: sorted[Math.floor(sorted.length * 0.5)],
        p95: sorted[Math.floor(sorted.length * 0.95)],
        p99: sorted[Math.floor(sorted.length * 0.99)],
        successRate: (filtered.filter(m => m.success).length / filtered.length) * 100,
    }
}

/**
 * Get all metrics
 */
export function getAllRPCMetrics(): RPCLatencyMetrics[] {
    return [...metrics]
}

/**
 * Clear metrics
 */
export function clearRPCMetrics(): void {
    metrics.length = 0
}
