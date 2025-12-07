import { telemetry } from './proto/telemetry'

type MouseEventType = telemetry.MouseEvent.Type

export class ShadowObserver {
    private static instance: ShadowObserver
    private ws: WebSocket | null = null
    private eventBuffer: telemetry.MouseEvent[] = []
    private readonly BATCH_SIZE = 50
    private readonly FLUSH_INTERVAL = 2000 // 2 seconds
    private flushTimer: NodeJS.Timeout | null = null
    private sessionId: string
    private userId: string = 'anonymous'

    // 🚀 SOTA FIX: Retry limits for graceful failure
    private retryCount = 0
    private readonly maxRetries = 3

    private constructor() {
        this.sessionId = Math.random().toString(36).substring(2, 15)

        // 🚀 SOTA FIX: Only connect if explicitly enabled via env var
        // Defaults to false if undefined
        const TELEMETRY_ENABLED = process.env.NEXT_PUBLIC_TELEMETRY_ENABLED === 'true'

        if (typeof window !== 'undefined' && TELEMETRY_ENABLED) {
            this.connect()
            this.startTracking()
        } else if (typeof window !== 'undefined') {
            // Optional: Log only in development to reduce noise in prod
            if (process.env.NODE_ENV === 'development') {
                console.log('[ShadowObserver] Telemetry disabled via NEXT_PUBLIC_TELEMETRY_ENABLED')
            }
        }
    }

    public static getInstance(): ShadowObserver {
        if (!ShadowObserver.instance) {
            ShadowObserver.instance = new ShadowObserver()
        }
        return ShadowObserver.instance
    }

    public setUserId(id: string) {
        this.userId = id
    }

    private connect() {
        const wsUrl = process.env.NEXT_PUBLIC_BATTLE_WS_URL?.replace('/ws/battle', '/ws/telemetry') || 'ws://localhost:8080/ws/telemetry'

        console.log('[ShadowObserver] Connecting to', wsUrl)
        this.ws = new WebSocket(wsUrl)

        this.ws.onopen = () => {
            console.log('[ShadowObserver] Connected (Invisible Mode)')
            // Reset retry count on successful connection
            this.retryCount = 0
        }

        this.ws.onclose = () => {
            // 🚀 SOTA FIX: Graceful failure with retry limits
            if (this.retryCount < this.maxRetries) {
                this.retryCount++
                const delay = 1000 * Math.pow(2, this.retryCount - 1) // Exponential backoff: 1s, 2s, 4s
                console.log(`[ShadowObserver] Reconnecting in ${delay}ms (attempt ${this.retryCount}/${this.maxRetries})`)
                setTimeout(() => this.connect(), delay)
            } else {
                console.warn('[ShadowObserver] Max retries reached. Stopping telemetry.')
            }
        }

        this.ws.onerror = (err) => {
            // Silent fail - only log in development
            if (process.env.NODE_ENV === 'development') {
                console.warn('[ShadowObserver] Connection error', err)
            }
        }
    }

    private startTracking() {
        let lastX = 0
        let lastY = 0
        let lastTime = 0

        // Track Mouse Moves (Throttled)
        window.addEventListener('mousemove', (e) => {
            const now = Date.now()
            if (now - lastTime > 100) { // 10Hz sampling
                this.bufferEvent({
                    x: e.clientX,
                    y: e.clientY,
                    timestamp: now,
                    type: telemetry.MouseEvent.Type.MOVE
                })
                lastX = e.clientX
                lastY = e.clientY
                lastTime = now
            }
        })

        // Track Clicks
        window.addEventListener('click', (e) => {
            this.bufferEvent({
                x: e.clientX,
                y: e.clientY,
                timestamp: Date.now(),
                type: telemetry.MouseEvent.Type.CLICK
            })
        })

        // Start Flush Timer
        this.flushTimer = setInterval(() => this.flush(), this.FLUSH_INTERVAL)
    }

    private bufferEvent(event: telemetry.IMouseEvent) {
        this.eventBuffer.push(telemetry.MouseEvent.create(event))
        if (this.eventBuffer.length >= this.BATCH_SIZE) {
            this.flush()
        }
    }

    private flush() {
        if (this.eventBuffer.length === 0 || !this.ws || this.ws.readyState !== WebSocket.OPEN) return

        const batch = telemetry.TelemetryBatch.create({
            sessionId: this.sessionId,
            userId: this.userId,
            events: this.eventBuffer
        })

        const buffer = telemetry.TelemetryBatch.encode(batch).finish()
        this.ws.send(buffer)

        // Clear buffer
        this.eventBuffer = []
    }
}
