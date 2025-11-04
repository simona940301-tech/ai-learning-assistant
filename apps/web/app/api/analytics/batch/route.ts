import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

/**
 * POST /api/analytics/batch
 *
 * Batch analytics event receiver
 * Requirement: Accept batched events from client (including beforeunload)
 * Target: < 150ms response time, ≥ 99.5% success rate
 *
 * Features:
 * - Event deduplication by event_id
 * - Simple rate limiting (per user per day)
 * - Append-only storage (no aggregation)
 * - Support for sendBeacon + keepalive
 */

interface AnalyticsEvent {
  event_id: string; // UUID for deduplication
  event_name: string;
  timestamp: string; // ISO timestamp from client
  user_id?: string;
  session_id?: string;
  device?: string;
  context?: Record<string, any>;
  payload?: Record<string, any>;
}

interface BatchRequest {
  events: AnalyticsEvent[];
}

// Rate limiting: Max events per user per day
const MAX_EVENTS_PER_USER_PER_DAY = 10000;
const RATE_LIMIT_WINDOW = 24 * 60 * 60 * 1000; // 24 hours

// In-memory rate limit cache (production should use Redis)
const rateLimitCache = new Map<string, { count: number; resetAt: number }>();

/**
 * Check rate limit for user
 */
function checkRateLimit(userId: string, eventCount: number): boolean {
  const now = Date.now();
  const cached = rateLimitCache.get(userId);

  if (!cached || cached.resetAt < now) {
    // New window
    rateLimitCache.set(userId, {
      count: eventCount,
      resetAt: now + RATE_LIMIT_WINDOW,
    });
    return true;
  }

  // Check if adding new events would exceed limit
  if (cached.count + eventCount > MAX_EVENTS_PER_USER_PER_DAY) {
    return false;
  }

  // Update count
  cached.count += eventCount;
  return true;
}

/**
 * POST handler for batch analytics
 */
export async function POST(req: NextRequest) {
  const startTime = Date.now();

  try {
    const supabase = createClient();

    // Get current user (optional - some events may be anonymous)
    const {
      data: { user },
    } = await supabase.auth.getUser();

    // Parse request body
    let body: BatchRequest;
    try {
      body = await req.json();
    } catch (parseError) {
      return NextResponse.json(
        {
          success: false,
          error: { code: 'INVALID_JSON', message: 'Invalid JSON body' },
        },
        { status: 400 }
      );
    }

    // Validate events array
    if (!body.events || !Array.isArray(body.events) || body.events.length === 0) {
      return NextResponse.json(
        {
          success: false,
          error: { code: 'INVALID_EVENTS', message: 'Events array is required' },
        },
        { status: 400 }
      );
    }

    // Rate limiting (if user is authenticated)
    if (user) {
      if (!checkRateLimit(user.id, body.events.length)) {
        return NextResponse.json(
          {
            success: false,
            error: {
              code: 'RATE_LIMIT_EXCEEDED',
              message: 'Daily event limit exceeded',
            },
          },
          { status: 429 }
        );
      }
    }

    // Process events
    const accepted: string[] = [];
    const duplicated: string[] = [];
    const failed: string[] = [];

    for (const event of body.events) {
      // Validate required fields
      if (!event.event_id || !event.event_name) {
        failed.push(event.event_id || 'unknown');
        continue;
      }

      try {
        // Check for duplicate event_id
        const { data: existing } = await supabase
          .from('analytics_events')
          .select('event_id')
          .eq('event_id', event.event_id)
          .maybeSingle();

        if (existing) {
          duplicated.push(event.event_id);
          continue;
        }

        // Insert event
        const serverTimestamp = new Date().toISOString();
        const { error: insertError } = await supabase.from('analytics_events').insert({
          event_id: event.event_id,
          event_name: event.event_name,
          user_id: user?.id || event.user_id || null,
          session_id: event.session_id || null,
          device: event.device || null,
          client_timestamp: event.timestamp,
          server_timestamp: serverTimestamp,
          context: event.context || {},
          payload: event.payload || {},
          created_at: serverTimestamp,
        });

        if (insertError) {
          console.error('[Analytics Batch] Insert error:', insertError);
          failed.push(event.event_id);
        } else {
          accepted.push(event.event_id);
        }
      } catch (error) {
        console.error('[Analytics Batch] Processing error:', error);
        failed.push(event.event_id);
      }
    }

    const elapsed = Date.now() - startTime;

    // Log performance warning if > 150ms
    if (elapsed > 150) {
      console.warn(`[Analytics Batch] Slow response: ${elapsed}ms for ${body.events.length} events`);
    }

    return NextResponse.json({
      success: true,
      accepted: accepted.length,
      duplicated: duplicated.length,
      failed: failed.length,
      elapsed_ms: elapsed,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    const elapsed = Date.now() - startTime;
    console.error('[Analytics Batch API] Error:', error);

    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: error instanceof Error ? error.message : 'Unknown error',
        },
        elapsed_ms: elapsed,
      },
      { status: 500 }
    );
  }
}

/**
 * OPTIONS handler for CORS (if needed)
 */
export async function OPTIONS(req: NextRequest) {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  });
}
