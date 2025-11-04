import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

/**
 * CR7: Permission Middleware for Internal APIs
 *
 * Ensures only admin/teacher roles can access internal endpoints
 */

export type UserRole = 'admin' | 'teacher' | 'student' | 'guest';

export interface AuthContext {
  userId: string;
  role: UserRole;
  email: string;
}

/**
 * Check if user has required role for internal API access
 */
export async function checkInternalPermission(
  req: NextRequest
): Promise<{ authorized: boolean; context?: AuthContext; error?: string }> {
  try {
    // Get authorization token
    const authHeader = req.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return {
        authorized: false,
        error: 'Missing or invalid authorization header',
      };
    }

    const token = authHeader.substring(7);

    // Verify token with Supabase
    const supabase = createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser(token);

    if (authError || !user) {
      return {
        authorized: false,
        error: 'Invalid or expired token',
      };
    }

    // Get user role from database
    const { data: profile, error: profileError } = await supabase
      .from('users')
      .select('role, email')
      .eq('id', user.id)
      .single();

    if (profileError || !profile) {
      return {
        authorized: false,
        error: 'User profile not found',
      };
    }

    const role = profile.role as UserRole;

    // Check if role is admin or teacher
    if (role !== 'admin' && role !== 'teacher') {
      return {
        authorized: false,
        error: 'Insufficient permissions. Internal APIs require admin or teacher role.',
      };
    }

    return {
      authorized: true,
      context: {
        userId: user.id,
        role,
        email: profile.email,
      },
    };
  } catch (error) {
    console.error('[Auth Middleware] Error:', error);
    return {
      authorized: false,
      error: 'Authentication failed',
    };
  }
}

/**
 * Middleware wrapper for internal API routes
 *
 * Usage:
 * ```ts
 * export async function POST(req: NextRequest) {
 *   const authResult = await withInternalAuth(req);
 *   if (!authResult.authorized) {
 *     return NextResponse.json({ error: authResult.error }, { status: 401 });
 *   }
 *
 *   // Access authenticated user context
 *   const { userId, role } = authResult.context!;
 *   // ... your API logic
 * }
 * ```
 */
export async function withInternalAuth(req: NextRequest) {
  return await checkInternalPermission(req);
}

/**
 * Unauthorized response helper
 */
export function unauthorizedResponse(error: string) {
  return NextResponse.json(
    {
      success: false,
      error: {
        code: 'UNAUTHORIZED',
        message: error,
      },
      timestamp: new Date().toISOString(),
    },
    { status: 401 }
  );
}

/**
 * Forbidden response helper
 */
export function forbiddenResponse(error: string) {
  return NextResponse.json(
    {
      success: false,
      error: {
        code: 'FORBIDDEN',
        message: error,
      },
      timestamp: new Date().toISOString(),
    },
    { status: 403 }
  );
}
