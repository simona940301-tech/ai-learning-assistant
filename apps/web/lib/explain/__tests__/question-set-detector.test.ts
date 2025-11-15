import { describe, expect, it } from 'vitest'
import {
  analyseQuestionSet,
  detectQuestionSetKind,
  type QuestionSetKind,
} from '@/lib/explain/question-set-detector'

const readingWithQuestions = `
Deer populations in Africa have been monitored for decades. Conservationists observed that during drought years, herds migrate toward river basins. (1) These movements affect predator territories and local farming communities.

1. What does the passage suggest about deer behavior during droughts?
(A) They remain in their original habitats.
(B) They migrate toward water sources.
(C) They form alliances with predators.
(D) They move into urban areas.

2. Which group is directly impacted by the deer migration?
(A) Marine biologists.
(B) Local farmers.
(C) Mountain climbers.
(D) Desert archaeologists.
`

const clozePerBlank = `
The annual science fair ____ (1) a highlight for students. They prepare projects that ____ (2) complex concepts in simple ways.

(1) (A) are (B) is (C) was (D) be
(2) (A) explain (B) explains (C) explaining (D) explanation
`

const bankedCloze = `
Technology has (1) transformed modern education. Students now have access to vast online resources and interactive learning (2). Virtual classrooms enable remote participation, while AI-powered tools provide (3) feedback. However, concerns about screen time and digital (4) persist among educators and parents.

(A) dramatically (B) personalized (C) platforms (D) addiction (E) gradually (F) standardized (G) textbooks (H) benefits
`

const sentenceInsertion = `
Climate change represents one of the most pressing challenges of our time. (1) Scientists worldwide have documented rising global temperatures and increasing extreme weather events. (2) Renewable energy technologies like solar and wind power offer promising solutions. (3) However, transitioning away from fossil fuels requires significant political will and economic investment.

(A) Therefore, immediate action is required to prevent catastrophic consequences.
(B) Meanwhile, many countries continue to rely heavily on coal and oil.
(C) In addition, public awareness campaigns have helped educate citizens.
(D) Nevertheless, some politicians still deny the scientific consensus.
(E) For instance, the Paris Agreement brought nations together in 2015.
`

const readingWithNumberMarkers = `
In recent years, global awareness of sustainable farming has surged. (2018) marked a turning point when multiple nations adopted soil-friendly policies.

1. What change occurred in 2018?
(A) Nations abandoned organic farming.
(B) Countries introduced soil-friendly policies.
(C) Farmers stopped crop rotation.
(D) Global food supplies decreased.

2. According to the passage, which practice supports sustainability?
(A) Increasing chemical pesticide use.
(B) Ignoring soil composition.
(C) Adopting crop rotation and water conservation.
(D) Growing only export crops.
`

function expectKind(input: string, kind: QuestionSetKind) {
  const detected = detectQuestionSetKind(input)
  expect(detected).toBe(kind)
}

describe('question-set-detector', () => {
  it('detects reading question sets with per-question ABCD blocks', () => {
    const analysis = analyseQuestionSet(readingWithQuestions)
    expect(analysis.questionKind).toBe('reading')
    expect(analysis.questionBlocks).toHaveLength(2)
    expect(analysis.questionBlocks.every((block) => block.options.length >= 4)).toBe(true)
  })

  it('detects cloze (per-blank single choice)', () => {
    const analysis = analyseQuestionSet(clozePerBlank)
    expect(analysis.questionKind).toBe('cloze')
    expect(analysis.passageBlankCount).toBeGreaterThanOrEqual(2)
    expect(
      analysis.questionBlocks.every((block) => block.options.every((opt) => opt.isShort)),
    ).toBe(true)
  })

  it('detects banked cloze with shared word bank', () => {
    expectKind(bankedCloze, 'banked_cloze')
    const analysis = analyseQuestionSet(bankedCloze)
    expect(analysis.wordBank.length).toBeGreaterThan(analysis.passageBlankCount)
  })

  it('detects sentence insertion / discourse tasks', () => {
    expectKind(sentenceInsertion, 'sentence_insertion')
    const analysis = analyseQuestionSet(sentenceInsertion)
    expect(analysis.wordBank.filter((opt) => opt.endsWithPunctuation).length).toBeGreaterThan(0)
  })

  it('prefers reading when numbered markers coexist with per-question ABCD', () => {
    const analysis = analyseQuestionSet(readingWithNumberMarkers)
    expect(analysis.questionKind).toBe('reading')
    expect(analysis.questionBlocks).toHaveLength(2)
  })
})
