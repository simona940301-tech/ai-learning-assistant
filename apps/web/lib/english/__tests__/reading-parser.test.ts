import { describe, expect, it } from 'vitest'

import { parseReading } from '../reading-parser'

const SAMPLE_READING = `[Reading Passage]
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
【正確答案：Ｄ】`

describe('reading-parser', () => {
  const parsed = parseReading(SAMPLE_READING)

  it('extracts passage paragraphs', () => {
    expect(parsed.passage.paragraphs.length).toBeGreaterThanOrEqual(4)
    expect(parsed.passage.paragraphs[0]).toMatch(/Researchers in Japan/)
  })

  it('detects multiple questions with options and answers', () => {
    expect(parsed.questions).toHaveLength(4)
    parsed.questions.forEach((question) => {
      expect(question.options).toHaveLength(4)
      expect(question.answer).toBeDefined()
      expect(question.stem.length).toBeGreaterThan(10)
    })
    expect(parsed.questions[0]?.answer).toBe('B')
    expect(parsed.questions[1]?.answer).toBe('C')
    expect(parsed.questions[2]?.answer).toBe('A')
    expect(parsed.questions[3]?.answer).toBe('D')
  })

  it('returns no warnings for well-formed multi-question input', () => {
    expect(parsed.warnings).toHaveLength(0)
  })
})
