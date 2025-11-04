/**
 * PLMS Theme System: Dark & Light Mode
 *
 * Auto-detects OS color-scheme preference and provides unified theme constants.
 * Supports smooth transitions and real-time theme switching.
 */

import { useEffect, useState } from 'react'

// ========================================
// Theme Type Definitions
// ========================================

export type ThemeMode = 'dark' | 'light'

export interface ThemeColors {
  bg: string
  card: string
  cardHover: string
  accent: string
  accentHover: string
  text: string
  textSecondary: string
  textTertiary: string
  border: string
  borderHover: string
  shadow: string
  shadowHover: string
  success: string
  warning: string
  error: string
  // Badge colors
  badgeBg: string
  badgeBorder: string
  // Toast colors
  toastBg: string
  toastBorder: string
  // Past paper mini card
  miniCardBg: string
  miniCardBorder: string
}

// ========================================
// Dark Mode Theme (Current)
// ========================================

export const darkTheme: ThemeColors = {
  bg: '#0E1116',
  card: '#141A20',
  cardHover: '#1A2028',
  accent: '#6EC1E4',
  accentHover: '#8ED1EC',
  text: '#F1F5F9',
  textSecondary: '#A9B7C8',
  textTertiary: '#64748B',
  border: '#1F2937',
  borderHover: '#374151',
  shadow: '0 4px 16px rgba(110, 193, 228, 0.08)',
  shadowHover: '0 6px 24px rgba(110, 193, 228, 0.12)',
  success: '#10B981',
  warning: '#F59E0B',
  error: '#EF4444',
  // Badges
  badgeBg: 'rgba(110, 193, 228, 0.1)',
  badgeBorder: 'rgba(110, 193, 228, 0.3)',
  // Toast
  toastBg: 'rgba(20, 26, 32, 0.95)',
  toastBorder: 'rgba(110, 193, 228, 0.2)',
  // Mini card (slightly darker than card)
  miniCardBg: '#0E1116',
  miniCardBorder: '#1F2937',
}

// ========================================
// Light Mode Theme (New)
// ========================================

export const lightTheme: ThemeColors = {
  bg: '#FFFFFF',
  card: '#F8FAFC',
  cardHover: '#F1F5F9',
  accent: '#007AFF',
  accentHover: '#0051D5',
  text: '#0E1116',
  textSecondary: '#475569',
  textTertiary: '#94A3B8',
  border: '#E2E8F0',
  borderHover: '#CBD5E1',
  shadow: '0 4px 16px rgba(0, 122, 255, 0.08)',
  shadowHover: '0 6px 24px rgba(0, 122, 255, 0.12)',
  success: '#059669',
  warning: '#D97706',
  error: '#DC2626',
  // Badges
  badgeBg: 'rgba(0, 122, 255, 0.08)',
  badgeBorder: 'rgba(0, 122, 255, 0.25)',
  // Toast
  toastBg: 'rgba(255, 255, 255, 0.95)',
  toastBorder: 'rgba(0, 122, 255, 0.2)',
  // Mini card (slightly darker than card)
  miniCardBg: '#F1F5F9',
  miniCardBorder: '#CBD5E1',
}

// ========================================
// Theme Context & Hook
// ========================================

/**
 * Detects OS color-scheme preference
 */
export function getSystemTheme(): ThemeMode {
  if (typeof window === 'undefined') return 'dark'

  const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)')
  return mediaQuery.matches ? 'dark' : 'light'
}

/**
 * React hook for theme management
 */
export function useTheme() {
  const [mode, setMode] = useState<ThemeMode>('dark')
  const [isClient, setIsClient] = useState(false)

  useEffect(() => {
    setIsClient(true)
    const systemTheme = getSystemTheme()
    setMode(systemTheme)

    // Listen for OS theme changes
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)')
    const handleChange = (e: MediaQueryListEvent) => {
      setMode(e.matches ? 'dark' : 'light')
    }

    mediaQuery.addEventListener('change', handleChange)
    return () => mediaQuery.removeEventListener('change', handleChange)
  }, [])

  const theme = mode === 'dark' ? darkTheme : lightTheme

  return {
    mode,
    theme,
    isDark: mode === 'dark',
    isLight: mode === 'light',
    isClient, // For SSR safety
    toggleTheme: () => setMode(prev => prev === 'dark' ? 'light' : 'dark'),
  }
}

// ========================================
// CSS Custom Properties Generator
// ========================================

/**
 * Generates CSS custom properties for the current theme
 */
export function generateThemeCSS(theme: ThemeColors): string {
  return `
    --theme-bg: ${theme.bg};
    --theme-card: ${theme.card};
    --theme-card-hover: ${theme.cardHover};
    --theme-accent: ${theme.accent};
    --theme-accent-hover: ${theme.accentHover};
    --theme-text: ${theme.text};
    --theme-text-secondary: ${theme.textSecondary};
    --theme-text-tertiary: ${theme.textTertiary};
    --theme-border: ${theme.border};
    --theme-border-hover: ${theme.borderHover};
    --theme-shadow: ${theme.shadow};
    --theme-shadow-hover: ${theme.shadowHover};
    --theme-success: ${theme.success};
    --theme-warning: ${theme.warning};
    --theme-error: ${theme.error};
    --theme-badge-bg: ${theme.badgeBg};
    --theme-badge-border: ${theme.badgeBorder};
    --theme-toast-bg: ${theme.toastBg};
    --theme-toast-border: ${theme.toastBorder};
    --theme-mini-card-bg: ${theme.miniCardBg};
    --theme-mini-card-border: ${theme.miniCardBorder};
  `.trim()
}

// ========================================
// Utility Functions
// ========================================

/**
 * Apply theme to document root
 */
export function applyThemeToDocument(theme: ThemeColors) {
  if (typeof document === 'undefined') return

  const root = document.documentElement
  const cssVars = generateThemeCSS(theme)

  cssVars.split(';').forEach(declaration => {
    const [property, value] = declaration.split(':').map(s => s.trim())
    if (property && value) {
      root.style.setProperty(property, value)
    }
  })
}

/**
 * Get color with alpha transparency
 */
export function withAlpha(color: string, alpha: number): string {
  // Handle hex colors
  if (color.startsWith('#')) {
    const r = parseInt(color.slice(1, 3), 16)
    const g = parseInt(color.slice(3, 5), 16)
    const b = parseInt(color.slice(5, 7), 16)
    return `rgba(${r}, ${g}, ${b}, ${alpha})`
  }

  // Handle rgb/rgba colors
  if (color.startsWith('rgb')) {
    const match = color.match(/\d+/g)
    if (match && match.length >= 3) {
      return `rgba(${match[0]}, ${match[1]}, ${match[2]}, ${alpha})`
    }
  }

  return color
}

/**
 * Get adaptive icon color based on theme
 */
export function getIconColor(theme: ThemeColors): string {
  return theme.textSecondary
}

// ========================================
// Theme Transition Animation
// ========================================

export const themeTransition = {
  duration: 0.25, // 250ms
  ease: 'easeInOut',
}

// ========================================
// Responsive Breakpoints
// ========================================

export const breakpoints = {
  mobile: 640,
  tablet: 768,
  desktop: 1024,
  wide: 1280,
}

export function isMobile(): boolean {
  if (typeof window === 'undefined') return false
  return window.innerWidth < breakpoints.mobile
}

export function isTablet(): boolean {
  if (typeof window === 'undefined') return false
  return window.innerWidth >= breakpoints.mobile && window.innerWidth < breakpoints.desktop
}

export function isDesktop(): boolean {
  if (typeof window === 'undefined') return false
  return window.innerWidth >= breakpoints.desktop
}

// ========================================
// Export Convenience
// ========================================

export const themes = {
  dark: darkTheme,
  light: lightTheme,
}

export default useTheme
