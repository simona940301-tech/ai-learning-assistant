/**
 * Tests for Cloze evidence jumping and highlighting
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { adaptClozeVM, findBlankMarker, getParagraphId, getParagraphIndex } from '../cloze-adapter'
import type { ClozeVM } from '@/lib/mapper/explain-presenter'

describe('adaptClozeVM', () => {
  const mockClozeVM: ClozeVM = {
    id: 'cloze-1',
    kind: 'E3',
    article: {
      en: 'First paragraph with important information.\n\nSecond paragraph contains the blank ( 1 ) here.\n\nThird paragraph concludes.',
      zh: '第一段有重要資訊。第二段包含空格。第三段總結。',
    },
    answer: {
      label: 'B',
      text: 'however',
      correct: true,
      reason: '表示轉折關係',
    },
    options: [
      { label: 'A', text: 'therefore', correct: false, reason: '因果關係不符' },
      { label: 'B', text: 'however', correct: true, reason: '表示轉折關係' },
      { label: 'C', text: 'moreover', correct: false, reason: '遞進關係不符' },
      { label: 'D', text: 'nevertheless', correct: false, reason: '語氣過強' },
    ],
    meta: {
      blankIndex: 0,
      totalBlanks: 3,
      discourseTag: '轉折',
      sentenceSpan: { start: 60, end: 90 },
      snippet: 'Second paragraph contains the blank ( 1 ) here.',
      reasonLine: '此處表示前後文的轉折關係',
    },
  }

  it('should convert ClozeVM to unified PassageVM', () => {
    const result = adaptClozeVM(mockClozeVM)

    expect(result.kind).toBe('E3')
    expect(result.passage.raw).toBe(mockClozeVM.article!.en)
    expect(result.passage.paragraphs).toHaveLength(3)
    expect(result.passage.paragraphs[0].id).toBe('p1')
    expect(result.passage.paragraphs[1].id).toBe('p2')
    expect(result.passage.paragraphs[2].id).toBe('p3')
  })

  it('should create question with correct ID and prompt', () => {
    const result = adaptClozeVM(mockClozeVM)

    expect(result.questions).toHaveLength(1)
    expect(result.questions[0].id).toBe('blank-1')
    expect(result.questions[0].prompt).toContain('( 1 )')
  })

  it('should map options correctly with verdicts', () => {
    const result = adaptClozeVM(mockClozeVM)
    const question = result.questions[0]

    expect(question.options).toHaveLength(4)

    const correctOption = question.options!.find((opt) => opt.key === 'B')
    expect(correctOption?.verdict).toBe('fit')
    expect(correctOption?.text).toBe('however')

    const wrongOption = question.options!.find((opt) => opt.key === 'A')
    expect(wrongOption?.verdict).toBe('unfit')
    expect(wrongOption?.reason).toBe('因果關係不符')
  })

  it('should extract one-line reason', () => {
    const result = adaptClozeVM(mockClozeVM)
    const question = result.questions[0]

    expect(question.reasonOneLine).toBe('此處表示前後文的轉折關係')
  })

  it('should infer evidence from sentence span', () => {
    const result = adaptClozeVM(mockClozeVM)
    const question = result.questions[0]

    expect(question.evidence).toHaveLength(1)
    // Sentence span start:60 should be in second paragraph
    expect(question.evidence[0].paraId).toBe('p2')
  })

  it('should include discourse role', () => {
    const result = adaptClozeVM(mockClozeVM)
    const question = result.questions[0]

    expect(question.discourseRole).toBe('轉折')
  })

  it('should include translation', () => {
    const result = adaptClozeVM(mockClozeVM)

    expect(result.translation).toBe(mockClozeVM.article!.zh)
  })

  it('should handle missing article gracefully', () => {
    const viewWithoutArticle: ClozeVM = {
      ...mockClozeVM,
      article: undefined,
    }

    const result = adaptClozeVM(viewWithoutArticle)

    expect(result.passage.paragraphs).toHaveLength(0)
    expect(result.passage.raw).toBe('')
  })

  it('should handle missing options', () => {
    const viewWithoutOptions: ClozeVM = {
      ...mockClozeVM,
      options: undefined,
    }

    const result = adaptClozeVM(viewWithoutOptions)
    const question = result.questions[0]

    expect(question.options).toEqual([])
  })

  it('should truncate long reason lines', () => {
    const longReason = 'A'.repeat(150)
    const viewWithLongReason: ClozeVM = {
      ...mockClozeVM,
      meta: {
        ...mockClozeVM.meta,
        reasonLine: longReason,
      },
    }

    const result = adaptClozeVM(viewWithLongReason)
    const question = result.questions[0]

    expect(question.reasonOneLine!.length).toBeLessThanOrEqual(100)
    expect(question.reasonOneLine).toContain('...')
  })
})

describe('getParagraphId', () => {
  it('should convert 0-based index to p1, p2, p3', () => {
    expect(getParagraphId(0)).toBe('p1')
    expect(getParagraphId(1)).toBe('p2')
    expect(getParagraphId(2)).toBe('p3')
    expect(getParagraphId(10)).toBe('p11')
  })
})

describe('getParagraphIndex', () => {
  it('should convert p1, p2, p3 to 0-based index', () => {
    expect(getParagraphIndex('p1')).toBe(0)
    expect(getParagraphIndex('p2')).toBe(1)
    expect(getParagraphIndex('p3')).toBe(2)
    expect(getParagraphIndex('p11')).toBe(10)
  })
})

describe('findBlankMarker', () => {
  it('should find blank markers in text', () => {
    const text = 'This is a sentence with blank (1) and another (2) here.'

    expect(findBlankMarker(text, 1)).toBeGreaterThan(-1)
    expect(findBlankMarker(text, 2)).toBeGreaterThan(-1)
  })

  it('should handle spaced blank markers', () => {
    const text = 'Blank with spaces ( 1 ) in text.'

    expect(findBlankMarker(text, 1)).toBeGreaterThan(-1)
  })

  it('should return -1 for non-existent blank', () => {
    const text = 'No blanks here.'

    expect(findBlankMarker(text, 1)).toBe(-1)
  })
})
