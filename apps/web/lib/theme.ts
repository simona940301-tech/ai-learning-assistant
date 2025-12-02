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
  bg: '#120F0C',
  card: '#191511',
  cardHover: '#201B16',
  accent: '#528555',
  accentHover: '#6A9D70',
  text: '#F6F1E8',
  textSecondary: '#D5CAB8',
  textTertiary: '#A99680',
  border: '#3B3026',
  borderHover: '#4A3A2E',
  shadow: '0 4px 16px rgba(64, 46, 32, 0.30)',
  shadowHover: '0 6px 24px rgba(64, 46, 32, 0.40)',
  success: '#10B981',
  warning: '#F59E0B',
  error: '#EF4444',
  // Badges
  badgeBg: 'rgba(83, 64, 52, 0.25)',
  badgeBorder: 'rgba(83, 64, 52, 0.45)',
  // Toast
  toastBg: 'rgba(25, 21, 17, 0.95)',
  toastBorder: 'rgba(83, 64, 52, 0.40)',
  // Mini card (slightly darker than card)
  miniCardBg: '#14100D',
  miniCardBorder: '#3B3026',
}

// ========================================
// Light Mode Theme (New)
// ========================================

export const lightTheme: ThemeColors = {
  bg: '#FAF6E9',
  card: '#FFFDF5',
  cardHover: '#F2EBDB',
  accent: '#528555',
  accentHover: '#6A9D70',
  text: '#2D2219',
  textSecondary: '#5C4A38',
  textTertiary: '#8A7660',
  border: '#E0D0B8',
  borderHover: '#CBB8A1',
  shadow: '0 4px 16px rgba(83, 64, 52, 0.25)',
  shadowHover: '0 6px 24px rgba(83, 64, 52, 0.35)',
  success: '#059669',
  warning: '#D97706',
  error: '#DC2626',
  // Badges
  badgeBg: 'rgba(83, 64, 52, 0.15)',
  badgeBorder: 'rgba(83, 64, 52, 0.35)',
  // Toast
  toastBg: 'rgba(255, 253, 245, 0.95)',
  toastBorder: 'rgba(83, 64, 52, 0.25)',
  // Mini card (slightly darker than card)
  miniCardBg: '#F2EBDB',
  miniCardBorder: '#E0D0B8',
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
