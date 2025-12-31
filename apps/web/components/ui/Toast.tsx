'use client'

/**
 * Simple toast notification system
 * Uses native browser notifications for simplicity
 */

type ToastType = 'success' | 'error' | 'info' | 'warning' | 'loading'

interface ToastOptions {
  duration?: number
  type?: ToastType
}

class ToastManager {
  private container: HTMLDivElement | null = null

  private ensureContainer() {
    if (typeof window === 'undefined') return null

    if (!this.container) {
      this.container = document.createElement('div')
      this.container.id = 'toast-container'
      this.container.style.cssText = `
        position: fixed;
        top: 1rem;
        right: 1rem;
        z-index: 9999;
        display: flex;
        flex-direction: column;
        gap: 0.5rem;
        pointer-events: none;
      `
      document.body.appendChild(this.container)
    }

    return this.container
  }

  private getToastStyles(type: ToastType): string {
    const baseStyles = `
      padding: 0.75rem 1rem;
      border-radius: 0.5rem;
      font-size: 0.875rem;
      font-weight: 500;
      box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
      pointer-events: auto;
      animation: slideIn 0.3s ease-out;
      max-width: 20rem;
      word-wrap: break-word;
    `

    const typeStyles: Record<ToastType, string> = {
      success: 'background: #10b981; color: white;',
      error: 'background: #ef4444; color: white;',
      info: 'background: #3b82f6; color: white;',
      warning: 'background: #f59e0b; color: white;',
      loading: 'background: #6366f1; color: white;',
    }

    return baseStyles + typeStyles[type]
  }

  show(message: string, options: ToastOptions = {}) {
    const { duration = 3000, type = 'info' } = options
    const container = this.ensureContainer()

    if (!container) return

    // Add animation styles if not already added
    if (!document.getElementById('toast-animations')) {
      const style = document.createElement('style')
      style.id = 'toast-animations'
      style.textContent = `
        @keyframes slideIn {
          from {
            transform: translateX(100%);
            opacity: 0;
          }
          to {
            transform: translateX(0);
            opacity: 1;
          }
        }
        @keyframes slideOut {
          from {
            transform: translateX(0);
            opacity: 1;
          }
          to {
            transform: translateX(100%);
            opacity: 0;
          }
        }
      `
      document.head.appendChild(style)
    }

    const toast = document.createElement('div')
    toast.textContent = message
    toast.style.cssText = this.getToastStyles(type)

    container.appendChild(toast)

    // Auto remove after duration
    setTimeout(() => {
      toast.style.animation = 'slideOut 0.3s ease-out'
      setTimeout(() => {
        if (toast.parentNode === container) {
          container.removeChild(toast)
        }

        // Clean up container if empty
        if (container.children.length === 0 && container.parentNode) {
          container.parentNode.removeChild(container)
          this.container = null
        }
      }, 300)
    }, duration)
  }

  success(message: string, duration?: number) {
    this.show(message, { type: 'success', duration })
  }

  error(message: string, duration?: number) {
    this.show(message, { type: 'error', duration })
  }

  info(message: string, duration?: number) {
    this.show(message, { type: 'info', duration })
  }

  warning(message: string, duration?: number) {
    this.show(message, { type: 'warning', duration })
  }

  loading(message: string, duration?: number) {
    this.show(message, { type: 'loading', duration })
  }
}

export const toast = new ToastManager()
