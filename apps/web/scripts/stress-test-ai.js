#!/usr/bin/env node
/**
 * Performance Stress Testing Script
 * 
 * Tests AI endpoints under load to ensure TTFT < 500ms
 * and measure performance degradation with concurrency.
 */

const ENDPOINT_URL = process.env.API_URL || 'http://localhost:3000'
const AUTH_TOKEN = process.env.AUTH_TOKEN || ''

// Test configuration
const TESTS = [
    {
        name: 'Backpack Ask (Edge Runtime)',
        endpoint: '/api/backpack/ask',
        method: 'POST',
        body: {
            file_id: 'test-file-id',
            prompt: '這是什麼?',
            scope: 'document',
            top_k: 6,
        },
        concurrency: [1, 5, 10, 20],
        iterations: 10,
    },
    {
        name: 'Expert Q&A (Edge Runtime)',
        endpoint: '/api/ai/expert-qa',
        method: 'POST',
        body: {
            analysisId: 'test-analysis-id',
            question: '這份文件的核心概念是什麼?',
        },
        concurrency: [1, 5, 10],
        iterations: 10,
    },
]

/**
 * Measure TTFT for a single request
 */
async function measureTTFT(endpoint, method, body, token) {
    const startTime = Date.now()
    let ttft = null
    let totalTime = null
    let error = null

    try {
        const response = await fetch(`${ENDPOINT_URL}${endpoint}`, {
            method,
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`,
            },
            body: JSON.stringify(body),
        })

        if (!response.ok) {
            throw new Error(`HTTP ${response.status}`)
        }

        if (!response.body) {
            throw new Error('No response body')
        }

        const reader = response.body.getReader()
        const decoder = new TextDecoder()
        let firstChunk = true

        while (true) {
            const { done, value } = await reader.read()
            if (done) break

            if (firstChunk) {
                ttft = Date.now() - startTime
                firstChunk = false
            }
        }

        totalTime = Date.now() - startTime
    } catch (err) {
        error = err.message
    }

    return { ttft, totalTime, error }
}

/**
 * Run concurrent requests
 */
async function runConcurrentTest(test, concurrency) {
    console.log(`\n  Testing with ${concurrency} concurrent requests...`)

    const promises = []
    for (let i = 0; i < concurrency; i++) {
        promises.push(measureTTFT(test.endpoint, test.method, test.body, AUTH_TOKEN))
    }

    const results = await Promise.all(promises)

    // Calculate statistics
    const ttfts = results.filter(r => r.ttft !== null).map(r => r.ttft)
    const totalTimes = results.filter(r => r.totalTime !== null).map(r => r.totalTime)
    const errors = results.filter(r => r.error !== null)

    if (ttfts.length === 0) {
        console.log(`  ❌ All requests failed`)
        errors.forEach(e => console.log(`     Error: ${e.error}`))
        return null
    }

    const avgTTFT = ttfts.reduce((a, b) => a + b, 0) / ttfts.length
    const maxTTFT = Math.max(...ttfts)
    const minTTFT = Math.min(...ttfts)
    const p95TTFT = ttfts.sort((a, b) => a - b)[Math.floor(ttfts.length * 0.95)]

    const avgTotal = totalTimes.reduce((a, b) => a + b, 0) / totalTimes.length

    const emoji = avgTTFT < 500 ? '✅' : avgTTFT < 1000 ? '⚠️' : '❌'
    console.log(`  ${emoji} Concurrency: ${concurrency}`)
    console.log(`     TTFT: avg=${avgTTFT.toFixed(0)}ms, min=${minTTFT.toFixed(0)}ms, max=${maxTTFT.toFixed(0)}ms, p95=${p95TTFT.toFixed(0)}ms`)
    console.log(`     Total: avg=${avgTotal.toFixed(0)}ms`)
    console.log(`     Success rate: ${((ttfts.length / concurrency) * 100).toFixed(1)}%`)

    return {
        concurrency,
        avgTTFT,
        maxTTFT,
        minTTFT,
        p95TTFT,
        avgTotal,
        successRate: (ttfts.length / concurrency) * 100,
    }
}

/**
 * Run all tests
 */
async function runAllTests() {
    console.log('\n🚀 Performance Stress Testing')
    console.log('='.repeat(60))
    console.log(`Endpoint: ${ENDPOINT_URL}`)
    console.log(`Auth: ${AUTH_TOKEN ? 'Provided' : 'Missing (tests may fail)'}`)
    console.log('='.repeat(60))

    const results = []

    for (const test of TESTS) {
        console.log(`\n📊 ${test.name}`)
        console.log('-'.repeat(60))

        const testResults = []

        for (const concurrency of test.concurrency) {
            const result = await runConcurrentTest(test, concurrency)
            if (result) {
                testResults.push(result)
            }

            // Wait between tests to avoid rate limiting
            await new Promise(resolve => setTimeout(resolve, 1000))
        }

        results.push({
            name: test.name,
            endpoint: test.endpoint,
            results: testResults,
        })
    }

    // Print summary
    console.log('\n' + '='.repeat(60))
    console.log('📋 Summary')
    console.log('='.repeat(60))

    for (const test of results) {
        console.log(`\n${test.name} (${test.endpoint})`)

        if (test.results.length === 0) {
            console.log('  ❌ All tests failed')
            continue
        }

        const baseline = test.results[0]
        const highest = test.results[test.results.length - 1]

        console.log(`  Baseline (1 req): ${baseline.avgTTFT.toFixed(0)}ms TTFT`)
        console.log(`  Highest load (${highest.concurrency} req): ${highest.avgTTFT.toFixed(0)}ms TTFT`)

        const degradation = ((highest.avgTTFT - baseline.avgTTFT) / baseline.avgTTFT) * 100
        const degradationEmoji = degradation < 20 ? '✅' : degradation < 50 ? '⚠️' : '❌'
        console.log(`  ${degradationEmoji} Performance degradation: ${degradation.toFixed(1)}%`)

        const p95Pass = highest.p95TTFT < 500
        console.log(`  ${p95Pass ? '✅' : '❌'} P95 TTFT under load: ${highest.p95TTFT.toFixed(0)}ms (target: < 500ms)`)
    }

    console.log('\n' + '='.repeat(60))
    console.log('✅ Stress testing complete!')
    console.log('='.repeat(60))
}

// Run tests
if (!AUTH_TOKEN) {
    console.warn('\n⚠️  Warning: AUTH_TOKEN not provided. Tests may fail.')
    console.warn('   Set AUTH_TOKEN environment variable with a valid JWT token.\n')
}

runAllTests().catch(error => {
    console.error('\n❌ Test suite failed:', error)
    process.exit(1)
})
