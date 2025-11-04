import { runHardGuard } from '../lib/ai/hard-guard'
import { probeExperts } from '../lib/ai/experts'

const englishQuestion = `There are reports coming in that a number of people have been injured in a terrorist ___ . (A) access (B) supply (C) attack (D) burden`

const mathQuestion = `三角形 ABC，已知 a=5, b=7, C=60°，求 c=?`

const chineseQuestion = `下列何者為文意選填之常見誤解？請選出最合適的選項。`

function testQuestion(label: string, text: string) {
  console.log(`\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`)
  console.log(`📋 Testing: ${label}`)
  console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`)
  console.log(`Question: ${text.substring(0, 60)}...`)
  console.log()

  // Hard Guard
  const guard = runHardGuard(text)
  console.log(`🛡️  Hard Guard:`)
  console.log(`   Subject: ${guard.subject}`)
  console.log(`   Reason: ${guard.reason}`)
  if (guard.matchedTokens.length > 0) {
    console.log(`   Matched: [${guard.matchedTokens.join(', ')}]`)
  }
  console.log()

  // Experts
  const experts = probeExperts(text)
  console.log(`👨‍🏫 Expert Probes (sorted by confidence):`)
  experts.forEach((expert, index) => {
    if (expert.confidence > 0) {
      console.log(`   ${index + 1}. ${expert.subject.padEnd(10)} - ${(expert.confidence * 100).toFixed(1)}% - tags: [${expert.tags.join(', ')}]`)
    }
  })
  console.log()

  // Final decision
  const threshold = 0.55
  const chosen = experts.filter(e => e.confidence >= threshold).slice(0, 1)
  
  let finalSubject = 'unknown'
  if (guard.subject === 'math') {
    finalSubject = 'math'
  } else if (chosen.length > 0) {
    finalSubject = chosen[0].subject
  }

  console.log(`✅ Final Decision:`)
  console.log(`   Subject: ${finalSubject}`)
  console.log(`   Threshold: ${threshold}`)
  if (chosen.length > 0) {
    console.log(`   Chosen: ${chosen[0].subject} (${(chosen[0].confidence * 100).toFixed(1)}%)`)
  } else {
    console.log(`   Chosen: none (all below threshold)`)
  }
}

// Run tests
console.log('\n╔═══════════════════════════════════════════════════════╗')
console.log('║  Subject Detection Diagnostic Test                   ║')
console.log('╚═══════════════════════════════════════════════════════╝')

testQuestion('English MCQ', englishQuestion)
testQuestion('Math (Triangle)', mathQuestion)
testQuestion('Chinese Reading', chineseQuestion)

console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
console.log('✅ Test Complete')
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n')

