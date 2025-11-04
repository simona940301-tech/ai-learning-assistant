/**
 * New TARS+KCE Router
 * Replaces legacy router.ts with API-based explanation
 */
import type { ExplainMode, ExplainRequest, ExplainViewModel } from '@/lib/types'

/**
 * Call /api/explain endpoint
 */
export async function explainViaAPI(req: ExplainRequest): Promise<ExplainViewModel> {
  const res = await fetch('/api/explain', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(req),
  })

  if (!res.ok) {
    throw new Error(`Explain API error: ${res.status}`)
  }

  return (await res.json()) as ExplainViewModel
}
