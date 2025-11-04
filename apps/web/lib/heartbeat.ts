/**
 * Heartbeat v1: System Health & Diagnostics Reporter
 *
 * Provides a non-intrusive background health check that reports:
 * - Environment configuration status
 * - Database migration & seeding status
 * - API endpoint wiring
 * - Contract v2 conformance
 * - Performance metrics (latency, errors)
 * - Current blockers & next steps
 */

import { validateContractV2, type ContractV2Response } from './contract-v2'

// ========================================
// Heartbeat Response Types
// ========================================

export interface HeartbeatReport {
  timestamp: string
  environment: EnvironmentStatus
  database: DatabaseStatus
  endpoints: EndpointStatus
  contract: ContractStatus
  performance: PerformanceMetrics
  blockers: Blocker[]
  next_steps: string[]
  summary: string[]
}

export interface EnvironmentStatus {
  openai_key_set: boolean
  supabase_url_set: boolean
  supabase_key_set: boolean
  node_env: string
  debug_mode: boolean
}

export interface DatabaseStatus {
  migrations_run: boolean
  data_seeded: boolean
  legacy_archived: boolean
  last_migration_date?: string
  issues: string[]
}

export interface EndpointStatus {
  detect: EndpointHealth
  warmup: EndpointHealth
  answer: EndpointHealth
  solve: EndpointHealth
  backpack_save: EndpointHealth
}

export interface EndpointHealth {
  available: boolean
  contract_v2_compliant: boolean
  last_call_latency_ms?: number
  error_count_24h: number
}

export interface ContractStatus {
  conformance_rate: number // 0-1
  missing_keys: string[]
  type_mismatches: string[]
}

export interface PerformanceMetrics {
  avg_latency_ms: number
  p95_latency_ms: number
  error_rate_24h: number
  top_errors: Array<{
    message: string
    count: number
  }>
}

export interface Blocker {
  priority: 'P0' | 'P1' | 'P2' | 'P3'
  title: string
  description: string
  status: 'open' | 'in_progress' | 'blocked'
}

// ========================================
// Heartbeat Collector
// ========================================

class HeartbeatCollector {
  private latencies: number[] = []
  private errors: Map<string, number> = new Map()
  private endpointCalls: Map<string, { success: number; errors: number }> = new Map()
  private contractViolations: Map<string, number> = new Map()

  /**
   * Record an API call result
   */
  recordCall(
    endpoint: string,
    latency_ms: number,
    success: boolean,
    response?: unknown
  ) {
    // Record latency
    this.latencies.push(latency_ms)
    if (this.latencies.length > 1000) {
      this.latencies = this.latencies.slice(-1000) // Keep last 1000
    }

    // Record endpoint stats
    const stats = this.endpointCalls.get(endpoint) ?? { success: 0, errors: 0 }
    if (success) {
      stats.success++
    } else {
      stats.errors++
    }
    this.endpointCalls.set(endpoint, stats)

    // Validate Contract v2 compliance
    if (response && !validateContractV2(response)) {
      const violations = this.contractViolations.get(endpoint) ?? 0
      this.contractViolations.set(endpoint, violations + 1)
    }
  }

  /**
   * Record an error
   */
  recordError(message: string) {
    const count = this.errors.get(message) ?? 0
    this.errors.set(message, count + 1)
  }

  /**
   * Generate heartbeat report
   */
  async generateReport(): Promise<HeartbeatReport> {
    const env = await this.checkEnvironment()
    const db = await this.checkDatabase()
    const endpoints = await this.checkEndpoints()
    const contract = this.checkContract()
    const performance = this.computePerformance()
    const blockers = this.identifyBlockers(db, endpoints)
    const next_steps = this.suggestNextSteps(blockers)
    const summary = this.generateSummary(env, db, endpoints, performance, blockers)

    return {
      timestamp: new Date().toISOString(),
      environment: env,
      database: db,
      endpoints,
      contract,
      performance,
      blockers,
      next_steps,
      summary,
    }
  }

  private async checkEnvironment(): Promise<EnvironmentStatus> {
    return {
      openai_key_set: Boolean(process.env.OPENAI_API_KEY),
      supabase_url_set: Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL),
      supabase_key_set: Boolean(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY),
      node_env: process.env.NODE_ENV || 'development',
      debug_mode: process.env.DEBUG === '1' || process.env.NODE_ENV === 'development',
    }
  }

  private async checkDatabase(): Promise<DatabaseStatus> {
    const issues: string[] = []

    // Check if migrations are run (simplified check)
    let migrations_run = false
    let data_seeded = false
    let legacy_archived = false

    try {
      // Try to import supabase client
      const { supabase } = await import('./supabase')

      // Check if solve_sessions table exists (indicator of migration)
      const { error: sessionError } = await supabase
        .from('solve_sessions')
        .select('id')
        .limit(1)

      migrations_run = !sessionError

      // Check if keypoints table has data (indicator of seeding)
      const { data: keypointData, error: keypointError } = await supabase
        .from('keypoints')
        .select('id')
        .limit(1)

      data_seeded = !keypointError && (keypointData?.length ?? 0) > 0

      // Check if legacy schema exists
      const { data: schemaData } = await supabase.rpc('pg_namespace', {})
      legacy_archived = schemaData?.some((s: any) => s.nspname === 'legacy') ?? false
    } catch (error) {
      issues.push('Failed to connect to database')
    }

    if (!migrations_run) issues.push('Migrations not executed')
    if (!data_seeded) issues.push('Data not seeded')
    if (!legacy_archived) issues.push('Legacy tables not archived')

    return {
      migrations_run,
      data_seeded,
      legacy_archived,
      issues,
    }
  }

  private async checkEndpoints(): Promise<EndpointStatus> {
    const checkEndpoint = async (path: string): Promise<EndpointHealth> => {
      const stats = this.endpointCalls.get(path) ?? { success: 0, errors: 0 }
      const violations = this.contractViolations.get(path) ?? 0
      const total = stats.success + stats.errors

      return {
        available: total > 0,
        contract_v2_compliant: violations === 0,
        error_count_24h: stats.errors,
      }
    }

    return {
      detect: await checkEndpoint('/api/tutor/detect'),
      warmup: await checkEndpoint('/api/warmup/keypoint-mcq-simple'),
      answer: await checkEndpoint('/api/tutor/answer'),
      solve: await checkEndpoint('/api/solve-simple'),
      backpack_save: await checkEndpoint('/api/backpack/save'),
    }
  }

  private checkContract(): ContractStatus {
    const violations = Array.from(this.contractViolations.values())
    const totalCalls = Array.from(this.endpointCalls.values()).reduce(
      (sum, stats) => sum + stats.success + stats.errors,
      0
    )
    const totalViolations = violations.reduce((sum, v) => sum + v, 0)

    return {
      conformance_rate: totalCalls > 0 ? 1 - totalViolations / totalCalls : 1,
      missing_keys: [], // TODO: implement detailed key tracking
      type_mismatches: [],
    }
  }

  private computePerformance(): PerformanceMetrics {
    const sortedLatencies = [...this.latencies].sort((a, b) => a - b)
    const p95Index = Math.floor(sortedLatencies.length * 0.95)

    const topErrors = Array.from(this.errors.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([message, count]) => ({ message, count }))

    const totalCalls = Array.from(this.endpointCalls.values()).reduce(
      (sum, stats) => sum + stats.success + stats.errors,
      0
    )
    const totalErrors = Array.from(this.endpointCalls.values()).reduce(
      (sum, stats) => sum + stats.errors,
      0
    )

    return {
      avg_latency_ms:
        sortedLatencies.length > 0
          ? Math.round(sortedLatencies.reduce((a, b) => a + b, 0) / sortedLatencies.length)
          : 0,
      p95_latency_ms: sortedLatencies[p95Index] ?? 0,
      error_rate_24h: totalCalls > 0 ? totalErrors / totalCalls : 0,
      top_errors: topErrors,
    }
  }

  private identifyBlockers(db: DatabaseStatus, endpoints: EndpointStatus): Blocker[] {
    const blockers: Blocker[] = []

    if (!db.migrations_run) {
      blockers.push({
        priority: 'P0',
        title: 'Database migrations not executed',
        description: 'Run migrations in supabase/migrations/ to enable full functionality',
        status: 'open',
      })
    }

    if (!db.data_seeded) {
      blockers.push({
        priority: 'P0',
        title: 'Database not seeded',
        description: 'Execute seed scripts to populate keypoints and sample questions',
        status: 'open',
      })
    }

    if (!process.env.OPENAI_API_KEY) {
      blockers.push({
        priority: 'P0',
        title: 'OpenAI API key not configured',
        description: 'Set OPENAI_API_KEY environment variable',
        status: 'open',
      })
    }

    return blockers
  }

  private suggestNextSteps(blockers: Blocker[]): string[] {
    const steps: string[] = []

    const p0Blockers = blockers.filter((b) => b.priority === 'P0')
    if (p0Blockers.length > 0) {
      steps.push(`Resolve ${p0Blockers.length} P0 blocker(s) to enable core functionality`)
    }

    steps.push('Migrate all endpoints to Contract v2 response format')
    steps.push('Implement automatic batch detection with toast UI')
    steps.push('Add confidence badges and past papers to ExplanationCard')

    return steps
  }

  private generateSummary(
    env: EnvironmentStatus,
    db: DatabaseStatus,
    endpoints: EndpointStatus,
    perf: PerformanceMetrics,
    blockers: Blocker[]
  ): string[] {
    const summary: string[] = []

    // Environment summary
    const envIssues = [
      !env.openai_key_set && 'OpenAI key missing',
      !env.supabase_url_set && 'Supabase URL missing',
      !env.supabase_key_set && 'Supabase key missing',
    ].filter(Boolean)

    if (envIssues.length === 0) {
      summary.push('✅ Environment: All keys configured')
    } else {
      summary.push(`⚠️  Environment: ${envIssues.join(', ')}`)
    }

    // Database summary
    if (db.migrations_run && db.data_seeded) {
      summary.push('✅ Database: Migrations run, data seeded')
    } else {
      summary.push(`❌ Database: ${db.issues.join(', ')}`)
    }

    // Endpoints summary
    const endpointCount = Object.values(endpoints).filter((e) => e.available).length
    summary.push(`📡 Endpoints: ${endpointCount}/5 available`)

    // Performance summary
    if (perf.avg_latency_ms > 0) {
      summary.push(`⚡ Performance: avg ${perf.avg_latency_ms}ms, p95 ${perf.p95_latency_ms}ms`)
    }

    // Blockers summary
    const p0Count = blockers.filter((b) => b.priority === 'P0').length
    if (p0Count > 0) {
      summary.push(`🚨 Blockers: ${p0Count} P0 issues require immediate attention`)
    } else {
      summary.push('✅ No P0 blockers')
    }

    return summary
  }
}

// ========================================
// Singleton Instance
// ========================================

export const heartbeat = new HeartbeatCollector()

// ========================================
// API Route Helper
// ========================================

/**
 * Middleware to track API calls for heartbeat
 */
export function trackAPICall(
  endpoint: string,
  latency_ms: number,
  success: boolean,
  response?: unknown
) {
  heartbeat.recordCall(endpoint, latency_ms, success, response)
}

/**
 * Record an error for heartbeat tracking
 */
export function trackError(message: string) {
  heartbeat.recordError(message)
}

/**
 * Get current heartbeat report
 */
export async function getHeartbeatReport(): Promise<HeartbeatReport> {
  return heartbeat.generateReport()
}
