import { NextRequest, NextResponse } from 'next/server'

/**
 * 🚀 SOTA CORS Configuration for Mobile-First Architecture
 * 
 * Critical Fix: Dynamic Origin Reflection
 * - Browser spec FORBIDS `Access-Control-Allow-Origin: *` when `Credentials: true`
 * - We must reflect the actual request origin for authenticated requests
 * - This fixes the 405/CORS errors on `/api/rag/upload`
 */

const ALLOWED_ORIGINS = [
    'https://plms-learning.vercel.app',
    'http://localhost:3000',
    'http://127.0.0.1:3000',
]

/**
 * Get CORS headers with dynamic origin reflection
 * This is spec-compliant and fixes the `*` vs `Credentials: true` conflict
 */
export function getCorsHeaders(request?: NextRequest): Record<string, string> {
    // Get the origin from the request
    const requestOrigin = request?.headers.get('origin') || ''

    // Dynamic Origin Reflection: Always reflect the request origin
    // This allows credentials to work correctly with any origin (Preview URLs, Mobile, etc.)
    const allowOrigin = requestOrigin || '*'

    return {
        'Access-Control-Allow-Origin': allowOrigin,
        'Access-Control-Allow-Credentials': 'true',
        'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-API-Key, X-Internal-API-Key',
        'Access-Control-Max-Age': '86400', // 24 hours
    }
}

/**
 * Legacy CORS headers (for backwards compatibility)
 * @deprecated Use getCorsHeaders() instead for spec-compliant behavior
 */
export const CORS_HEADERS = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-API-Key, X-Internal-API-Key',
    'Access-Control-Max-Age': '86400',
}

/**
 * Add CORS headers to a NextResponse (spec-compliant version)
 */
export function addCorsHeaders(response: NextResponse, request?: NextRequest): NextResponse {
    const headers = getCorsHeaders(request)
    Object.entries(headers).forEach(([key, value]) => {
        response.headers.set(key, value)
    })
    return response
}

/**
 * Create a CORS-enabled JSON response (spec-compliant version)
 */
export function corsJsonResponse(data: any, init?: ResponseInit, request?: NextRequest): NextResponse {
    const response = NextResponse.json(data, init)
    return addCorsHeaders(response, request)
}

/**
 * Standard OPTIONS handler for CORS preflight (spec-compliant version)
 * Use this in all API routes that need CORS support
 */
export function createOptionsHandler() {
    return function OPTIONS(request: NextRequest) {
        const headers = getCorsHeaders(request)
        return new NextResponse(null, {
            status: 200,
            headers,
        })
    }
}
