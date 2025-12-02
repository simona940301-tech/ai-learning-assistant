import { useState, useEffect } from 'react'

/**
 * PLMS Theme System: Warm Light Theme
 *
 * Unified warm light color palette matching globals.css
 * All components should use Tailwind CSS variables for consistency
 */

// ========================================
// Theme Type Definitions
// ========================================

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
// Warm Light Theme (Unified)
// ========================================
// Colors match globals.css HSL values:
// Background: hsl(44 56% 95%) = #FAF6E9
// Foreground: hsl(14 26% 29%) = #5D4037
// Card: hsl(50 100% 98%) = #FFFDF5
// Primary: hsl(42 98% 70%) = #FED168
// Secondary: hsl(36 41% 67%) = #CCB188
// Accent: hsl(123 23% 42%) = #528555

export const warmLightTheme: ThemeColors = {
  bg: '#FAF6E9',
  card: '#FFFDF5',
  cardHover: '#F8F5E8',
  accent: '#528555',
  accentHover: '#4A7A4D',
  text: '#5D4037',
  textSecondary: '#8B6F47',
  textTertiary: '#A68B6B',
  border: '#E0D0B8',
  borderHover: '#D4C0A8',
  shadow: '0 4px 16px rgba(94, 64, 55, 0.08)',
  shadowHover: '0 6px 24px rgba(94, 64, 55, 0.12)',
  success: '#528555',
  warning: '#D97706',
  error: '#DC2626',
  // Badges
  badgeBg: 'rgba(254, 209, 104, 0.15)',
  badgeBorder: 'rgba(254, 209, 104, 0.3)',
  // Toast
  toastBg: 'rgba(255, 253, 245, 0.95)',
  toastBorder: 'rgba(254, 209, 104, 0.2)',
  // Mini card (slightly darker than card)
  miniCardBg: '#F8F5E8',
  miniCardBorder: '#E0D0B8',
}

// ========================================
// Theme Context & Hook
// ========================================

/**
 * React hook for theme management
 * Always returns warm light theme (no dark mode)
 */
export function useTheme() {
  const [isClient, setIsClient] = useState(false)

  useEffect(() => {
    setIsClient(true)
  }, [])

  return {
    theme: warmLightTheme,
    isClient, // For SSR safety
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

export const theme = warmLightTheme

export default useTheme
