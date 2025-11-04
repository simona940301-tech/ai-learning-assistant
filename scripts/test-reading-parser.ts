import { parseReading } from '../apps/web/lib/english/reading-parser'

const sampleText = `In 2015, President Obama of the USA signed the Every Student Succeeds Act (ESSA), replacing the
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
6reading and social studies.
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
ACT. (Ｂ) The choice between NCLB and ESSA. (Ｃ) Whether or not to use student-`

console.log('='.repeat(80))
console.log('Testing Reading Parser with Sample Text')
console.log('='.repeat(80))

const result = parseReading(sampleText)

console.log('\n📋 PARSING RESULTS\n')
console.log(`Group ID: ${result.groupId}`)
console.log(`Warnings: ${result.warnings.join(', ')}`)
console.log(`\nPassage length: ${result.passage.length} characters`)
console.log(`Number of questions: ${result.questions.length}`)

console.log('\n📰 PASSAGE (first 200 chars):\n')
console.log(result.passage.slice(0, 200) + '...')

console.log('\n\n❓ QUESTIONS:\n')
result.questions.forEach((q, idx) => {
  console.log(`\n${'-'.repeat(80)}`)
  console.log(`Question ${idx + 1} (${q.qid})`)
  console.log(`${'-'.repeat(80)}`)
  console.log(`Stem: ${q.stem}`)
  console.log(`\nOptions (${q.options.length}):`)
  q.options.forEach(opt => {
    console.log(`  ${opt.key}. ${opt.text}`)
  })
  if (q.answer) {
    console.log(`\nAnswer: ${q.answer}`)
  }
})

console.log('\n' + '='.repeat(80))
console.log('✅ VALIDATION CHECKS')
console.log('='.repeat(80))

const checks = [
  {
    name: 'Passage does not contain question stems',
    pass: !result.passage.includes('Which of the following') && !result.passage.includes('What does the word')
  },
  {
    name: 'Passage contains expected content',
    pass: result.passage.includes('In 2015, President Obama') && result.passage.includes('make plans for improvement')
  },
  {
    name: 'Found 2 questions',
    pass: result.questions.length === 2
  },
  {
    name: 'Question 1 has correct stem',
    pass: result.questions[0]?.stem.includes('Which of the following is the best title')
  },
  {
    name: 'Question 1 stem does not contain options',
    pass: !result.questions[0]?.stem.includes('(Ａ)') && !result.questions[0]?.stem.includes('(A)')
  },
  {
    name: 'Question 1 has 4 options',
    pass: result.questions[0]?.options.length === 4
  },
  {
    name: 'Question 2 has correct stem',
    pass: result.questions[1]?.stem.includes('What does the word "dilemma"')
  },
  {
    name: 'Fullwidth brackets were normalized',
    pass: result.warnings.includes('Fullwidth brackets normalized')
  },
  {
    name: 'Empty prefix detected',
    pass: result.warnings.includes('Found () before (1)')
  }
]

checks.forEach(check => {
  const status = check.pass ? '✅' : '❌'
  console.log(`${status} ${check.name}`)
})

const allPassed = checks.every(c => c.pass)
console.log('\n' + '='.repeat(80))
console.log(allPassed ? '🎉 ALL CHECKS PASSED!' : '⚠️  SOME CHECKS FAILED')
console.log('='.repeat(80))

process.exit(allPassed ? 0 : 1)
