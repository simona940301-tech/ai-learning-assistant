/**
 * Sentry Integration for RPC Latency Monitoring
 * 
 * Sends RPC latency metrics and alerts to Sentry for production monitoring.
 * Note: Requires @sentry/nextjs to be installed. If not available, will gracefully skip.
 */

import type { RPCLatencyMetrics } from './rpc-latency'

// Conditional Sentry import
let Sentry: typeof import('@sentry/nextjs') | null = null
try {
    Sentry = require('@sentry/nextjs')
} catch (e) {
    console.warn('[Sentry RPC] @sentry/nextjs not installed, monitoring disabled')
}

/**
 * Send RPC latency metric to Sentry
 */
export function reportRPCLatencyToSentry(metric: RPCLatencyMetrics): void {
    if (!Sentry) {
        // Sentry not available, skip reporting
        return
    }

    // Add breadcrumb for all RPC calls
    Sentry.addBreadcrumb({
        category: 'rpc',
        message: `${metric.operation}: ${metric.latencyMs.toFixed(2)}ms`,
        level: metric.success ? 'info' : 'error',
        data: {
            operation: metric.operation,
            latencyMs: metric.latencyMs,
            runtime: metric.runtime,
            success: metric.success,
            errorMessage: metric.errorMessage,
        },
    })

    // Alert if exceeds 50ms target
    if (metric.latencyMs > 50 && metric.success) {
        Sentry.captureMessage(
            `RPC latency exceeded 50ms: ${metric.operation} took ${metric.latencyMs.toFixed(2)}ms`,
            {
                level: 'warning',
                tags: {
                    operation: metric.operation,
                    runtime: metric.runtime,
                },
                contexts: {
                    rpc_latency: {
                        latency_ms: metric.latencyMs,
                        target_ms: 50,
                        exceeded_by_ms: metric.latencyMs - 50,
                        exceeded_by_percent: ((metric.latencyMs - 50) / 50) * 100,
                    },
                },
            }
        )
    }

    // Alert if RPC call failed
    if (!metric.success) {
        Sentry.captureException(new Error(`RPC call failed: ${metric.operation}`), {
            tags: {
                operation: metric.operation,
                runtime: metric.runtime,
            },
            contexts: {
                rpc_error: {
                    error_message: metric.errorMessage,
                    latency_ms: metric.latencyMs,
                },
            },
        })
    }

    // Send custom metric to Sentry (for dashboard/alerting)
    if (typeof Sentry.metrics?.distribution === 'function') {
        Sentry.metrics.distribution('rpc.latency', metric.latencyMs, {
            tags: {
                operation: metric.operation,
                runtime: metric.runtime,
                success: metric.success.toString(),
            },
            unit: 'millisecond',
        })
    }
}

/**
 * Alert if P95 latency exceeds threshold
 */
export function alertP95Threshold(
    operation: string,
    p95Latency: number,
    threshold: number = 50
): void {
    if (!Sentry) {
        return
    }

    if (p95Latency > threshold) {
        Sentry.captureMessage(
            `P95 RPC latency exceeded threshold: ${operation} P95=${p95Latency.toFixed(2)}ms (threshold: ${threshold}ms)`,
            {
                level: 'warning',
                tags: {
                    operation,
                    metric_type: 'p95',
                },
                contexts: {
                    p95_latency: {
                        p95_ms: p95Latency,
                        threshold_ms: threshold,
                        exceeded_by_ms: p95Latency - threshold,
                        exceeded_by_percent: ((p95Latency - threshold) / threshold) * 100,
                    },
                },
            }
        )
    }
}
