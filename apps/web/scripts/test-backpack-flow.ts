const BASE_URL = process.env.NEXT_TEST_BASE_URL || 'http://127.0.0.1:3000'
const MOCK_USER_ID = process.env.MOCK_USER_ID || 'e770f9cd-52a7-43de-b983-70f6f78d2f53'

async function main() {
  console.log(`Running backpack smoke test against ${BASE_URL}`)

  await ensureServerIsReachable()
  await saveMockNote()
  await verifyBackpackItems()
  await verifyPlayStatus()

  console.log('Backpack smoke test finished.')
}

async function ensureServerIsReachable() {
  try {
    const res = await fetch(`${BASE_URL}/api/health`)
    if (!res.ok) {
      const body = await res.text()
      throw new Error(`Health check failed (${res.status}): ${body}`)
    }
    console.log('Next.js server reachable')
  } catch (error) {
    console.error('Unable to reach Next.js dev server. Is `pnpm --filter web dev` running?')
    throw error
  }
}

async function saveMockNote() {
  const payload = {
    user_id: MOCK_USER_ID,
    question: 'Backpack test question',
    canonical_skill: 'math_mock',
    note_md: '# Mock note\n\nThis was created by scripts/test-backpack-flow.ts',
  }

  const data = await callApi('/api/backpack/save', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })

  if (!data?.saved) {
    throw new Error('Expected /api/backpack/save to return { saved: true }')
  }

  console.log('/api/backpack/save responded with saved=true')
}

async function verifyBackpackItems() {
  const data = await callApi('/api/backpack')
  const count = Array.isArray(data.items) ? data.items.length : 0

  console.log(`/api/backpack returned ${count} item(s)`)
  if (typeof data.mockHint === 'string' && data.mockHint.length > 0) {
    console.log(`  -> Mock hint: ${data.mockHint}`)
  }
}

async function verifyPlayStatus() {
  const data = await callApi('/api/play/user/status')
  if (!data?.success) {
    throw new Error('Expected /api/play/user/status to return success=true')
  }
  console.log(
    `/api/play/user/status -> energy=${data.dailyEnergyCount}, wallet=${data.walletBalance}, elo=${data.eloRank}`
  )
}

async function callApi(path: string, init?: RequestInit) {
  const target = `${BASE_URL}${path}`
  try {
    const response = await fetch(target, init)
    const text = await response.text()
    let payload: any = {}
    try {
      payload = text ? JSON.parse(text) : {}
    } catch {
      // Ignore invalid JSON, we'll include snippet in error message
    }

    if (!response.ok) {
      const snippet = text.slice(0, 120)
      throw new Error(
        `Request to ${path} failed (${response.status}): ${payload?.message || snippet || response.statusText}`
      )
    }

    return payload
  } catch (error) {
    console.error(`Failed to call ${path}`)
    throw error
  }
}

main().catch(error => {
  console.error('Backpack smoke test failed:', error)
  process.exit(1)
})
