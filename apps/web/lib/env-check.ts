/**
 * Environment Configuration Check
 * Logs critical environment variables on app initialization
 */

export function checkEnvironment() {
  if (typeof window === 'undefined') return // Server-side

  const config = {
    // Public environment variables
    timezone: process.env.NEXT_PUBLIC_TIMEZONE || 'Not set',
    region: process.env.NEXT_PUBLIC_APP_REGION || 'Not set',
    supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL || 'Not set',
    hasAnonKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ? '✅ Set' : '❌ Missing',
    
    // Feature flags
    analyticsEnabled: process.env.NEXT_PUBLIC_ENABLE_ANALYTICS === 'true',
    debugLogsEnabled: process.env.NEXT_PUBLIC_ENABLE_DEBUG_LOGS === 'true',
    
    // Runtime info
    browserTimezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    currentTime: new Date().toLocaleString('zh-TW', { timeZone: process.env.NEXT_PUBLIC_TIMEZONE || 'Asia/Taipei' })
  }

  console.log('╔═══════════════════════════════════════════════════════╗')
  console.log('║  PLMS Environment Check                               ║')
  console.log('╚═══════════════════════════════════════════════════════╝')
  console.log('')
  console.log('📍 Region & Timezone:')
  console.log(`   Region: ${config.region}`)
  console.log(`   Configured TZ: ${config.timezone}`)
  console.log(`   Browser TZ: ${config.browserTimezone}`)
  console.log(`   Current Time: ${config.currentTime}`)
  console.log('')
  console.log('🔌 Backend Connection:')
  console.log(`   Supabase URL: ${config.supabaseUrl}`)
  console.log(`   Anon Key: ${config.hasAnonKey}`)
  console.log('')
  console.log('🎛️  Feature Flags:')
  console.log(`   Analytics: ${config.analyticsEnabled ? '✅ Enabled' : '❌ Disabled'}`)
  console.log(`   Debug Logs: ${config.debugLogsEnabled ? '✅ Enabled' : '❌ Disabled'}`)
  console.log('')
  
  // Validation warnings
  const warnings: string[] = []
  
  if (config.timezone === 'Not set') {
    warnings.push('⚠️  NEXT_PUBLIC_TIMEZONE not configured')
  }
  
  if (config.supabaseUrl === 'Not set') {
    warnings.push('⚠️  NEXT_PUBLIC_SUPABASE_URL not configured')
  }
  
  if (config.hasAnonKey === '❌ Missing') {
    warnings.push('⚠️  NEXT_PUBLIC_SUPABASE_ANON_KEY not configured')
  }
  
  if (config.timezone !== config.browserTimezone) {
    warnings.push(`⚠️  Timezone mismatch: configured=${config.timezone}, browser=${config.browserTimezone}`)
  }
  
  if (warnings.length > 0) {
    console.log('⚠️  Warnings:')
    warnings.forEach(w => console.log(`   ${w}`))
    console.log('')
  } else {
    console.log('✅ All environment checks passed')
    console.log('')
  }
  
  console.log('═══════════════════════════════════════════════════════')
  
  return config
}

/**
 * Get app timezone
 */
export function getAppTimezone(): string {
  return process.env.NEXT_PUBLIC_TIMEZONE || 'Asia/Taipei'
}

/**
 * Get app region
 */
export function getAppRegion(): string {
  return process.env.NEXT_PUBLIC_APP_REGION || 'tw'
}

/**
 * Check if feature flag is enabled
 */
export function isFeatureEnabled(flag: 'ANALYTICS' | 'DEBUG_LOGS'): boolean {
  const envVar = `NEXT_PUBLIC_ENABLE_${flag}`
  return process.env[envVar] === 'true'
}

