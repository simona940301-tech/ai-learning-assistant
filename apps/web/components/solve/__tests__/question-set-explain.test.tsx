import React from 'react'
import { describe, expect, it } from 'vitest'
import QuestionSetExplain from '@/components/solve/explain/QuestionSetExplain'
import type { QuestionSetVM } from '@/lib/mapper/vm/question-set'
import { renderToStaticMarkup } from 'react-dom/server'

const sampleQuestionSet: QuestionSetVM = {
  type: 'E0_QUESTION_SET',
  source_context: 'test',
  questions: [
    {
      qid: 1,
      kind: 'vocab',
      stem: 'Choose the best word to complete the sentence.',
      choices: ['desire', 'demand', 'supply', 'burden'],
      answer: 'desire',
      answer_label: 'A',
      one_line_reason: '語義搭配',
      distractor_rejects: [
        { option: 'B', reason: 'demand｜n.｜需求：語境不符' },
      ],
      meta: {},
    },
  ],
}

describe('QuestionSetExplain', () => {
  it('renders distractor reasons for each option', () => {
    const markup = renderToStaticMarkup(
      <QuestionSetExplain
        vm={sampleQuestionSet}
        detectedKind="unknown"
        evidenceLensEnabled={false}
      />,
    )

    expect(markup).toContain('demand｜n.｜需求：語境不符')
  })
})
;(globalThis as any).React = React
