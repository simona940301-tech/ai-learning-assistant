import React, { Children, isValidElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it, vi } from 'vitest'
import { ActionFooter } from '@/components/solve/ExplainCard'

function collectButtons(node: React.ReactNode, acc: React.ReactElement[] = []): React.ReactElement[] {
  if (!node) return acc
  if (Array.isArray(node)) {
    node.forEach((child) => collectButtons(child, acc))
    return acc
  }
  if (isValidElement(node)) {
    if (node.type === 'button') {
      acc.push(node)
    }
    if (node.props?.children) {
      Children.forEach(node.props.children, (child) => collectButtons(child, acc))
    }
  }
  return acc
}

describe('ActionFooter', () => {
  it('renders single primary action when visible', () => {
    const onPrimaryClick = vi.fn()
    const element = ActionFooter({
      visible: true,
      isSaving: false,
      saveStatus: 'idle',
      saveMessage: '',
      onPrimaryClick,
    })

    const markup = renderToStaticMarkup(element)
    expect(markup).toContain('加入錯題本')

    const buttons = collectButtons(element)
    expect(buttons).toHaveLength(1)
    buttons[0].props.onClick?.()
    expect(onPrimaryClick).toHaveBeenCalledTimes(1)
  })

  it('shows status message when provided', () => {
    const element = ActionFooter({
      visible: true,
      isSaving: false,
      saveStatus: 'success',
      saveMessage: '已加入錯題本',
      onPrimaryClick: () => {},
    })

    const markup = renderToStaticMarkup(element)
    expect(markup).toContain('已加入錯題本')
  })
})
;(globalThis as any).React = React
