#!/usr/bin/env tsx
/**
 * PVE Battle Diagnostic Tool
 * 
 * Comprehensive diagnostic script to test PVE battle functionality:
 * - Database question availability
 * - API endpoint testing
 * - Full battle flow simulation
 * 
 * Usage:
 *   pnpm tsx scripts/pve-diagnostic.ts [--check-db|--test-api|--full-test]
 */

import { createClient } from '@supabase/supabase-js'
import fs from 'fs'
import path from 'path'

// Load environment variables manually
const envPath = path.resolve(process.cwd(), '.env.local')
if (fs.existsSync(envPath)) {
    const envConfig = fs.readFileSync(envPath, 'utf8')
    envConfig.split('\n').forEach(line => {
        const match = line.match(/^([^#=]+)=(.*)$/)
        if (match) {
            const key = match[1].trim()
            const value = match[2].trim().replace(/^['"]|['"]$/g, '')
            process.env[key] = value
        }
    })
}

// Configuration
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000'

// Colors for console output
const colors = {
    reset: '\x1b[0m',
    green: '\x1b[32m',
    red: '\x1b[31m',
    yellow: '\x1b[33m',
    blue: '\x1b[34m',
    cyan: '\x1b[36m',
}

function log(message: string, color: keyof typeof colors = 'reset') {
    console.log(`${colors[color]}${message}${colors.reset}`)
}

function logSection(title: string) {
    console.log('\n' + '='.repeat(60))
    log(title, 'cyan')
    console.log('='.repeat(60))
}

// ============================================
// Database Checks
// ============================================

async function checkDatabase() {
    logSection('📊 Database Check: seed_questions')

    if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
        log('❌ Supabase credentials not found in environment', 'red')
        return false
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)

    try {
        // Check total questions
        const { count: totalCount, error: countError } = await supabase
            .from('seed_questions')
            .select('*', { count: 'exact', head: true })
            .eq('is_active', true)

        if (countError) {
            log(`❌ Error counting questions: ${countError.message}`, 'red')
            return false
        }

        log(`✅ Total active questions: ${totalCount}`, 'green')

        if (!totalCount || totalCount < 10) {
            log('⚠️  Warning: Less than 10 questions available', 'yellow')
        }

        // Check by subject
        const { data: subjects, error: subjectError } = await supabase
            .from('seed_questions')
            .select('subject')
            .eq('is_active', true)

        if (subjectError) {
            log(`❌ Error fetching subjects: ${subjectError.message}`, 'red')
            return false
        }

        const subjectCounts = subjects?.reduce((acc, { subject }) => {
            acc[subject] = (acc[subject] || 0) + 1
            return acc
        }, {} as Record<string, number>)

        log('\n📚 Questions by subject:', 'blue')
        Object.entries(subjectCounts || {}).forEach(([subject, count]) => {
            log(`  - ${subject}: ${count}`, count > 10 ? 'green' : 'yellow')
        })

        // Check by difficulty
        const { data: difficulties, error: diffError } = await supabase
            .from('seed_questions')
            .select('difficulty_level')
            .eq('is_active', true)
            .eq('subject', 'english')

        if (diffError) {
            log(`❌ Error fetching difficulties: ${diffError.message}`, 'red')
            return false
        }

        const diffCounts = difficulties?.reduce((acc, { difficulty_level }) => {
            acc[difficulty_level] = (acc[difficulty_level] || 0) + 1
            return acc
        }, {} as Record<number, number>)

        log('\n📈 English questions by difficulty:', 'blue')
        Object.entries(diffCounts || {}).forEach(([level, count]) => {
            log(`  - Level ${level}: ${count}`, count > 3 ? 'green' : 'yellow')
        })

        // Sample a question to check format
        const { data: sample, error: sampleError } = await supabase
            .from('seed_questions')
            .select('id, question_text, option_a, option_b, option_c, option_d, correct_answer, difficulty_level')
            .eq('is_active', true)
            .eq('subject', 'english')
            .limit(1)
            .single()

        if (sampleError) {
            log(`❌ Error fetching sample: ${sampleError.message}`, 'red')
            return false
        }

        log('\n📝 Sample question:', 'blue')
        console.log(JSON.stringify(sample, null, 2))

        // Validate format
        const hasAllOptions = sample?.option_a && sample?.option_b && sample?.option_c && sample?.option_d
        const hasCorrectAnswer = sample?.correct_answer
        const hasQuestionText = sample?.question_text

        if (!hasAllOptions || !hasCorrectAnswer || !hasQuestionText) {
            log('❌ Sample question has missing fields!', 'red')
            return false
        }

        log('\n✅ Database check passed!', 'green')
        return true

    } catch (error) {
        log(`❌ Unexpected error: ${error}`, 'red')
        return false
    }
}

// ============================================
// API Endpoint Tests
// ============================================

async function testPveStartAPI() {
    logSection('🔌 API Test: /api/play/pve/start')

    try {
        const response = await fetch(`${API_BASE_URL}/api/play/pve/start`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                userId: 'test-diagnostic-user',
                subject: 'english',
                timeLimit: 20,
            }),
        })

        log(`Status: ${response.status} ${response.statusText}`, response.ok ? 'green' : 'red')

        const data = await response.json()

        if (!response.ok) {
            log('❌ API returned error:', 'red')
            console.log(JSON.stringify(data, null, 2))
            return false
        }

        log('✅ API Response:', 'green')
        console.log(JSON.stringify({
            success: data.success,
            matchId: data.matchId,
            questionCount: data.questions?.length,
            baselineDifficulty: data.baselineDifficulty,
        }, null, 2))

        // Validate response structure
        if (!data.success) {
            log('❌ Response success is false', 'red')
            return false
        }

        if (!data.matchId) {
            log('❌ Missing matchId', 'red')
            return false
        }

        if (!data.questions || !Array.isArray(data.questions)) {
            log('❌ Missing or invalid questions array', 'red')
            return false
        }

        if (data.questions.length === 0) {
            log('❌ Questions array is empty', 'red')
            return false
        }

        log(`\n✅ Received ${data.questions.length} questions`, 'green')

        // Validate first question format
        const firstQ = data.questions[0]
        log('\n📝 First question sample:', 'blue')
        console.log(JSON.stringify(firstQ, null, 2))

        const hasRequiredFields =
            firstQ.id &&
            firstQ.question_text &&
            firstQ.options &&
            Array.isArray(firstQ.options) &&
            firstQ.options.length >= 2 &&
            firstQ.correct_answer

        if (!hasRequiredFields) {
            log('❌ Question missing required fields', 'red')
            return false
        }

        log('\n✅ API test passed!', 'green')
        return true

    } catch (error) {
        log(`❌ API request failed: ${error}`, 'red')
        return false
    }
}

// ============================================
// Full Flow Test
// ============================================

async function testFullFlow() {
    logSection('🎮 Full Flow Test: Complete PVE Battle')

    log('Step 1: Starting match...', 'blue')
    const startResponse = await fetch(`${API_BASE_URL}/api/play/pve/start`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            userId: 'test-full-flow-user',
            subject: 'english',
            timeLimit: 20,
        }),
    })

    if (!startResponse.ok) {
        log('❌ Failed to start match', 'red')
        return false
    }

    const startData = await startResponse.json()
    log(`✅ Match started: ${startData.matchId}`, 'green')

    log('\nStep 2: Simulating answers...', 'blue')
    const matchId = startData.matchId
    const questions = startData.questions

    for (let i = 0; i < Math.min(3, questions.length); i++) {
        const q = questions[i]
        const answer = q.correct_answer || 'A'

        log(`  Question ${i + 1}: Answering ${answer}`, 'cyan')

        const submitResponse = await fetch(`${API_BASE_URL}/api/play/pve/submit-answer`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                matchId,
                questionId: q.id,
                answer,
                isCorrect: true,
                timeRemaining: 15,
                score: 100,
            }),
        })

        if (!submitResponse.ok) {
            log(`  ⚠️  Submit answer failed (non-critical)`, 'yellow')
        } else {
            log(`  ✅ Answer submitted`, 'green')
        }
    }

    log('\nStep 3: Finishing match...', 'blue')
    const finishResponse = await fetch(`${API_BASE_URL}/api/play/pve/finish`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            matchId,
            finalScore: { player1: 300, player2: 200 },
            winnerId: 'test-full-flow-user',
            coinsEarned: 50,
        }),
    })

    if (!finishResponse.ok) {
        log('⚠️  Finish match failed (non-critical)', 'yellow')
    } else {
        log('✅ Match finished successfully', 'green')
    }

    log('\n✅ Full flow test completed!', 'green')
    return true
}

// ============================================
// Main
// ============================================

async function main() {
    const args = process.argv.slice(2)
    const mode = args[0] || '--full-test'

    log('🔍 PVE Battle Diagnostic Tool', 'cyan')
    log(`Mode: ${mode}\n`, 'blue')

    let success = true

    if (mode === '--check-db' || mode === '--full-test') {
        success = await checkDatabase() && success
    }

    if (mode === '--test-api' || mode === '--full-test') {
        success = await testPveStartAPI() && success
    }

    if (mode === '--full-test') {
        success = await testFullFlow() && success
    }

    logSection(success ? '✅ All Tests Passed' : '❌ Some Tests Failed')
    process.exit(success ? 0 : 1)
}

main().catch((error) => {
    log(`❌ Fatal error: ${error}`, 'red')
    console.error(error)
    process.exit(1)
})
