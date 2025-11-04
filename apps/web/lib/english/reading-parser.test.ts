import { describe, it, expect } from 'vitest'
import { parseReading } from './reading-parser'

describe('Reading Parser', () => {
  describe('Case A: Fullwidth brackets + Empty prefix + Inline options', () => {
    it('should parse question with （）（1） pattern and inline options', () => {
      const input = `In 2015, President Obama of the USA signed the Every Student Succeeds Act (ESSA), replacing the
Bush-era No Child Left Behind (NCLB) that had been in effect since 2001. This new Act provides states
with more decision-making power regarding curriculum, instruction, and assessment. Below are some
big-picture ideas influencing many states as they approach the assessment task.

One important idea is flexibility. For years, states have used standardized K-12 assessments, similar
to the SAT and ACT for college application, to measure student achievement.

（ ）（1） Which of the following is the best title for this passage? （Ａ） Computers and Assessments （Ｂ） The Four Components of ESSA （Ｃ） Student-Centered Curriculum and Instruction （Ｄ） From NCLB to ESSA, with a Focus on Assessment`

      const result = parseReading(input)

      // Should detect warnings
      expect(result.warnings).toContain('Fullwidth brackets normalized')
      expect(result.warnings).toContain('Found () before (1)')
      expect(result.warnings).toContain('Options inline (A-D)')

      // Passage should not contain question or options
      expect(result.passage).not.toContain('Which of the following')
      expect(result.passage).toContain('In 2015, President Obama')
      expect(result.passage).toContain('flexibility')

      // Should have exactly 1 question
      expect(result.questions).toHaveLength(1)

      const q = result.questions[0]
      expect(q.qid).toBe('Q1')
      expect(q.stem).toContain('Which of the following is the best title')
      expect(q.stem).not.toContain('（Ａ）')
      expect(q.stem).not.toContain('(A)')

      // Should have 4 options
      expect(q.options).toHaveLength(4)
      expect(q.options[0].key).toBe('A')
      expect(q.options[0].text).toBe('Computers and Assessments')
      expect(q.options[1].key).toBe('B')
      expect(q.options[1].text).toBe('The Four Components of ESSA')
      expect(q.options[2].key).toBe('C')
      expect(q.options[2].text).toBe('Student-Centered Curriculum and Instruction')
      expect(q.options[3].key).toBe('D')
      expect(q.options[3].text).toBe('From NCLB to ESSA, with a Focus on Assessment')
    })
  })

  describe('Case B: Multiple questions with multi-line options', () => {
    it('should parse multiple questions with options on separate lines', () => {
      const input = `The passage discusses the importance of assessment in education.

Teachers use various methods to evaluate student performance.

(1) What is the main idea?
(A) Assessment is important
(B) Teachers need training
(C) Students should study more
(D) Education is changing

(2) According to the passage, what do teachers use?
(A) Computers
(B) Various methods
(C) Textbooks
(D) Tests only`

      const result = parseReading(input)

      // Should have passage and 2 questions
      expect(result.passage).toContain('importance of assessment')
      expect(result.questions).toHaveLength(2)

      // Question 1
      const q1 = result.questions[0]
      expect(q1.qid).toBe('Q1')
      expect(q1.stem).toContain('What is the main idea')
      expect(q1.options).toHaveLength(4)

      // Question 2
      const q2 = result.questions[1]
      expect(q2.qid).toBe('Q2')
      expect(q2.stem).toContain('what do teachers use')
      expect(q2.options).toHaveLength(4)
      expect(q2.options[1].text).toBe('Various methods')
    })
  })

  describe('Case C: Options without question header', () => {
    it('should detect options even without question number', () => {
      const input = `Climate change is affecting global temperatures.

Scientists are studying the effects of greenhouse gases.

Which factor contributes most to climate change?
(A) Solar radiation
(B) Greenhouse gases
(C) Ocean currents
(D) Volcanic activity`

      const result = parseReading(input)

      expect(result.warnings).toContain('Detected options but no question header')
      expect(result.passage).toContain('Climate change')
      expect(result.questions).toHaveLength(1)

      const q = result.questions[0]
      expect(q.stem).toContain('Which factor contributes')
      expect(q.options).toHaveLength(4)
    })
  })

  describe('Case D: Special whitespace characters', () => {
    it('should normalize U+00A0 and U+3000 spaces', () => {
      const input = `Passage\u00A0with\u3000special\u00A0spaces.

More\u3000text\u00A0here.

(1) Question\u00A0text?
(A)\u00A0Option\u3000A
(B) Option B
(C) Option C
(D) Option D`

      const result = parseReading(input)

      // Should normalize spaces
      expect(result.passage).not.toContain('\u00A0')
      expect(result.passage).not.toContain('\u3000')
      expect(result.passage).toContain('Passage with special spaces')

      expect(result.questions).toHaveLength(1)
      const q = result.questions[0]
      expect(q.stem).toContain('Question text')
      expect(q.options[0].text).toContain('Option A')
    })
  })

  describe('Case E: Missing options', () => {
    it('should warn when options are missing', () => {
      const input = `Sample passage about science.

(1) What is the answer?
(A) First option
(B) Second option`

      const result = parseReading(input)

      expect(result.warnings).toContain('Options missing: C, D')
      expect(result.questions[0].options).toHaveLength(2)
    })
  })

  describe('Case F: Q-style question markers', () => {
    it('should recognize Q1, Q2 style markers', () => {
      const input = `This is the passage text.

Q1. What is the first question?
(A) Option A
(B) Option B
(C) Option C
(D) Option D

Q2 What is the second question?
(A) Option A
(B) Option B
(C) Option C
(D) Option D`

      const result = parseReading(input)

      expect(result.questions).toHaveLength(2)
      expect(result.questions[0].qid).toBe('Q1')
      expect(result.questions[1].qid).toBe('Q2')
    })
  })

  describe('Case G: Real-world ESSA passage with 2 questions', () => {
    it('should correctly parse the complete ESSA passage with inline options', () => {
      const input = `In 2015, President Obama of the USA signed the Every Student Succeeds Act (ESSA), replacing the
Bush-era No Child Left Behind (NCLB) that had been in effect since 2001. This new Act provides states
with more decision-making power regarding curriculum, instruction, and assessment. Below are some
big-picture ideas influencing many states as they approach the assessment task.
One important idea is flexibility. For years, states have used standardized K-12 assessments, similar
to the SAT and ACT for college application, to measure student achievement. They are easy to use, but
they fail to give a complete picture of how a student is progressing. Thus, states are rethinking one-size-
fits-all standardized assessments and are instead considering personalized, student-centered assessments in
schools. Obviously, the task is difficult and time-consuming. Fortunately, modern technology can help
solve this dilemma. For instance, computer adaptive assessments can automatically adjust questions
based on a student's performances on the previous questions. This mechanism prevents the computer from
giving questions that are obviously too easy or too difficult for the student. It thus allows teachers to
quickly assess a student's level of understanding and provide instant feedback to help in the learning
process.
Another idea is multi-subject testing. Several states have started to incorporate subjects beyond the
traditional math and reading items in their K-12 assessments. All 50 states include tests on science at least
twice prior to senior high school, and some are now starting to include social studies, government, or
economics. Some states are also moving toward assessing multiple subjects on one test, for example,
reading and social studies.
A third idea is the emphasis on students' learning process. In pursuit of a student-centered approach,
many states are putting more emphasis on assessments throughout the learning process rather than on
traditional end-of-year summative tests. Teachers are encouraged to accumulate data at different points in
their students' learning process. These data together present a more complete picture of a student's
learning.
The last idea regards the purpose of assessment. Assessment should be used to inform both teachers'
instruction and students' learning. Teachers can modify their teaching based on students' performance on
tests; students can identify their own problems and make plans for improvement.
（ ）(１) Which of the following is the best title for this passage? (Ａ) Computers and Assessments
(Ｂ) The Four Components of ESSA (Ｃ) Student-Centered Curriculum and Instruction
(Ｄ) From NCLB to ESSA, with a Focus on Assessment
（ ）(２) What does the word "dilemma" in paragraph 2 refer to? (Ａ) The choice between SAT and
ACT. (Ｂ) The choice between NCLB and ESSA. (Ｃ) Whether or not to use student-centered assessment.`

      const result = parseReading(input)

      // Should have correct warnings
      expect(result.warnings).toContain('Fullwidth brackets normalized')
      expect(result.warnings).toContain('Found () before (1)')
      // Note: Options might not be inline due to line wrapping in the input

      // Passage should be complete and not include questions
      expect(result.passage).toContain('In 2015, President Obama')
      expect(result.passage).toContain('make plans for improvement')
      expect(result.passage).not.toContain('Which of the following')
      expect(result.passage).not.toContain('What does the word')

      // Should have 2 questions
      expect(result.questions).toHaveLength(2)

      // Question 1
      const q1 = result.questions[0]
      expect(q1.qid).toBe('Q1')
      expect(q1.stem).toContain('Which of the following is the best title')
      expect(q1.stem).not.toContain('(Ａ)')
      expect(q1.options).toHaveLength(4)
      expect(q1.options[0].text).toBe('Computers and Assessments')
      expect(q1.options[3].text).toBe('From NCLB to ESSA, with a Focus on Assessment')

      // Question 2
      const q2 = result.questions[1]
      expect(q2.qid).toBe('Q2')
      expect(q2.stem).toContain('What does the word "dilemma"')
      expect(q2.stem).toContain('paragraph 2')
      expect(q2.options).toHaveLength(3) // Only 3 options provided
    })
  })

  describe('Case H: Inline numbered questions', () => {
    it('should split inline numbered questions correctly', () => {
      const input = `In 2015, President Obama of the USA signed the Every Student Succeeds Act (ESSA), replacing the
Bush-era No Child Left Behind (NCLB) that had been in effect since 2001. This new Act provides states
with more decision-making power regarding curriculum, instruction, and assessment.

（ ）（1） Which of the following is the best title for this passage? （Ａ） Computers and Assessments （Ｂ） The Four Components of ESSA （Ｃ） Student-Centered Curriculum and Instruction （Ｄ） From NCLB to ESSA, with a Focus on Assessment （ ）（2） What does the word "dilemma" in paragraph 2 refer to? （Ａ） The choice between SAT and ACT. （Ｂ） The choice between NCLB and ESSA. （Ｃ） Whether or not to use student-centered assessment. （Ｄ） Whether or not to replace computer-based assessment.`

      const result = parseReading(input)

      // Should detect both questions
      expect(result.questions.length).toBeGreaterThanOrEqual(2)

      // Question 1
      const q1 = result.questions[0]
      expect(q1.stem).toContain('Which of the following')
      expect(q1.stem).not.toContain('（Ａ）')
      expect(q1.options).toHaveLength(4)

      // Question 2
      const q2 = result.questions[1]
      expect(q2.stem).toContain('What does the word')
      expect(q2.stem).not.toContain('（Ａ）')
      expect(q2.options).toHaveLength(4)
    })
  })

  describe('Edge cases', () => {
    it('should handle empty input', () => {
      const result = parseReading('')
      expect(result.warnings).toContain('Empty input')
      expect(result.passage).toBe('')
      expect(result.questions).toHaveLength(0)
    })

    it('should handle passage-only input', () => {
      const input = 'This is just a passage with no questions.'
      const result = parseReading(input)
      expect(result.warnings).toContain('No question markers detected')
      expect(result.passage).toBe(input)
      expect(result.questions).toHaveLength(0)
    })

    it('should handle questions with no options', () => {
      const input = `Passage text here.

(1) This is a question with no options?`

      const result = parseReading(input)
      expect(result.questions).toHaveLength(1)
      expect(result.questions[0].options).toHaveLength(0)
      expect(result.warnings).toContain('Question Q1 missing options')
    })
  })
})
