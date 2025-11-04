/**
 * Safe JSON POST with Content-Type validation
 * Prevents "Unexpected token '<'" errors when API returns HTML
 */
export async function postJSON<T = any>(url: string, body: unknown): Promise<T> {
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })

  // Read response as text first
  const text = await res.text()
  const contentType = res.headers.get('content-type') || ''

  // Check if response is OK
  if (!res.ok) {
    // For 404/500, throw error with text snippet (not JSON parse)
    throw new Error(
      `HTTP ${res.status} ${res.statusText} — ${text.slice(0, 200)}`
    )
  }

  // Validate Content-Type before parsing
  if (!contentType.includes('application/json')) {
    throw new Error(
      `INVALID_CONTENT_TYPE: expected JSON, got "${contentType || 'unknown'}" — ${text.slice(0, 200)}`
    )
  }

  // Safe JSON parse with error handling
  try {
    return JSON.parse(text) as T
  } catch (e) {
    throw new Error(
      `INVALID_JSON: ${String(e)} — ${text.slice(0, 200)}`
    )
  }
}

