import React from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { EvidenceLensDisplay } from '@/components/solve/explain/ReadingExplain'

describe('EvidenceLensDisplay', () => {
  it('renders collapsed state with hint', () => {
    const element = EvidenceLensDisplay({
      isOpen: false,
      hasEvidence: true,
      discourseLabel: '因果',
      evidenceEntries: [{ text: 'Evidence sentence' }],
      fallbackMessage: 'fallback',
    })
    const markup = renderToStaticMarkup(element)
    expect(markup).toContain('點擊上方按鈕以檢視原文依據')
    expect(markup).not.toContain('Evidence sentence')
  })

  it('renders evidence entries when open', () => {
    const element = EvidenceLensDisplay({
      isOpen: true,
      hasEvidence: true,
      discourseLabel: '轉折',
      evidenceEntries: [{ text: 'The river provides water resources for the village.' }],
      fallbackMessage: 'fallback',
    })
    const markup = renderToStaticMarkup(element)
    expect(markup).toContain('The river provides water resources for the village.')
    expect(markup).toContain('轉折')
  })

  it('renders fallback message when evidence missing', () => {
    const element = EvidenceLensDisplay({
      isOpen: true,
      hasEvidence: false,
      discourseLabel: null,
      evidenceEntries: [],
      fallbackMessage: '目前沒有找到對應的原文句子，我們先標出關鍵句幫助你對齊思路。',
    })
    const markup = renderToStaticMarkup(element)
    expect(markup).toContain('目前沒有找到對應的原文句子')
  })
})
;(globalThis as any).React = React
