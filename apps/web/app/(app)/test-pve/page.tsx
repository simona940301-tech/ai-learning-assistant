'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { usePlay } from '@/lib/play-context'
import { toast } from 'sonner'

/**
 * PVE Testing Page
 * 
 * Dedicated page for testing PVE battle functionality with detailed diagnostics.
 * Access: http://localhost:3000/test-pve
 */
export default function TestPVEPage() {
    const { startMatch, battleState, userStatus, checkEnergy } = usePlay()
    const [logs, setLogs] = useState<string[]>([])
    const [isTestRunning, setIsTestRunning] = useState(false)

    const addLog = (message: string, type: 'info' | 'success' | 'error' | 'warning' = 'info') => {
        const timestamp = new Date().toLocaleTimeString()
        const prefix = {
            info: '📝',
            success: '✅',
            error: '❌',
            warning: '⚠️',
        }[type]
        setLogs(prev => [...prev, `[${timestamp}] ${prefix} ${message}`])
    }

    const testDatabaseQuestions = async () => {
        addLog('Testing database questions...', 'info')

        try {
            const response = await fetch('/api/onboarding/questions?subject=english&count=10')
            const data = await response.json()

            if (data.success && data.questions?.length > 0) {
                addLog(`Database OK: Found ${data.questions.length} questions`, 'success')
                return true
            } else {
                addLog('Database Error: No questions found', 'error')
                return false
            }
        } catch (error) {
            addLog(`Database Error: ${error}`, 'error')
            return false
        }
    }

    const testPVEStartAPI = async () => {
        addLog('Testing PVE Start API...', 'info')

        try {
            const response = await fetch('/api/play/pve/start', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    userId: userStatus ? 'current-user' : 'test-user',
                    subject: 'english',
                    timeLimit: 20,
                }),
            })

            const data = await response.json()

            if (response.ok && data.success) {
                addLog(`API OK: Match ${data.matchId} with ${data.questions?.length} questions`, 'success')
                return true
            } else {
                addLog(`API Error: ${data.error || 'Unknown error'}`, 'error')
                return false
            }
        } catch (error) {
            addLog(`API Error: ${error}`, 'error')
            return false
        }
    }

    const testFullBattleFlow = async () => {
        setIsTestRunning(true)
        addLog('Starting full battle flow test...', 'info')

        try {
            // Step 1: Check energy
            addLog('Step 1: Checking energy...', 'info')
            const energy = await checkEnergy()
            if (!energy.success) {
                addLog(`Energy check failed: ${energy.message}`, 'warning')
            } else {
                addLog(`Energy OK: ${energy.currentEnergy} available`, 'success')
            }

            // Step 2: Start match
            addLog('Step 2: Starting match...', 'info')
            const result = await startMatch({
                type: 'PVE_TRAINING',
                subject: 'english',
                timeLimit: 20,
                origin: 'TEST_PAGE',
            })

            if (!result.ok) {
                addLog(`Match start failed: ${result.error}`, 'error')
                toast.error(result.error || 'Failed to start match')
                return false
            }

            addLog('Match started successfully!', 'success')

            // Step 3: Wait for battle state
            setTimeout(() => {
                if (battleState?.isInBattle) {
                    addLog(`Battle state OK: ${battleState.questionList.length} questions loaded`, 'success')
                    addLog('Test completed! You should now see the battle screen.', 'success')
                } else {
                    addLog('Battle state not updated - check console for errors', 'warning')
                }
            }, 1000)

            return true

        } catch (error) {
            addLog(`Test failed: ${error}`, 'error')
            return false
        } finally {
            setIsTestRunning(false)
        }
    }

    const runAllTests = async () => {
        setLogs([])
        addLog('Running all diagnostic tests...', 'info')

        const dbOk = await testDatabaseQuestions()
        await new Promise(resolve => setTimeout(resolve, 500))

        const apiOk = await testPVEStartAPI()
        await new Promise(resolve => setTimeout(resolve, 500))

        if (dbOk && apiOk) {
            addLog('All preliminary tests passed! Ready for full flow test.', 'success')
        } else {
            addLog('Some tests failed. Fix issues before testing full flow.', 'error')
        }
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-8">
            <div className="mx-auto max-w-4xl space-y-6">
                {/* Header */}
                <Card className="border-2 border-blue-200 bg-white p-6">
                    <h1 className="text-3xl font-bold text-slate-800">🔍 PVE Battle Diagnostic</h1>
                    <p className="mt-2 text-slate-600">
                        Test and diagnose PVE battle functionality with detailed logging
                    </p>
                </Card>

                {/* Status Panel */}
                <Card className="bg-white p-6">
                    <h2 className="mb-4 text-xl font-semibold text-slate-800">System Status</h2>
                    <div className="grid grid-cols-2 gap-4">
                        <div className="rounded-lg bg-slate-50 p-4">
                            <div className="text-sm text-slate-600">User Status</div>
                            <div className="mt-1 font-semibold">
                                {userStatus ? (
                                    <span className="text-green-600">✅ Authenticated</span>
                                ) : (
                                    <span className="text-yellow-600">⚠️ Not Authenticated</span>
                                )}
                            </div>
                            {userStatus && (
                                <div className="mt-2 text-xs text-slate-500">
                                    Energy: {userStatus.dailyEnergyCount}
                                </div>
                            )}
                        </div>

                        <div className="rounded-lg bg-slate-50 p-4">
                            <div className="text-sm text-slate-600">Battle State</div>
                            <div className="mt-1 font-semibold">
                                {battleState?.isInBattle ? (
                                    <span className="text-green-600">✅ In Battle</span>
                                ) : (
                                    <span className="text-slate-400">⚪ Idle</span>
                                )}
                            </div>
                            {battleState?.isInBattle && (
                                <div className="mt-2 text-xs text-slate-500">
                                    Questions: {battleState.questionList.length}
                                </div>
                            )}
                        </div>
                    </div>
                </Card>

                {/* Test Controls */}
                <Card className="bg-white p-6">
                    <h2 className="mb-4 text-xl font-semibold text-slate-800">Test Controls</h2>
                    <div className="grid grid-cols-2 gap-3">
                        <Button
                            onClick={testDatabaseQuestions}
                            variant="outline"
                            className="h-auto flex-col items-start gap-1 py-3"
                        >
                            <span className="font-semibold">Test Database</span>
                            <span className="text-xs text-slate-500">Check seed_questions table</span>
                        </Button>

                        <Button
                            onClick={testPVEStartAPI}
                            variant="outline"
                            className="h-auto flex-col items-start gap-1 py-3"
                        >
                            <span className="font-semibold">Test API</span>
                            <span className="text-xs text-slate-500">Test /api/play/pve/start</span>
                        </Button>

                        <Button
                            onClick={runAllTests}
                            variant="outline"
                            className="h-auto flex-col items-start gap-1 py-3"
                        >
                            <span className="font-semibold">Run All Tests</span>
                            <span className="text-xs text-slate-500">Database + API checks</span>
                        </Button>

                        <Button
                            onClick={testFullBattleFlow}
                            disabled={isTestRunning}
                            className="h-auto flex-col items-start gap-1 bg-blue-600 py-3 text-white hover:bg-blue-700"
                        >
                            <span className="font-semibold">
                                {isTestRunning ? 'Testing...' : 'Full Battle Test'}
                            </span>
                            <span className="text-xs opacity-80">Start complete PVE flow</span>
                        </Button>
                    </div>
                </Card>

                {/* Logs */}
                <Card className="bg-white p-6">
                    <div className="mb-4 flex items-center justify-between">
                        <h2 className="text-xl font-semibold text-slate-800">Diagnostic Logs</h2>
                        <Button
                            onClick={() => setLogs([])}
                            variant="ghost"
                            size="sm"
                            className="text-slate-500"
                        >
                            Clear
                        </Button>
                    </div>
                    <div className="max-h-96 overflow-y-auto rounded-lg bg-slate-900 p-4 font-mono text-sm">
                        {logs.length === 0 ? (
                            <div className="text-slate-500">No logs yet. Run a test to see output.</div>
                        ) : (
                            logs.map((log, i) => (
                                <div key={i} className="text-slate-100">
                                    {log}
                                </div>
                            ))
                        )}
                    </div>
                </Card>

                {/* Instructions */}
                <Card className="border-2 border-amber-200 bg-amber-50 p-6">
                    <h3 className="mb-2 font-semibold text-amber-900">📋 Testing Instructions</h3>
                    <ol className="list-inside list-decimal space-y-1 text-sm text-amber-800">
                        <li>First run "Run All Tests" to check database and API</li>
                        <li>If tests pass, click "Full Battle Test" to start a real match</li>
                        <li>Check the logs for any errors or warnings</li>
                        <li>If battle starts, you'll be redirected to the battle screen</li>
                        <li>Open browser console (F12) for additional debug info</li>
                    </ol>
                </Card>
            </div>
        </div>
    )
}
