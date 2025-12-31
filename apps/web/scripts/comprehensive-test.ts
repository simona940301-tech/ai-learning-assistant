/**
 * Comprehensive diagnostic script to test all PVE reward system fixes
 * Run with: npx tsx apps/web/scripts/comprehensive-test.ts <user_id>
 */

import { config } from 'dotenv'
import { createClient } from '@supabase/supabase-js'

// Load environment variables
config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

interface TestResult {
    name: string
    passed: boolean
    message: string
    details?: any
}

async function runComprehensiveTest(userId: string) {
    const supabase = createClient(supabaseUrl, supabaseServiceKey)
    const results: TestResult[] = []

    console.log('🧪 Running Comprehensive PVE Reward System Tests')
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n')

    // Test 1: Profile Schema Validation
    console.log('📋 Test 1: Profile Schema Validation')
    try {
        const { data: profile, error } = await supabase
            .from('profiles')
            .select('id, xp, level, coins, chick_food_bowls, chick_hunger, total_matches, total_wins, total_pve_matches, total_pvp_matches, total_correct_answers, total_questions_answered')
            .eq('id', userId)
            .single()

        if (error) {
            results.push({
                name: 'Profile Schema',
                passed: false,
                message: 'Failed to fetch profile with all required fields',
                details: error
            })
        } else if (!profile) {
            results.push({
                name: 'Profile Schema',
                passed: false,
                message: 'Profile not found'
            })
        } else {
            const requiredFields = ['xp', 'level', 'coins', 'chick_food_bowls', 'chick_hunger', 'total_matches']
            const missingFields = requiredFields.filter(field => !(field in profile))

            if (missingFields.length > 0) {
                results.push({
                    name: 'Profile Schema',
                    passed: false,
                    message: `Missing fields: ${missingFields.join(', ')}`,
                    details: profile
                })
            } else {
                results.push({
                    name: 'Profile Schema',
                    passed: true,
                    message: 'All required fields present',
                    details: {
                        xp: profile.xp,
                        level: profile.level,
                        coins: profile.coins,
                        food_bowls: profile.chick_food_bowls,
                        hunger: profile.chick_hunger,
                        matches: profile.total_matches
                    }
                })
            }
        }
    } catch (err) {
        results.push({
            name: 'Profile Schema',
            passed: false,
            message: 'Exception during test',
            details: err
        })
    }
    console.log()

    // Test 2: XP Calculation Logic
    console.log('📋 Test 2: XP Calculation Logic')
    try {
        const { computeMatchXp } = await import('../lib/progression/xp')

        const testCases = [
            { correctAnswers: 10, totalQuestions: 10, didWin: true, expected: 'high' },
            { correctAnswers: 5, totalQuestions: 10, didWin: false, expected: 'medium' },
            { correctAnswers: 0, totalQuestions: 10, didWin: false, expected: 'low' }
        ]

        let allPassed = true
        const testResults: any[] = []

        for (const testCase of testCases) {
            const result = computeMatchXp(testCase)
            testResults.push({
                input: testCase,
                output: result
            })

            if (result.totalXp < 0) {
                allPassed = false
            }
        }

        results.push({
            name: 'XP Calculation',
            passed: allPassed,
            message: allPassed ? 'All test cases passed' : 'Some test cases failed',
            details: testResults
        })
    } catch (err) {
        results.push({
            name: 'XP Calculation',
            passed: false,
            message: 'Exception during test',
            details: err
        })
    }
    console.log()

    // Test 3: Coins Calculation Logic
    console.log('📋 Test 3: Coins Calculation Logic')
    try {
        const { computeMatchCoins } = await import('../lib/progression/xp')

        const testCases = [
            { correctAnswers: 10, totalQuestions: 10, didWin: true, expectedMin: 100 },
            { correctAnswers: 5, totalQuestions: 10, didWin: false, expectedMin: 5 },
            { correctAnswers: 0, totalQuestions: 10, didWin: false, expectedMin: 5 }
        ]

        let allPassed = true
        const testResults: any[] = []

        for (const testCase of testCases) {
            const result = computeMatchCoins(testCase)
            const passed = result.totalCoins >= testCase.expectedMin

            testResults.push({
                input: testCase,
                output: result,
                passed
            })

            if (!passed) {
                allPassed = false
            }
        }

        results.push({
            name: 'Coins Calculation',
            passed: allPassed,
            message: allPassed ? 'All test cases passed' : 'Some test cases failed',
            details: testResults
        })
    } catch (err) {
        results.push({
            name: 'Coins Calculation',
            passed: false,
            message: 'Exception during test',
            details: err
        })
    }
    console.log()

    // Test 4: Food Bowls Reward Function
    console.log('📋 Test 4: Food Bowls Reward Function')
    try {
        const { grantBattleFoodReward } = await import('../lib/chick/rewards')

        const { data: beforeProfile } = await supabase
            .from('profiles')
            .select('chick_food_bowls')
            .eq('id', userId)
            .single()

        const beforeCount = beforeProfile?.chick_food_bowls || 0

        // Test win scenario
        const result = await grantBattleFoodReward(supabase, userId, true)

        const { data: afterProfile } = await supabase
            .from('profiles')
            .select('chick_food_bowls')
            .eq('id', userId)
            .single()

        const afterCount = afterProfile?.chick_food_bowls || 0
        const actualIncrease = afterCount - beforeCount

        results.push({
            name: 'Food Bowls Reward',
            passed: result.success && actualIncrease === 3,
            message: result.success
                ? `Correctly added ${actualIncrease} bowls (expected 3)`
                : 'Failed to grant reward',
            details: {
                before: beforeCount,
                after: afterCount,
                increase: actualIncrease,
                result
            }
        })
    } catch (err) {
        results.push({
            name: 'Food Bowls Reward',
            passed: false,
            message: 'Exception during test',
            details: err
        })
    }
    console.log()

    // Test 5: Level Status Hook Logic
    console.log('📋 Test 5: Level Status Calculation')
    try {
        const { data: profile } = await supabase
            .from('profiles')
            .select('xp, level')
            .eq('id', userId)
            .single()

        if (profile) {
            const { levelForXp } = await import('../lib/progression/leveling')
            const levelInfo = levelForXp(profile.xp || 0)

            // Check if current XP is less than next level XP
            // levelForXp returns progressPct (0-1), not progress
            const currentLevelXp = Math.floor(levelInfo.progressPct * levelInfo.nextLevelXp)
            const isValid = currentLevelXp <= levelInfo.nextLevelXp && !isNaN(currentLevelXp)

            results.push({
                name: 'Level Status',
                passed: isValid,
                message: isValid
                    ? `XP display format correct: ${currentLevelXp}/${levelInfo.nextLevelXp}`
                    : `XP display format incorrect: ${currentLevelXp}/${levelInfo.nextLevelXp}`,
                details: {
                    totalXp: profile.xp,
                    level: levelInfo.level,
                    progressPct: levelInfo.progressPct,
                    currentLevelXp,
                    nextLevelXp: levelInfo.nextLevelXp
                }
            })
        } else {
            results.push({
                name: 'Level Status',
                passed: false,
                message: 'Profile not found'
            })
        }
    } catch (err) {
        results.push({
            name: 'Level Status',
            passed: false,
            message: 'Exception during test',
            details: err
        })
    }
    console.log()

    // Print Results
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
    console.log('📊 Test Results Summary')
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n')

    const passed = results.filter(r => r.passed).length
    const failed = results.filter(r => !r.passed).length
    const total = results.length

    results.forEach((result, index) => {
        const icon = result.passed ? '✅' : '❌'
        console.log(`${icon} Test ${index + 1}: ${result.name}`)
        console.log(`   ${result.message}`)
        if (!result.passed && result.details) {
            console.log(`   Details:`, JSON.stringify(result.details, null, 2))
        }
        console.log()
    })

    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
    console.log(`Total: ${total} | Passed: ${passed} | Failed: ${failed}`)
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n')

    if (failed === 0) {
        console.log('🎉 All tests passed! PVE reward system is working correctly.')
    } else {
        console.log('⚠️  Some tests failed. Please review the details above.')
    }

    return { passed, failed, total, results }
}

const userId = process.argv[2]
if (!userId) {
    console.error('Usage: npx tsx apps/web/scripts/comprehensive-test.ts <user_id>')
    process.exit(1)
}

runComprehensiveTest(userId).then((summary) => {
    process.exit(summary.failed > 0 ? 1 : 0)
})
