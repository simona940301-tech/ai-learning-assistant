type EventName =
  // Auth events
  | 'login'
  | 'logout'
  // Question events
  | 'submit_ready_score'
  | 'view_question'
  | 'add_error'
  | 'review_complete'
  // Pack events (Module 2: Shop)
  | 'pack.search'
  | 'pack.view'
  | 'pack.install'
  | 'pack.uninstall'
  // Mission events (Module 3: Micro-Missions)
  | 'mission.start'
  | 'mission.complete'
  | 'mission.abandon'
  | 'practice.answer'
  // Batch 1 Hotfix events
  | 'qr_page_view'
  | 'pack_install_click'
  | 'pack_install_success'
  | 'pack_install_failed'
  | 'mission_start_auto'
  | 'micro_card_viewed'
  | 'micro_start_click'
  | 'micro_completed_today'
  | 'answer_saved'
  | 'telemetry_flush_before_unload'
  | 'explain_card_viewed'
  | 'cta_practice_again_click'
  | 'cta_practice_similar_click'
  | 'cta_practice_another_click'
  // Explain card v1.0 events
  | 'explain.view'
  | 'carousel.swipe'
  | 'evidence.view'
  | 'highlight.sync'
  // Reading comprehension events
  | 'reading.view'
  | 'question.select'
  | 'mistake.select'
  | 'vocab.add'
  | 'reading.reflect.submit'
  // New UI/UX upgrade events
  | 'reason.flow.step.click'
  | 'notes.create'
  | 'notes.update'
  | 'notes.delete'
  | 'vocab.expand'
  | 'vocab.complete'
  | 'vocab.master'
  | 'backpack.save'
  | 'ask.input.send'
  | 'ask.input.upload.start'
  | 'ask.input.upload.success'
  | 'ask.input.upload.fail'
  | 'ask.input.upload.cancel'
  | 'ask.input.paste.image';

/**
 * Analytics Event Structure (Batch 1.5)
 */
interface AnalyticsEvent {
  event_id: string; // UUID for deduplication
  event_name: EventName;
  timestamp: string;
  user_id?: string;
  session_id?: string;
  device?: string;
  context?: Record<string, any>;
  payload?: Record<string, any>;
}

// Analytics buffer for batch upload
let analyticsBuffer: AnalyticsEvent[] = [];
const BUFFER_SIZE = 10; // Upload every 10 events
const BUFFER_TIMEOUT = 30000; // Or every 30 seconds

let bufferTimer: NodeJS.Timeout | null = null;
let sessionId: string | null = null;

/**
 * Generate UUID v4 (simplified implementation)
 */
function generateUUID(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

/**
 * Get or create session ID
 */
function getSessionId(): string {
  if (sessionId) return sessionId;

  if (typeof sessionStorage !== 'undefined') {
    const existing = sessionStorage.getItem('analytics_session_id');
    if (existing) {
      sessionId = existing;
      return sessionId;
    }
  }

  sessionId = generateUUID();

  if (typeof sessionStorage !== 'undefined') {
    sessionStorage.setItem('analytics_session_id', sessionId);
  }

  return sessionId;
}

/**
 * Detect device type
 */
function getDeviceType(): string {
  if (typeof window === 'undefined') return 'server';

  const ua = navigator.userAgent.toLowerCase();
  if (/mobile|android|iphone|ipad|ipod/.test(ua)) return 'mobile';
  if (/tablet|ipad/.test(ua)) return 'tablet';
  return 'desktop';
}

/**
 * Track an event (adds to buffer for batch upload)
 * Batch 1.5: Generates event_id for deduplication
 */
export function track(event: EventName, props: Record<string, any> = {}) {
  const timestamp = new Date().toISOString();

  // Separate context from payload
  const { user_id, ...otherProps } = props;

  const analyticsEvent: AnalyticsEvent = {
    event_id: generateUUID(),
    event_name: event,
    timestamp,
    session_id: getSessionId(),
    device: getDeviceType(),
    user_id: user_id as string | undefined,
    context: {
      url: typeof window !== 'undefined' ? window.location.href : undefined,
      referrer: typeof document !== 'undefined' ? document.referrer : undefined,
      userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : undefined,
    },
    payload: otherProps,
  };

  console.log(`[Analytics] ${event}`, analyticsEvent);

  // Add to buffer
  analyticsBuffer.push(analyticsEvent);

  // Upload if buffer is full
  if (analyticsBuffer.length >= BUFFER_SIZE) {
    flushAnalytics();
  } else {
    // Schedule upload if not already scheduled
    if (!bufferTimer) {
      bufferTimer = setTimeout(() => {
        flushAnalytics();
      }, BUFFER_TIMEOUT);
    }
  }
}

/**
 * Flush analytics buffer (batch upload)
 * Uses sendBeacon for page unload, fetch for normal uploads
 * Batch 1.5: Sends to /api/analytics/batch endpoint
 */
export async function flushAnalytics(useBeacon = false): Promise<void> {
  if (analyticsBuffer.length === 0) return;

  const eventsToUpload = [...analyticsBuffer];
  analyticsBuffer = [];

  // Clear timer
  if (bufferTimer) {
    clearTimeout(bufferTimer);
    bufferTimer = null;
  }

  try {
    const payload = JSON.stringify({ events: eventsToUpload });
    const endpoint = '/api/analytics/batch';

    if (useBeacon && typeof navigator !== 'undefined' && 'sendBeacon' in navigator) {
      // Use sendBeacon for page unload (more reliable)
      const blob = new Blob([payload], { type: 'application/json' });
      const success = navigator.sendBeacon(endpoint, blob);

      if (success) {
        console.log(`[Analytics] Beacon sent ${eventsToUpload.length} events`);
      } else {
        // Fallback to keepalive fetch
        console.warn('[Analytics] Beacon failed, using keepalive fetch');
        await fetch(endpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: payload,
          keepalive: true,
        });
      }
    } else {
      // Normal fetch for regular uploads
      console.log(`[Analytics] Uploading ${eventsToUpload.length} events`);
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: payload,
      });

      if (!response.ok) {
        throw new Error(`Batch upload failed: ${response.status}`);
      }

      const result = await response.json();
      console.log(
        `[Analytics] Upload complete: ${result.accepted} accepted, ${result.duplicated} duplicated (${result.elapsed_ms}ms)`
      );
    }
  } catch (error) {
    console.error('[Analytics] Upload failed:', error);

    // Only re-add if not a beacon upload (beacon is fire-and-forget)
    if (!useBeacon) {
      analyticsBuffer.unshift(...eventsToUpload);
    }
  }
}

/**
 * Force flush analytics (call on app close/background)
 */
export function forceFlushAnalytics(): void {
  if (analyticsBuffer.length > 0) {
    flushAnalytics(true); // Use beacon for unload
  }
}

/**
 * Setup beforeunload listener for automatic flush
 * Call this once in your app initialization
 */
export function setupBeforeUnloadFlush(): void {
  if (typeof window === 'undefined') return;

  // Flush on page unload
  window.addEventListener('beforeunload', () => {
    forceFlushAnalytics();
  });

  // Also flush on visibility change (mobile tab switching)
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') {
      forceFlushAnalytics();
    }
  });
}
