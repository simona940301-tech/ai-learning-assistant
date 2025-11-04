import { describe, expect, it } from 'vitest'

import type { ExplainCard } from '../../contracts/explain'
import { presentExplainCard, type ReadingVM } from '../explain-presenter'

const SAMPLE_CARD: ExplainCard = {
  id: 'sample-reading',
  question: `[Reading Passage]
Researchers in Japan have installed on a train a speaker that barks like a dog and snorts like a deer in order to prevent collisions with animals on the tracks.
The country has been troubled by a problem with trains colliding with deer on its railways. According to Japan’s transport ministry, there were 613 cases of train services suspended or delayed for at least 30 minutes resulting from collisions with deer and other wild animals in 2016-17.
Deer are attracted to railway lines because of a need for iron in their diets. They lick the rails to pick up iron filings caused by the action of wheels against tracks. This dietary need has led to a constant battle to keep the deer separate from the unforgiving nature of tons of onrushing rolling stock. In the past, flashing red lights and even lion faces have been unsuccessfully trialed in an attempt to keep deer off the tracks.
This new device has been invented by a team at the country’s Railway Technical Research Institute (RTRI). RTRI officials explain that deer have a habit of repeatedly snorting short, shrill sounds to alert other deer when they perceive danger. The barking of the hound, which drives deer to panic, strengthens the effect of the warning noise, according to the RTRI. When the deer hear a combination of a 3-second-long recording of a deer’s snort and 20 seconds of a barking dog, they panic and flee rapidly.
RTRI researchers say late-night tests, at times when deer are most frequently seen by railway tracks, have resulted in a 45 percent reduction of deer sighting. Future plans include static barking sites where deer are commonly seen, but “the noises will not be blared in areas where people live beside the tracks.”

（ ）(１) Why are deer attracted to train tracks?
(Ａ) They mate at night near railways.
(Ｂ) They need nutrition from train tracks.
(Ｃ) They like to snort at the passing train.
(Ｄ) They sharpen their horns rubbing against the rails.
【正確答案：Ｂ】

（ ）(２) What device has NOT been used to solve the railway problem in Japan?
(Ａ) Flashing lights.
(Ｂ) Barking speakers.
(Ｃ) Noisy train tracks.
(Ｄ) Lion face paintings.
【正確答案：Ｃ】

（ ）(３) Which of the following is true about the deer issue discussed in the passage?
(Ａ) RTRI’s new invention prompts deer to run away.
(Ｂ) People living near the tracks complain about deer snorts.
(Ｃ) 45 percent of train delays in Japan was caused by deer collision.
(Ｄ) A combination of sound and visual devices attracts more deer to the tracks.
【正確答案：Ａ】

（ ）(４) What does the author mean by “the unforgiving nature of tons of onrushing rolling stock” in the third paragraph?
(Ａ) The heavy weight of iron materials.
(Ｂ) The cruelty of a barking hound.
(Ｃ) The battle between deer and other animals.
(Ｄ) The danger of a fast-moving train.
【正確答案：Ｄ】`,
  kind: 'E4',
  translation: undefined,
  cues: [],
  options: [],
  steps: [],
  vocab: [
    { term: 'train' },
    { term: 'researchers' },
  ],
  nextActions: [],
}

describe('presentExplainCard - reading', () => {
  const presented = presentExplainCard(SAMPLE_CARD) as ReadingVM | null

  it('returns a ReadingVM with passage and multiple questions', () => {
    expect(presented?.kind).toBe('E4')
    if (!presented || presented.kind !== 'E4') return
    expect(presented.passage.paragraphs.length).toBeGreaterThanOrEqual(4)
    expect(presented.questions).toHaveLength(4)
  })

  it('normalizes answer indices and letters', () => {
    if (!presented || presented.kind !== 'E4') throw new Error('Expected ReadingVM')
    const letters = presented.questions.map((question) => question.answerLetter)
    expect(letters).toContain('B')
    expect(letters).toContain('D')
    presented.questions.forEach((question) => {
      if (question.answerIndex != null) {
        expect(question.answerIndex).toBeGreaterThanOrEqual(0)
      }
    })
  })

  it('provides metadata for highlighting evidence', () => {
    if (!presented || presented.kind !== 'E4') throw new Error('Expected ReadingVM')
    presented.questions.forEach((question) => {
      expect(question.meta.paragraphIndex).toBeGreaterThanOrEqual(0)
      expect(['細節', '推論', '主旨', '詞義']).toContain(question.meta.errorTypeTag)
      expect(question.evidence.length).toBeGreaterThan(0)
      question.evidence.forEach((entry) => {
        expect(entry.paragraphIndex).toBeGreaterThanOrEqual(0)
      })
    })
  })

  it('enriches vocab with fallback data', () => {
    if (!presented || presented.kind !== 'E4') throw new Error('Expected ReadingVM')
    const fallback = presented.vocab?.find((item) => item.word?.toLowerCase() === 'train')
    expect(fallback?.pos).toBeDefined()
    expect(fallback?.zh).toBeDefined()
    expect(fallback?.zh).not.toBe('-')
  })
})
