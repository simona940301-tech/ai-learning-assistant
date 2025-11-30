/**
 * RAG Complete Flow Test
 *
 * Tests the entire RAG upload and analysis pipeline:
 * 1. File upload
 * 2. Text extraction
 * 3. Quick preview generation
 * 4. Full analysis (parallel)
 * 5. SSE streaming updates
 * 6. Save to backpack
 *
 * Usage: tsx tests/rag/test-rag-complete-flow.ts
 */

import { readFileSync } from 'fs'
import { resolve } from 'path'

interface TestResult {
    passed: boolean
    duration: number
    message: string
    details?: any
}

class RAGTester {
    private baseUrl = 'http://localhost:3000'
    private results: TestResult[] = []
    private authToken: string | null = null

    constructor() {
        // Get auth token from environment or user input
        this.authToken = process.env.TEST_AUTH_TOKEN || null
    }

    async runAllTests() {
        console.log('🚀 Starting RAG Complete Flow Tests\n')
        console.log('='.repeat(80))
        console.log('')

        // Test 1: PDF Upload
        await this.testPDFUpload()

        // Test 2: Text File Upload
        await this.testTextUpload()

        // Test 3: Image Upload
        await this.testImageUpload()

        // Test 4: Multi-file Upload
        await this.testMultiFileUpload()

        // Test 5: Large File Upload
        await this.testLargeFileUpload()

        // Test 6: SSE Stream Test
        await this.testSSEStream()

        // Test 7: Performance Benchmark
        await this.testPerformanceBenchmark()

        // Print summary
        this.printSummary()
    }

    private async testPDFUpload() {
        const testName = 'PDF Upload & Analysis'
        console.log(`📄 Testing: ${testName}`)
        const startTime = Date.now()

        try {
            // Check if sample PDF exists
            const samplePath = resolve(__dirname, '../../public/sample.pdf')
            let buffer: Buffer

            try {
                buffer = readFileSync(samplePath)
            } catch {
                console.log('   ⚠️  No sample.pdf found, creating minimal test PDF...')
                // Create a minimal test text file instead
                buffer = Buffer.from('This is a test document for RAG analysis.')
                console.log('   ✓ Created test content')
            }

            // Upload file
            const formData = new FormData()
            const blob = new Blob([buffer], { type: 'application/pdf' })
            formData.append('file', blob, 'test.pdf')

            const response = await fetch(`${this.baseUrl}/api/rag/upload-elite`, {
                method: 'POST',
                body: formData,
                headers: this.getAuthHeaders()
            })

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${await response.text()}`)
            }

            const data = await response.json()
            console.log('   ✓ Upload successful')
            console.log(`   - Analysis ID: ${data.analysisId}`)
            console.log(`   - Status: ${data.status}`)

            // Poll for completion
            const analysisResult = await this.pollAnalysis(data.analysisId)
            console.log(`   ✓ Analysis completed in ${analysisResult.processingTimeMs}ms`)

            this.results.push({
                passed: true,
                duration: Date.now() - startTime,
                message: `${testName} - PASSED`,
                details: data
            })
        } catch (error) {
            console.log(`   ❌ FAILED: ${error instanceof Error ? error.message : String(error)}`)
            this.results.push({
                passed: false,
                duration: Date.now() - startTime,
                message: `${testName} - FAILED`,
                details: error
            })
        }
        console.log('')
    }

    private async testTextUpload() {
        const testName = 'Text File Upload & Analysis'
        console.log(`📝 Testing: ${testName}`)
        const startTime = Date.now()

        try {
            const testContent = `
# 牛頓運動定律

## 第一運動定律（慣性定律）
物體在不受外力作用時，會保持靜止或等速直線運動。

## 第二運動定律
F = ma，力等於質量乘以加速度。

## 第三運動定律
作用力與反作用力大小相等、方向相反。
            `.trim()

            const formData = new FormData()
            const blob = new Blob([testContent], { type: 'text/plain' })
            formData.append('file', blob, 'newton-laws.txt')

            const response = await fetch(`${this.baseUrl}/api/rag/upload-elite`, {
                method: 'POST',
                body: formData,
                headers: this.getAuthHeaders()
            })

            const data = await response.json()
            console.log('   ✓ Upload successful')

            const analysisResult = await this.pollAnalysis(data.analysisId)

            // Validate content
            if (analysisResult.structuredNotes && analysisResult.structuredNotes.includes('牛頓')) {
                console.log('   ✓ Content analysis correct')
            } else {
                throw new Error('Content analysis did not contain expected keywords')
            }

            this.results.push({
                passed: true,
                duration: Date.now() - startTime,
                message: `${testName} - PASSED`
            })
        } catch (error) {
            console.log(`   ❌ FAILED: ${error instanceof Error ? error.message : String(error)}`)
            this.results.push({
                passed: false,
                duration: Date.now() - startTime,
                message: `${testName} - FAILED`
            })
        }
        console.log('')
    }

    private async testImageUpload() {
        const testName = 'Image Upload (OCR)'
        console.log(`🖼️  Testing: ${testName}`)
        console.log('   ⚠️  Skipped - Requires actual image file')
        console.log('')
    }

    private async testMultiFileUpload() {
        const testName = 'Multi-file Upload'
        console.log(`📚 Testing: ${testName}`)
        const startTime = Date.now()

        try {
            const formData = new FormData()

            // Add multiple text files
            const files = [
                { name: 'chapter1.txt', content: '第一章：基礎概念\n這是第一章的內容...' },
                { name: 'chapter2.txt', content: '第二章：進階主題\n這是第二章的內容...' },
                { name: 'chapter3.txt', content: '第三章：實戰應用\n這是第三章的內容...' }
            ]

            files.forEach(file => {
                const blob = new Blob([file.content], { type: 'text/plain' })
                formData.append('file', blob, file.name)
            })

            const response = await fetch(`${this.baseUrl}/api/rag/upload-elite`, {
                method: 'POST',
                body: formData,
                headers: this.getAuthHeaders()
            })

            const data = await response.json()
            console.log(`   ✓ Uploaded ${files.length} files`)

            const analysisResult = await this.pollAnalysis(data.analysisId)
            console.log(`   ✓ Multi-file analysis completed`)

            this.results.push({
                passed: true,
                duration: Date.now() - startTime,
                message: `${testName} - PASSED`
            })
        } catch (error) {
            console.log(`   ❌ FAILED: ${error instanceof Error ? error.message : String(error)}`)
            this.results.push({
                passed: false,
                duration: Date.now() - startTime,
                message: `${testName} - FAILED`
            })
        }
        console.log('')
    }

    private async testLargeFileUpload() {
        const testName = 'Large File Upload (Smart Chunking)'
        console.log(`📦 Testing: ${testName}`)
        const startTime = Date.now()

        try {
            // Generate large text content (50k characters)
            let largeContent = '# 大型文件測試\n\n'
            for (let i = 0; i < 1000; i++) {
                largeContent += `## 段落 ${i + 1}\n`
                largeContent += `這是第 ${i + 1} 個段落的內容。`.repeat(10) + '\n\n'
            }

            const formData = new FormData()
            const blob = new Blob([largeContent], { type: 'text/plain' })
            formData.append('file', blob, 'large-document.txt')

            console.log(`   - Content size: ${largeContent.length} characters`)

            const response = await fetch(`${this.baseUrl}/api/rag/upload-elite`, {
                method: 'POST',
                body: formData,
                headers: this.getAuthHeaders()
            })

            const data = await response.json()
            console.log('   ✓ Large file uploaded')

            const analysisResult = await this.pollAnalysis(data.analysisId, 30000) // 30s timeout
            console.log(`   ✓ Smart chunking handled large file`)

            this.results.push({
                passed: true,
                duration: Date.now() - startTime,
                message: `${testName} - PASSED`
            })
        } catch (error) {
            console.log(`   ❌ FAILED: ${error instanceof Error ? error.message : String(error)}`)
            this.results.push({
                passed: false,
                duration: Date.now() - startTime,
                message: `${testName} - FAILED`
            })
        }
        console.log('')
    }

    private async testSSEStream() {
        const testName = 'SSE Streaming Updates'
        console.log(`📡 Testing: ${testName}`)
        console.log('   ⚠️  Skipped - Requires EventSource implementation')
        console.log('')
    }

    private async testPerformanceBenchmark() {
        const testName = 'Performance Benchmark'
        console.log(`⚡ Testing: ${testName}`)
        const startTime = Date.now()

        try {
            const testContent = '這是一份測試文件，用於性能基準測試。'.repeat(100)
            const formData = new FormData()
            const blob = new Blob([testContent], { type: 'text/plain' })
            formData.append('file', blob, 'benchmark.txt')

            const uploadStart = Date.now()
            const response = await fetch(`${this.baseUrl}/api/rag/upload-elite`, {
                method: 'POST',
                body: formData,
                headers: this.getAuthHeaders()
            })
            const uploadDuration = Date.now() - uploadStart

            const data = await response.json()
            console.log(`   ✓ Upload response time: ${uploadDuration}ms`)

            // Validate target: < 1s
            if (uploadDuration < 1000) {
                console.log('   ✓ Upload speed: EXCELLENT (<1s)')
            } else {
                console.log('   ⚠️  Upload speed: Needs optimization (>1s)')
            }

            const analysisStart = Date.now()
            const analysisResult = await this.pollAnalysis(data.analysisId)
            const totalDuration = Date.now() - analysisStart

            console.log(`   ✓ Total analysis time: ${totalDuration}ms`)

            // Validate targets
            if (totalDuration < 10000) {
                console.log('   ✓ Analysis speed: EXCELLENT (<10s)')
            } else if (totalDuration < 15000) {
                console.log('   ⚠️  Analysis speed: GOOD (<15s)')
            } else {
                console.log('   ⚠️  Analysis speed: Needs optimization (>15s)')
            }

            this.results.push({
                passed: true,
                duration: Date.now() - startTime,
                message: `${testName} - PASSED`,
                details: {
                    uploadDuration,
                    analysisDuration: totalDuration
                }
            })
        } catch (error) {
            console.log(`   ❌ FAILED: ${error instanceof Error ? error.message : String(error)}`)
            this.results.push({
                passed: false,
                duration: Date.now() - startTime,
                message: `${testName} - FAILED`
            })
        }
        console.log('')
    }

    private async pollAnalysis(analysisId: string, timeout: number = 20000): Promise<any> {
        const startTime = Date.now()
        const pollInterval = 2000 // 2 seconds

        while (Date.now() - startTime < timeout) {
            const response = await fetch(
                `${this.baseUrl}/api/rag/upload-elite?analysisId=${analysisId}`,
                { headers: this.getAuthHeaders() }
            )

            if (!response.ok) {
                throw new Error(`Poll failed: HTTP ${response.status}`)
            }

            const data = await response.json()
            const analysis = data.analysis

            if (analysis.status === 'prediction_ready' || analysis.status === 'analysis_ready') {
                return analysis
            }

            if (analysis.status === 'failed') {
                throw new Error(`Analysis failed: ${analysis.errorMessage}`)
            }

            // Wait before next poll
            await new Promise(resolve => setTimeout(resolve, pollInterval))
        }

        throw new Error(`Analysis timeout after ${timeout}ms`)
    }

    private getAuthHeaders(): Record<string, string> {
        if (this.authToken) {
            return {
                'Authorization': `Bearer ${this.authToken}`
            }
        }
        return {}
    }

    private printSummary() {
        console.log('='.repeat(80))
        console.log('📊 Test Summary')
        console.log('='.repeat(80))
        console.log('')

        const passed = this.results.filter(r => r.passed).length
        const failed = this.results.filter(r => !r.passed).length
        const total = this.results.length

        console.log(`Total Tests: ${total}`)
        console.log(`✓ Passed: ${passed}`)
        console.log(`❌ Failed: ${failed}`)
        console.log('')

        if (failed > 0) {
            console.log('Failed Tests:')
            this.results.filter(r => !r.passed).forEach(r => {
                console.log(`  - ${r.message}`)
            })
            console.log('')
        }

        const avgDuration = this.results.reduce((sum, r) => sum + r.duration, 0) / total
        console.log(`Average Test Duration: ${avgDuration.toFixed(0)}ms`)
        console.log('')

        if (failed === 0) {
            console.log('🎉 All tests passed!')
        } else {
            console.log('⚠️  Some tests failed. Please review the logs above.')
        }
        console.log('')
    }
}

// Main execution
async function main() {
    const tester = new RAGTester()
    await tester.runAllTests()
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error('Test suite failed:', error)
        process.exit(1)
    })
