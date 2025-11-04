/**
 * Goldset v2 Validation
 * Tests the router against the authoritative goldset to verify detection accuracy
 */

const goldsetV2 = [
  {
    id: 'E1-001',
    expected: 'E1',
    input: {
      stem: 'He raised an ( ) ; however, he failed to provide any evidence that it is practical.',
      options: [
        { key: 'A', text: 'notion' },
        { key: 'B', text: 'candidate' },
        { key: 'C', text: 'reaction' },
        { key: 'D', text: 'stimulation' },
      ],
    },
    expectedSignals: {
      singleBlankParens: true,
      fourChoicesABCD: true,
      choicesShape: 'words',
      hasNumberedBlanks: false,
    },
  },
  {
    id: 'E1-002',
    expected: 'E1',
    input: {
      stem: 'We have been encouraged to believe we can handle all the challenges whenever we are faced with ( ). However, some efforts will remain unfruitful and we\'d better accept our own limits.',
      options: [
        { key: 'A', text: 'resilience' },
        { key: 'B', text: 'adversity' },
        { key: 'C', text: 'stride' },
        { key: 'D', text: 'empathy' },
      ],
    },
    expectedSignals: {
      singleBlankParens: true,
      fourChoicesABCD: true,
      choicesShape: 'words',
      hasNumberedBlanks: false,
    },
  },
  {
    id: 'E1-003',
    expected: 'E1',
    input: {
      stem: 'If you put a ( ) 24 hours.',
      options: [
        { key: 'A', text: 'border' },
        { key: 'B', text: 'timer' },
        { key: 'C', text: 'container' },
        { key: 'D', text: 'marker' },
      ],
    },
    expectedSignals: {
      singleBlankParens: true,
      fourChoicesABCD: true,
      choicesShape: 'words',
      hasNumberedBlanks: false,
    },
  },
  {
    id: 'E1-004',
    expected: 'E1',
    input: {
      stem: 'The local farmers\' market is popular as it offers a variety of fresh ( ) for the community.',
      options: [
        { key: 'A', text: 'produce' },
        { key: 'B', text: 'fashion' },
        { key: 'C', text: 'brand' },
        { key: 'D', text: 'trend' },
      ],
    },
    expectedSignals: {
      singleBlankParens: true,
      fourChoicesABCD: true,
      choicesShape: 'words',
      hasNumberedBlanks: false,
    },
  },
  {
    id: 'E7-001',
    expected: 'E7',
    input: {
      stem: `The Notre-Dame de Paris is one of the most famous cathedrals in Europe. Located at the heart of Paris, (1) for its intricate architecture, stunning stained glass windows, and, above all, its bells. Mounted in the two tall towers of the cathedral, Notre-Dame's bells have been ringing for over 800 years. In fact, there is documented (2) to the ringing of bells even before the cathedral's construction was completed, dating as far back as the 12th century. The 10 bells vary in size, each (3) a name. The largest one, named "Emmanuel," weighs over 13 tons. It is the only one of the whole group that (4) the French Revolution, while the rest were melted down for weapons.`,
      options: [
        { key: 'A', text: 'reference' },
        { key: 'B', text: 'bearing' },
        { key: 'C', text: 'familiar' },
        { key: 'D', text: 'retained' },
        { key: 'E', text: 'faithful' },
        { key: 'F', text: 'survived' },
        { key: 'G', text: 'celebration' },
        { key: 'H', text: 'restoration' },
        { key: 'I', text: 'noted' },
        { key: 'J', text: 'silent' },
      ],
    },
    expectedSignals: {
      hasNumberedBlanks: true,
      choicesShape: 'words',
      passageChars: 700,
    },
  },
  {
    id: 'E7-002',
    expected: 'E7',
    input: {
      stem: `Cyber bullying is a serious problem. It can have an impact on people of any age, children, teens and adults (1). Someone who is bullied online tends to feel alone when he or she keeps reading (2) words about themselves. If you are worried that a loved one might be suffering from harassment by strangers online, the following signs can be helpful. First, a victim of cyberbullying may be (3) a lot of time alone. Second, he or she may (4) to stay away from school or work.`,
      options: [
        { key: 'A', text: 'spending' },
        { key: 'B', text: 'so that' },
        { key: 'C', text: 'harm' },
        { key: 'D', text: 'included' },
        { key: 'E', text: 'try hard' },
        { key: 'F', text: 'horrible' },
      ],
    },
    expectedSignals: {
      hasNumberedBlanks: true,
      choicesShape: 'phrases',
      passageChars: 500,
    },
  },
  {
    id: 'E6-001',
    expected: 'E6',
    input: {
      stem: `A capsule hotel, also known as a pod hotel, is a unique type of basic, affordable accommodation. Originated in Japan, these hotels were initially meant for business professionals to stay close to populated business districts without spending a lot. (1) A typical room of a capsule hotel is roughly the length and width of a single bed, with sufficient height for a guest to crawl in and sit up on the bed. The walls of each capsule may be made of wood, metal or any rigid material, but are often fiberglass or plastic. (2) Each capsule is equipped with a comfortable mattress, a small light, and sometimes a television or other entertainment options.`,
      options: [
        { key: 'A', text: 'In response to rising demands, these hotels are embracing a wave of innovation.' },
        { key: 'B', text: 'The room\'s thin plastic walls easily transmit the sound of snoring made by neighboring guests.' },
        { key: 'C', text: 'The chambers are stacked side-by-side, two units high, with the upper rooms reached by a ladder.' },
        { key: 'D', text: 'Today, they provide low-budget, overnight lodging in commerce centers in large cities worldwide.' },
      ],
    },
    expectedSignals: {
      hasNumberedBlanks: true,
      choicesShape: 'sentences',
      passageChars: 800,
    },
  },
  {
    id: 'E6-002',
    expected: 'E6',
    input: {
      stem: `In 2018, Oprah Winfrey interviewed former First Lady Michelle Obama. In 2021, she had an explosive interview with Prince Harry and Meghan Markle. (1) When the public thinks of her, she seems to be the symbol of a black woman on whom good luck or blessing has been bestowed. The truth, however, is exactly the opposite. As is true of many great people growing up in adversity, Oprah was born of a poverty-stricken family. (2) Shunted between her grandmother's, mother's and father's homes, she felt isolated.`,
      options: [
        { key: 'A', text: 'Because of these two events, Oprah has become even more dazzling.' },
        { key: 'B', text: 'This was really the turning point in Oprah\'s life.' },
        { key: 'C', text: 'However, living with her mother from the age of six was the beginning of greater distress.' },
        { key: 'D', text: 'Up until now, she has remained at the summit of her profession.' },
      ],
    },
    expectedSignals: {
      hasNumberedBlanks: true,
      choicesShape: 'sentences',
      passageChars: 600,
    },
  },
  {
    id: 'E2-001',
    expected: 'E2',
    input: {
      stem: 'You can see my answer, ( ) in the box, to this question.',
      options: [
        { key: 'A', text: 'as to check' },
        { key: 'B', text: 'as checked' },
        { key: 'C', text: 'as checking' },
        { key: 'D', text: 'while checked' },
      ],
    },
    expectedSignals: {
      singleBlankParens: true,
      fourChoicesABCD: true,
      choicesShape: 'phrases',
      hasNumberedBlanks: false,
      grammarCue: true,
    },
  },
  {
    id: 'E2-002',
    expected: 'E2',
    input: {
      stem: '( ) is true of many boys of his age, Brian is really into online games.',
      options: [
        { key: 'A', text: 'It' },
        { key: 'B', text: 'What' },
        { key: 'C', text: 'As' },
        { key: 'D', text: 'Though' },
      ],
    },
    expectedSignals: {
      singleBlankParens: true,
      fourChoicesABCD: true,
      choicesShape: 'words',
      hasNumberedBlanks: false,
      grammarCue: true,
    },
  },
]

async function validateGoldset() {
  const { classifyEnglishType } = await import('../apps/web/lib/english/router')

  console.log('='.repeat(80))
  console.log('Goldset v2 Validation - Testing Router Against Authoritative Dataset')
  console.log('='.repeat(80))

  let passed = 0
  let failed = 0
  const failures: Array<{ id: string; expected: string; actual: string; reason: string }> = []

  for (const testCase of goldsetV2) {
    const result = await classifyEnglishType(testCase.input)
    const success = result.type === testCase.expected

    if (success) {
      console.log(`\n✅ ${testCase.id}: ${result.type} (confidence: ${result.confidence})`)
      passed++
    } else {
      console.log(`\n❌ ${testCase.id}: Expected ${testCase.expected}, got ${result.type}`)
      console.log(`   Reason: ${result.reason}`)
      console.log(`   Confidence: ${result.confidence}`)
      failed++
      failures.push({
        id: testCase.id,
        expected: testCase.expected,
        actual: result.type,
        reason: result.reason,
      })
    }
  }

  console.log('\n' + '='.repeat(80))
  console.log(`Goldset v2 Validation Results: ${passed}/${goldsetV2.length} passed`)
  console.log('='.repeat(80))

  if (failures.length > 0) {
    console.log('\n❌ Failures Summary:')
    failures.forEach((f) => {
      console.log(`  ${f.id}: Expected ${f.expected} → Got ${f.actual}`)
      console.log(`    Reason: ${f.reason}`)
    })
    console.log('\n⚠️  Router needs calibration for these edge cases')
    process.exit(1)
  } else {
    console.log('\n✅ All goldset v2 tests passed! Router is correctly calibrated.')
  }
}

validateGoldset().catch(console.error)
