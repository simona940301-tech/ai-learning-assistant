import { NextResponse } from 'next/server'

/**
 * CORS Headers Configuration
 * Ensures mobile browsers can make cross-origin requests
 */
export const CORS_HEADERS = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-API-Key, X-Internal-API-Key',
    'Access-Control-Max-Age': '86400', // 24 hours
}

/**
 * Add CORS headers to a NextResponse
 */
export function addCorsHeaders(response: NextResponse): NextResponse {
    Object.entries(CORS_HEADERS).forEach(([key, value]) => {
        response.headers.set(key, value)
    })
    return response
}

/**
 * Create a CORS-enabled JSON response
 */
export function corsJsonResponse(data: any, init?: ResponseInit): NextResponse {
    const response = NextResponse.json(data, init)
    return addCorsHeaders(response)
}

/**
 * Standard OPTIONS handler for CORS preflight
 * Use this in all API routes that need CORS support
 */
export function createOptionsHandler() {
    return function OPTIONS() {
        return new NextResponse(null, {
            status: 200,
            headers: CORS_HEADERS,
        })
    }
}
