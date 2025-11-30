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

    private constructor() {
        this.sessionId = Math.random().toString(36).substring(2, 15)
        if (typeof window !== 'undefined') {
            this.connect()
            this.startTracking()
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
        }

        this.ws.onclose = () => {
            // Silent reconnect attempt after 5s
            setTimeout(() => this.connect(), 5000)
        }

        this.ws.onerror = (err) => {
            // Silent fail
            console.warn('[ShadowObserver] Connection error', err)
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
