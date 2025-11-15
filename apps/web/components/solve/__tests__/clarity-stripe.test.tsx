import React from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { ClarityStripe } from '@/components/solve/ExplainCard'

describe('ClarityStripe', () => {
  it('renders answer, reason, and confidence text', () => {
    const element = ClarityStripe({
      enabled: true,
      data: {
        answerLabel: 'A',
        answerText: 'Answer text',
        reason: '重點結論',
        confidence: 'high',
      },
    })

    const html = renderToStaticMarkup(element)
    expect(html).toContain('A')
    expect(html).toContain('Answer text')
    expect(html).toContain('重點結論')
    expect(html).toContain('信心：高')
  })

  it('returns null when disabled', () => {
    const element = ClarityStripe({ enabled: false, data: null })
    expect(element).toBeNull()
  })
})

;(globalThis as any).React = React
