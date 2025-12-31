export function getAdaptiveCountdownDuration(totalMatches?: number | null): number {
  if (typeof totalMatches !== 'number') return 3
  if (totalMatches >= 20) return 1
  if (totalMatches >= 5) return 2
  return 3
}

export function formatScoreDiff(diff: number): { label: string; highlight: 'lead' | 'behind' | 'even' } {
  if (diff === 0) {
    return { label: '焦灼對決', highlight: 'even' }
  }
  if (diff > 0) {
    return { label: `領先 ${Math.abs(diff)} 分`, highlight: 'lead' }
  }
  return { label: `落後 ${Math.abs(diff)} 分`, highlight: 'behind' }
}
