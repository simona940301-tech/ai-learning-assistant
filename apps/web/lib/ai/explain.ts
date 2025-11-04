/**
 * Explain Orchestrator
 * Coordinates TARS detection and KCE explanation
 */
import { runTARS } from './tars'
import { runKCE } from './kce'
import type { ExplainMode, ExplainViewModel, ExplainKind } from '@/lib/types'

export async function runExplain({
  input,
  mode,
}: {
  input: { text?: string; imageUrl?: string }
  mode: ExplainMode
}): Promise<ExplainViewModel> {
  const text = input.text || ''
  
  // Step 1: TARS detection
  const tars = await runTARS(text)
  const kind = (tars?.kind ?? 'vocab') as ExplainKind

  // Step 2: KCE explanation
  const vm = await runKCE({ input, kind, mode })

  // Ensure required fields
  vm.kind = kind
  vm.mode = mode
  if (!vm.answer) vm.answer = ''
  if (!vm.briefReason) vm.briefReason = '依據文意判定。'

  return vm
}
