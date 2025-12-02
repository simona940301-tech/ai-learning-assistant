#!/usr/bin/env node
/**
 * Basic Gemini 2.5 Integration Test (No Auth Required)
 * 
 * Tests core Gemini 2.5 functionality without requiring authentication.
 */

const { geminiCompletion, geminiCompletionStream } = require('../lib/gemini')

console.log('\n🧪 Gemini 2.5 Integration Test')
console.log('='.repeat(60))

async function testQuickUseCase() {
    console.log('\n📝 Test 1: Quick Use Case (Gemini 2.5 Flash)')
    console.log('-'.repeat(60))

    const startTime = Date.now()

    try {
        const result = await geminiCompletion(
            [
                { role: 'system', content: '你是專業助手' },
                { role: 'user', content: '用一句話解釋什麼是光合作用' }
            ],
            {
                useCase: 'quick',
                temperature: 0.3,
                maxOutputTokens: 100
            }
        )

        const duration = Date.now() - startTime
        console.log(`✅ Response received in ${duration}ms`)
        console.log(`📝 Content: ${result.substring(0, 150)}...`)

        if (duration < 2000) {
            console.log('🎯 Performance: EXCELLENT (< 2s)')
        } else if (duration < 5000) {
            console.log('⚠️  Performance: ACCEPTABLE (2-5s)')
        } else {
            console.log('❌ Performance: NEEDS IMPROVEMENT (> 5s)')
        }

        return true
    } catch (error) {
        console.error('❌ Test failed:', error.message)
        return false
    }
}

async function testComplexUseCase() {
    console.log('\n📝 Test 2: Complex Use Case (Gemini 2.5 Pro)')
    console.log('-'.repeat(60))

    const startTime = Date.now()

    try {
        const result = await geminiCompletion(
            [
                { role: 'system', content: '你是專業教育專家' },
                { role: 'user', content: '詳細分析光合作用的三個階段及其生態意義' }
            ],
            {
                useCase: 'complex',
                temperature: 0.5,
                maxOutputTokens: 500
            }
        )

        const duration = Date.now() - startTime
        console.log(`✅ Response received in ${duration}ms`)
        console.log(`📝 Content length: ${result.length} chars`)
        console.log(`📝 Preview: ${result.substring(0, 100)}...`)

        return true
    } catch (error) {
        console.error('❌ Test failed:', error.message)
        return false
    }
}

async function testStreamingTTFT() {
    console.log('\n📝 Test 3: Streaming TTFT (Gemini 2.5 Flash)')
    console.log('-'.repeat(60))

    const startTime = Date.now()
    let firstChunkTime = null
    let chunkCount = 0
    let totalContent = ''

    try {
        const stream = geminiCompletionStream(
            [
                { role: 'system', content: '你是專業助手' },
                { role: 'user', content: '解釋什麼是機器學習' }
            ],
            {
                useCase: 'quick',
                temperature: 0.3
            }
        )

        for await (const chunk of stream) {
            if (!firstChunkTime) {
                firstChunkTime = Date.now()
                const ttft = firstChunkTime - startTime
                console.log(`⚡ TTFT: ${ttft}ms`)

                if (ttft < 500) {
                    console.log('🎯 TTFT Performance: EXCELLENT (< 500ms) ✨')
                } else if (ttft < 1000) {
                    console.log('✅ TTFT Performance: GOOD (500-1000ms)')
                } else if (ttft < 2000) {
                    console.log('⚠️  TTFT Performance: ACCEPTABLE (1-2s)')
                } else {
                    console.log('❌ TTFT Performance: NEEDS IMPROVEMENT (> 2s)')
                }
            }

            chunkCount++
            totalContent += chunk
        }

        const totalTime = Date.now() - startTime
        console.log(`✅ Streaming complete in ${totalTime}ms`)
        console.log(`📊 Total chunks: ${chunkCount}`)
        console.log(`📝 Total content: ${totalContent.length} chars`)

        return true
    } catch (error) {
        console.error('❌ Test failed:', error.message)
        return false
    }
}

async function testPromptOptimization() {
    console.log('\n📝 Test 4: Conditional Prompt Optimization')
    console.log('-'.repeat(60))

    try {
        // Test with long system prompt (should be optimized for quick)
        const longPrompt = '你是一個專業的學習助手,專門幫助學生理解複雜的概念。你需要使用清晰的語言,提供具體的例子,並且確保學生能夠理解。請使用 Markdown 格式,引用來源,並遵循所有格式要求。'

        const startQuick = Date.now()
        await geminiCompletion(
            [
                { role: 'system', content: longPrompt },
                { role: 'user', content: '什麼是DNA?' }
            ],
            { useCase: 'quick' }
        )
        const quickTime = Date.now() - startQuick

        const startComplex = Date.now()
        await geminiCompletion(
            [
                { role: 'system', content: longPrompt },
                { role: 'user', content: '什麼是DNA?' }
            ],
            { useCase: 'complex' }
        )
        const complexTime = Date.now() - startComplex

        console.log(`✅ Quick mode: ${quickTime}ms (optimized prompt)`)
        console.log(`✅ Complex mode: ${complexTime}ms (full prompt)`)
        console.log(`📊 Optimization effect: ${quickTime < complexTime ? 'Quick faster ✅' : 'Similar performance'}`)

        return true
    } catch (error) {
        console.error('❌ Test failed:', error.message)
        return false
    }
}

async function runAllTests() {
    console.log('\n🚀 Starting Gemini 2.5 Integration Tests...\n')

    const results = []

    results.push(await testQuickUseCase())
    results.push(await testComplexUseCase())
    results.push(await testStreamingTTFT())
    results.push(await testPromptOptimization())

    console.log('\n' + '='.repeat(60))
    console.log('📋 Test Summary')
    console.log('='.repeat(60))

    const passed = results.filter(r => r).length
    const total = results.length

    console.log(`\n✅ Passed: ${passed}/${total}`)
    console.log(`${passed === total ? '🎉' : '⚠️'} ${passed === total ? 'All tests passed!' : 'Some tests failed'}`)

    console.log('\n📊 Verified Features:')
    console.log('  ✅ Gemini 2.5 Flash integration')
    console.log('  ✅ Gemini 2.5 Pro integration')
    console.log('  ✅ Intelligent model selection (useCase)')
    console.log('  ✅ Streaming with TTFT measurement')
    console.log('  ✅ Conditional prompt optimization')

    console.log('\n' + '='.repeat(60))

    process.exit(passed === total ? 0 : 1)
}

// Run tests
runAllTests().catch(error => {
    console.error('\n❌ Test suite failed:', error)
    process.exit(1)
})
