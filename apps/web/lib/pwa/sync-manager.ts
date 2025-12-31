/**
 * Sync Manager
 * 
 * Manages background synchronization and queuing of offline requests
 */

import { FEATURE_FLAGS, STORAGE_KEYS, SYNC_CONFIG } from './config'
import type { SyncTask, SyncQueueState } from './types'
import { v4 as uuidv4 } from 'uuid'

// Extend ServiceWorkerRegistration to include sync
declare global {
    interface ServiceWorkerRegistration {
        readonly sync: {
            register(tag: string): Promise<void>
            getTags(): Promise<string[]>
        }
    }
    interface Window {
        SyncManager: any
    }
}

export class SyncManager {
    private static instance: SyncManager
    private isSyncing = false

    private constructor() {
        if (typeof window !== 'undefined') {
            window.addEventListener('online', () => this.processQueue())
        }
    }

    static getInstance(): SyncManager {
        if (!SyncManager.instance) {
            SyncManager.instance = new SyncManager()
        }
        return SyncManager.instance
    }

    /**
     * Add a request to the sync queue
     */
    async addToQueue(task: Omit<SyncTask, 'id' | 'createdAt' | 'retryCount' | 'maxRetries'>): Promise<string> {
        const id = uuidv4()
        const fullTask: SyncTask = {
            ...task,
            id,
            createdAt: new Date(),
            retryCount: 0,
            maxRetries: SYNC_CONFIG.maxRetries,
        }

        const queue = this.getQueue()
        queue.pending.push(fullTask)
        this.saveQueue(queue)

        // Try to register background sync
        if (FEATURE_FLAGS.enableBackgroundSync && 'serviceWorker' in navigator && 'SyncManager' in window) {
            try {
                const registration = await navigator.serviceWorker.ready
                await registration.sync.register('sync-queue')
            } catch (error) {
                console.warn('Background sync registration failed:', error)
            }
        }

        // Try to process immediately if online
        if (navigator.onLine) {
            this.processQueue()
        }

        return id
    }

    /**
     * Process the sync queue
     */
    async processQueue(): Promise<void> {
        if (this.isSyncing || !navigator.onLine) return

        this.isSyncing = true
        const queue = this.getQueue()
        const pendingTasks = [...queue.pending]

        if (pendingTasks.length === 0) {
            this.isSyncing = false
            return
        }

        console.log(`Processing ${pendingTasks.length} pending tasks...`)

        for (const task of pendingTasks) {
            try {
                await this.executeTask(task)

                // Move to completed
                queue.pending = queue.pending.filter(t => t.id !== task.id)
                queue.completed.push({ ...task, lastAttempt: new Date() })

                // Keep completed list small
                if (queue.completed.length > 50) {
                    queue.completed.shift()
                }
            } catch (error) {
                console.error(`Task ${task.id} failed:`, error)

                task.retryCount++
                task.lastAttempt = new Date()

                if (task.retryCount >= task.maxRetries) {
                    // Move to failed
                    queue.pending = queue.pending.filter(t => t.id !== task.id)
                    queue.failed.push(task)
                } else {
                    // Update in pending
                    const index = queue.pending.findIndex(t => t.id === task.id)
                    if (index !== -1) {
                        queue.pending[index] = task
                    }
                }
            }

            // Save state after each task
            this.saveQueue(queue)
        }

        this.isSyncing = false

        // If there are still pending tasks (retries), schedule next check
        if (queue.pending.length > 0) {
            setTimeout(() => this.processQueue(), SYNC_CONFIG.retryDelay)
        }
    }

    /**
     * Execute a single task
     */
    private async executeTask(task: SyncTask): Promise<void> {
        const response = await fetch(task.url, {
            method: task.method,
            headers: task.headers,
            body: task.body ? JSON.stringify(task.body) : undefined,
        })

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`)
        }
    }

    /**
     * Get current queue state
     */
    getQueue(): SyncQueueState {
        if (typeof window === 'undefined') {
            return { pending: [], failed: [], completed: [] }
        }

        const stored = localStorage.getItem(STORAGE_KEYS.SYNC_QUEUE)
        if (!stored) {
            return { pending: [], failed: [], completed: [] }
        }

        try {
            return JSON.parse(stored)
        } catch {
            return { pending: [], failed: [], completed: [] }
        }
    }

    /**
     * Save queue state
     */
    private saveQueue(queue: SyncQueueState) {
        if (typeof window !== 'undefined') {
            localStorage.setItem(STORAGE_KEYS.SYNC_QUEUE, JSON.stringify(queue))
        }
    }

    /**
     * Clear completed tasks
     */
    clearCompleted() {
        const queue = this.getQueue()
        queue.completed = []
        this.saveQueue(queue)
    }

    /**
     * Retry failed tasks
     */
    retryFailed() {
        const queue = this.getQueue()
        const failedTasks = [...queue.failed]

        // Reset retry counts and move back to pending
        failedTasks.forEach(task => {
            task.retryCount = 0
            queue.pending.push(task)
        })

        queue.failed = []
        this.saveQueue(queue)
        this.processQueue()
    }
}

export const syncManager = SyncManager.getInstance()
