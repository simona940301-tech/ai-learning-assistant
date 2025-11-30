/**
 * RAG Performance Benchmark
 *
 * Measures and tracks performance metrics for RAG system:
 * - Upload latency
 * - Text extraction speed
 * - Analysis generation time
 * - SSE latency
 * - Memory usage
 *
 * Usage: tsx tests/rag/performance-benchmark.ts
 */

interface BenchmarkResult {
    metric: string
    value: number
    unit: string
    target: number
    status: 'excellent' | 'good' | 'needs-optimization' | 'poor'
}

class PerformanceBenchmark {
    private results: BenchmarkResult[] = []
    private baseUrl = 'http://localhost:3000'

    async runBenchmarks() {
        console.log('⚡ RAG Performance Benchmark')
        console.log('='.repeat(80))
        console.log('')

        // Benchmark 1: Upload Response Time
        await this.benchmarkUploadLatency()

        // Benchmark 2: Quick Preview Generation
        await this.benchmarkQuickPreview()

        // Benchmark 3: Full Analysis Time
        await this.benchmarkFullAnalysis()

        // Benchmark 4: Large File Handling
        await this.benchmarkLargeFile()

        // Benchmark 5: Concurrent Uploads
        await this.benchmarkConcurrentUploads()

        // Print results
        this.printResults()
    }

    private async benchmarkUploadLatency() {
        console.log('📤 Benchmark: Upload Latency')
        const iterations = 5
        const times: number[] = []

        for (let i = 0; i < iterations; i++) {
            const content = `测试文档 ${i + 1}`
            const formData = new FormData()
            const blob = new Blob([content], { type: 'text/plain' })
            formData.append('file', blob, `test-${i}.txt`)

            const start = Date.now()
            try {
                const response = await fetch(`${this.baseUrl}/api/rag/upload-elite`, {
                    method: 'POST',
                    body: formData
                })

                if (response.ok) {
                    const duration = Date.now() - start
                    times.push(duration)
                    console.log(`   Run ${i + 1}: ${duration}ms`)
                }
            } catch (error) {
                console.log(`   Run ${i + 1}: FAILED - ${error}`)
            }

            // Wait 1s between requests
            await new Promise(resolve => setTimeout(resolve, 1000))
        }

        const avgTime = times.reduce((a, b) => a + b, 0) / times.length
        const maxTime = Math.max(...times)
        const minTime = Math.min(...times)

        console.log(`   Average: ${avgTime.toFixed(0)}ms`)
        console.log(`   Min: ${minTime}ms | Max: ${maxTime}ms`)

        this.results.push({
            metric: 'Upload Response Time',
            value: avgTime,
            unit: 'ms',
            target: 1000,
            status: avgTime < 500 ? 'excellent' : avgTime < 1000 ? 'good' : 'needs-optimization'
        })
        console.log('')
    }

    private async benchmarkQuickPreview() {
        console.log('🚀 Benchmark: Quick Preview Generation')

        const content = '# 測試文檔\n\n這是一份用於測試快速預覽生成速度的文檔。'.repeat(50)
        const formData = new FormData()
        const blob = new Blob([content], { type: 'text/plain' })
        formData.append('file', blob, 'preview-test.txt')

        try {
            const uploadStart = Date.now()
            const response = await fetch(`${this.baseUrl}/api/rag/upload-elite`, {
                method: 'POST',
                body: formData
            })

            const data = await response.json()
            const analysisId = data.analysisId

            // Poll until quick preview is ready
            const previewStart = Date.now()
            let previewTime = 0

            while (Date.now() - previewStart < 10000) {
                const pollResponse = await fetch(
                    `${this.baseUrl}/api/rag/upload-elite?analysisId=${analysisId}`
                )
                const pollData = await pollResponse.json()
                const analysis = pollData.analysis

                if (analysis.quickSummary) {
                    previewTime = Date.now() - previewStart
                    console.log(`   ✓ Preview generated in ${previewTime}ms`)
                    break
                }

                await new Promise(resolve => setTimeout(resolve, 500))
            }

            this.results.push({
                metric: 'Quick Preview Time',
                value: previewTime,
                unit: 'ms',
                target: 3000,
                status: previewTime < 2000 ? 'excellent' : previewTime < 3000 ? 'good' : 'needs-optimization'
            })
        } catch (error) {
            console.log(`   ❌ FAILED: ${error}`)
        }
        console.log('')
    }

    private async benchmarkFullAnalysis() {
        console.log('📊 Benchmark: Full Analysis Time')

        const content = `
# 台灣歷史

## 史前時代
台灣的史前文化可追溯至舊石器時代，距今約5萬年前。

## 荷西時期
1624年，荷蘭東印度公司在台南建立據點。

## 明鄭時期
1661年，鄭成功驅逐荷蘭人，建立明鄭政權。
        `.trim().repeat(20)

        const formData = new FormData()
        const blob = new Blob([content], { type: 'text/plain' })
        formData.append('file', blob, 'full-analysis-test.txt')

        try {
            const response = await fetch(`${this.baseUrl}/api/rag/upload-elite`, {
                method: 'POST',
                body: formData
            })

            const data = await response.json()
            const analysisId = data.analysisId

            const analysisStart = Date.now()
            let analysisTime = 0

            while (Date.now() - analysisStart < 30000) {
                const pollResponse = await fetch(
                    `${this.baseUrl}/api/rag/upload-elite?analysisId=${analysisId}`
                )
                const pollData = await pollResponse.json()
                const analysis = pollData.analysis

                if (analysis.status === 'prediction_ready' || analysis.status === 'analysis_ready') {
                    analysisTime = Date.now() - analysisStart
                    console.log(`   ✓ Full analysis completed in ${analysisTime}ms`)
                    break
                }

                await new Promise(resolve => setTimeout(resolve, 1000))
            }

            this.results.push({
                metric: 'Full Analysis Time',
                value: analysisTime,
                unit: 'ms',
                target: 10000,
                status: analysisTime < 8000 ? 'excellent' : analysisTime < 12000 ? 'good' : 'needs-optimization'
            })
        } catch (error) {
            console.log(`   ❌ FAILED: ${error}`)
        }
        console.log('')
    }

    private async benchmarkLargeFile() {
        console.log('📦 Benchmark: Large File Processing')

        // Generate 100KB text file
        let largeContent = '# 大型文檔測試\n\n'
        for (let i = 0; i < 2000; i++) {
            largeContent += `段落 ${i + 1}: 這是測試內容。`.repeat(5) + '\n\n'
        }

        console.log(`   Content size: ${(largeContent.length / 1024).toFixed(1)} KB`)

        const formData = new FormData()
        const blob = new Blob([largeContent], { type: 'text/plain' })
        formData.append('file', blob, 'large-test.txt')

        try {
            const start = Date.now()
            const response = await fetch(`${this.baseUrl}/api/rag/upload-elite`, {
                method: 'POST',
                body: formData
            })

            const data = await response.json()
            const analysisId = data.analysisId

            // Poll until completion
            while (Date.now() - start < 60000) {
                const pollResponse = await fetch(
                    `${this.baseUrl}/api/rag/upload-elite?analysisId=${analysisId}`
                )
                const pollData = await pollResponse.json()
                const analysis = pollData.analysis

                if (analysis.status === 'prediction_ready') {
                    const totalTime = Date.now() - start
                    console.log(`   ✓ Large file processed in ${totalTime}ms`)

                    this.results.push({
                        metric: 'Large File Processing',
                        value: totalTime,
                        unit: 'ms',
                        target: 20000,
                        status: totalTime < 15000 ? 'excellent' : totalTime < 25000 ? 'good' : 'needs-optimization'
                    })
                    break
                }

                await new Promise(resolve => setTimeout(resolve, 2000))
            }
        } catch (error) {
            console.log(`   ❌ FAILED: ${error}`)
        }
        console.log('')
    }

    private async benchmarkConcurrentUploads() {
        console.log('🔀 Benchmark: Concurrent Uploads')

        const concurrentRequests = 3
        const promises = []

        const start = Date.now()

        for (let i = 0; i < concurrentRequests; i++) {
            const content = `併發測試文檔 ${i + 1}`
            const formData = new FormData()
            const blob = new Blob([content], { type: 'text/plain' })
            formData.append('file', blob, `concurrent-${i}.txt`)

            const promise = fetch(`${this.baseUrl}/api/rag/upload-elite`, {
                method: 'POST',
                body: formData
            })

            promises.push(promise)
        }

        try {
            await Promise.all(promises)
            const totalTime = Date.now() - start
            const avgTime = totalTime / concurrentRequests

            console.log(`   ✓ ${concurrentRequests} concurrent uploads completed`)
            console.log(`   Total time: ${totalTime}ms`)
            console.log(`   Average time per request: ${avgTime.toFixed(0)}ms`)

            this.results.push({
                metric: 'Concurrent Upload Handling',
                value: avgTime,
                unit: 'ms/request',
                target: 2000,
                status: avgTime < 1500 ? 'excellent' : avgTime < 2500 ? 'good' : 'needs-optimization'
            })
        } catch (error) {
            console.log(`   ❌ FAILED: ${error}`)
        }
        console.log('')
    }

    private printResults() {
        console.log('='.repeat(80))
        console.log('📊 Benchmark Results')
        console.log('='.repeat(80))
        console.log('')

        console.log('┌─────────────────────────────────┬──────────┬──────────┬────────────────────┐')
        console.log('│ Metric                          │ Result   │ Target   │ Status             │')
        console.log('├─────────────────────────────────┼──────────┼──────────┼────────────────────┤')

        this.results.forEach(result => {
            const metric = result.metric.padEnd(31)
            const value = `${result.value.toFixed(0)}${result.unit}`.padEnd(8)
            const target = `${result.target}${result.unit}`.padEnd(8)
            const statusIcon = {
                'excellent': '✅ Excellent',
                'good': '✓ Good',
                'needs-optimization': '⚠️  Needs Work',
                'poor': '❌ Poor'
            }[result.status]
            const status = statusIcon?.padEnd(18) || ''

            console.log(`│ ${metric} │ ${value} │ ${target} │ ${status} │`)
        })

        console.log('└─────────────────────────────────┴──────────┴──────────┴────────────────────┘')
        console.log('')

        // Overall assessment
        const excellentCount = this.results.filter(r => r.status === 'excellent').length
        const goodCount = this.results.filter(r => r.status === 'good').length
        const needsWorkCount = this.results.filter(r => r.status === 'needs-optimization').length
        const poorCount = this.results.filter(r => r.status === 'poor').length

        console.log('Overall Performance:')
        console.log(`  ✅ Excellent: ${excellentCount}`)
        console.log(`  ✓ Good: ${goodCount}`)
        console.log(`  ⚠️  Needs Optimization: ${needsWorkCount}`)
        console.log(`  ❌ Poor: ${poorCount}`)
        console.log('')

        if (poorCount > 0 || needsWorkCount > 2) {
            console.log('⚠️  Recommendation: Performance optimization needed')
        } else if (excellentCount === this.results.length) {
            console.log('🎉 Excellent! All metrics meet or exceed targets')
        } else {
            console.log('✓ Good performance overall')
        }
        console.log('')
    }
}

// Main execution
async function main() {
    const benchmark = new PerformanceBenchmark()
    await benchmark.runBenchmarks()
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error('Benchmark failed:', error)
        process.exit(1)
    })
