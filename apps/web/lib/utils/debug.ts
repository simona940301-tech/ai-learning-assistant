/**
 * Debug helper for development-only logging
 * 
 * In production, all console.log calls are removed via Next.js compiler.
 * This helper provides an additional safety net and better DX.
 */
export const debugLog = (...args: any[]) => {
  if (process.env.NODE_ENV !== 'production') {
    // eslint-disable-next-line no-console
    console.log(...args)
  }
}

export const debugWarn = (...args: any[]) => {
  if (process.env.NODE_ENV !== 'production') {
    // eslint-disable-next-line no-console
    console.warn(...args)
  }
}

export const debugError = (...args: any[]) => {
  // Always log errors, even in production
  // eslint-disable-next-line no-console
  console.error(...args)
}




