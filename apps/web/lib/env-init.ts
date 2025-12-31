/**
 * Startup Environment Validation
 * 
 * This module validates environment variables when the application starts.
 * Import this in your app initialization code to catch configuration errors early.
 */

import { validateAndLog, validateOrThrow } from './env-validation'

/**
 * Initialize and validate environment on module load
 * This runs when the module is first imported
 */
if (typeof window === 'undefined') {
  // Server-side only
  const result = validateAndLog()
  
  if (!result.valid) {
    console.error('')
    console.error('═══════════════════════════════════════════════════════')
    console.error('Application startup blocked due to missing environment variables.')
    console.error('Please fix the errors above and restart the server.')
    console.error('═══════════════════════════════════════════════════════')
    console.error('')
    
    // In production, we might want to throw here
    // In development, we log but continue to allow easier debugging
    if (process.env.NODE_ENV === 'production') {
      throw new Error('Environment validation failed. Check logs for details.')
    }
  }
}

export { validateAndLog, validateOrThrow }

