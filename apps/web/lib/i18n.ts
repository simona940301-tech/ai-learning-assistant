/**
 * Simple i18n utility for Batch 1 Hotfix
 * Supports zh-TW translations
 */

import translations from '../i18n/zh-TW.json'

type TranslationKey = string

type TranslationOptions = {
  default?: string
  values?: Record<string, string | number>
  [key: string]: unknown
}

function interpolate(template: string, values?: Record<string, string | number>) {
  if (!values) return template
  return template.replace(/\{\{\s*(.+?)\s*\}\}/g, (_, token) => {
    const key = token.trim()
    if (values[key] === undefined || values[key] === null) return ''
    return String(values[key])
  })
}

/**
 * Get translation by key path (e.g., "qr.installAndStart")
 */
export function t(key: TranslationKey, options?: TranslationOptions): string {
  const keys = key.split('.')
  let value: any = translations

  for (const k of keys) {
    if (value && typeof value === 'object' && k in value) {
      value = value[k]
    } else {
      console.warn(`[i18n] Missing translation for key: ${key}`)
      return options?.default ?? key
    }
  }

  if (typeof value === 'string') {
    return interpolate(value, options?.values)
  }

  return options?.default ?? key
}

/**
 * React hook for i18n
 */
export function useTranslation(): { t: (key: TranslationKey, options?: TranslationOptions) => string } {
  return { t }
}

export default translations
