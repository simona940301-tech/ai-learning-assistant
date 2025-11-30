/**
 * Notification Service
 * 
 * Manages push notification permissions and subscriptions
 */

import { FEATURE_FLAGS } from './config'
import type { PushSubscriptionState } from './types'

const VAPID_PUBLIC_KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY

export class NotificationService {
    private static instance: NotificationService

    private constructor() { }

    static getInstance(): NotificationService {
        if (!NotificationService.instance) {
            NotificationService.instance = new NotificationService()
        }
        return NotificationService.instance
    }

    /**
     * Check if push notifications are supported
     */
    isSupported(): boolean {
        if (!FEATURE_FLAGS.enablePushNotifications) return false
        return (
            typeof window !== 'undefined' &&
            'serviceWorker' in navigator &&
            'PushManager' in window &&
            'Notification' in window
        )
    }

    /**
     * Get current subscription state
     */
    async getSubscriptionState(): Promise<PushSubscriptionState> {
        if (!this.isSupported()) {
            return {
                isSupported: false,
                isSubscribed: false,
                subscription: null,
                permission: 'denied',
            }
        }

        const permission = Notification.permission
        const registration = await navigator.serviceWorker.ready
        const subscription = await registration.pushManager.getSubscription()

        return {
            isSupported: true,
            isSubscribed: !!subscription,
            subscription,
            permission,
        }
    }

    /**
     * Request notification permission
     */
    async requestPermission(): Promise<NotificationPermission> {
        if (!this.isSupported()) return 'denied'
        return await Notification.requestPermission()
    }

    /**
     * Subscribe to push notifications
     */
    async subscribe(): Promise<PushSubscription | null> {
        if (!this.isSupported() || !VAPID_PUBLIC_KEY) {
            console.warn('Push notifications not supported or VAPID key missing')
            return null
        }

        try {
            const permission = await this.requestPermission()
            if (permission !== 'granted') {
                throw new Error('Permission denied')
            }

            const registration = await navigator.serviceWorker.ready

            // Subscribe to push service
            const subscription = await registration.pushManager.subscribe({
                userVisibleOnly: true,
                applicationServerKey: this.urlBase64ToUint8Array(VAPID_PUBLIC_KEY) as any,
            })

            // Send subscription to backend
            await this.sendSubscriptionToBackend(subscription)

            return subscription
        } catch (error) {
            console.error('Failed to subscribe to push notifications:', error)
            return null
        }
    }

    /**
     * Unsubscribe from push notifications
     */
    async unsubscribe(): Promise<boolean> {
        if (!this.isSupported()) return false

        try {
            const registration = await navigator.serviceWorker.ready
            const subscription = await registration.pushManager.getSubscription()

            if (subscription) {
                await subscription.unsubscribe()
                // Notify backend
                await this.removeSubscriptionFromBackend(subscription)
                return true
            }
            return false
        } catch (error) {
            console.error('Failed to unsubscribe:', error)
            return false
        }
    }

    /**
     * Helper to convert VAPID key
     */
    private urlBase64ToUint8Array(base64String: string): Uint8Array {
        const padding = '='.repeat((4 - (base64String.length % 4)) % 4)
        const base64 = (base64String + padding)
            .replace(/\-/g, '+')
            .replace(/_/g, '/')

        const rawData = window.atob(base64)
        const outputArray = new Uint8Array(rawData.length)

        for (let i = 0; i < rawData.length; ++i) {
            outputArray[i] = rawData.charCodeAt(i)
        }
        return outputArray
    }

    /**
     * Send subscription to backend API
     */
    private async sendSubscriptionToBackend(subscription: PushSubscription) {
        try {
            const response = await fetch('/api/notifications/subscribe', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(subscription),
            })

            if (!response.ok) {
                throw new Error('Failed to save subscription')
            }
        } catch (error) {
            console.error('Error sending subscription to backend:', error)
            // Don't throw here, as the push subscription itself was successful
        }
    }

    /**
     * Remove subscription from backend API
     */
    private async removeSubscriptionFromBackend(subscription: PushSubscription) {
        try {
            await fetch('/api/notifications/unsubscribe', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ endpoint: subscription.endpoint }),
            })
        } catch (error) {
            console.error('Error removing subscription from backend:', error)
        }
    }
}

export const notificationService = NotificationService.getInstance()
