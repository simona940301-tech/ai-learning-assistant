/**
 * Simple i18n utility for Batch 1 Hotfix
 * Supports zh-TW translations
 */

import translations from '../i18n/zh-TW.json';

type TranslationKey = string;

/**
 * Get translation by key path (e.g., "qr.installAndStart")
 */
export function t(key: TranslationKey): string {
  const keys = key.split('.');
  let value: any = translations;

  for (const k of keys) {
    if (value && typeof value === 'object' && k in value) {
      value = value[k];
    } else {
      console.warn(`[i18n] Missing translation for key: ${key}`);
      return key;
    }
  }

  return typeof value === 'string' ? value : key;
}

/**
 * React hook for i18n
 */
export function useTranslation() {
  return { t };
}

export default translations;
