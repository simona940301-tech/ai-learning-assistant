'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Loader2, CheckCircle2, XCircle, AlertTriangle } from 'lucide-react'
import { v4 as uuidv4 } from 'uuid'

interface TestResult {
    status: 'success' | 'error' | 'pending' | 'idle'
    message?: string
    data?: any
}

export function BackpackLogicTester() {
    const [notebookResult, setNotebookResult] = useState<TestResult>({ status: 'idle' })
    const [ragSaveResult, setRagSaveResult] = useState<TestResult>({ status: 'idle' })
    const [vocabResult, setVocabResult] = useState<TestResult>({ status: 'idle' })
    const [errorBookResult, setErrorBookResult] = useState<TestResult>({ status: 'idle' })

    // --- 1. Test Notebook Save (/api/notebook/save) ---
    const testNotebookSave = async (isDuplicate = false) => {
        setNotebookResult({ status: 'pending' })
        try {
            const title = isDuplicate ? "Test Duplicate Title" : `Ref Test Note ${new Date().toLocaleTimeString()}`
            const payload = {
                title,
                content_md: "# Test Content\nThis is a test note created by the backpack logic tester.",
                source_type: 'manual',
                tags: ['test', 'debug']
            }

            const res = await fetch('/api/notebook/save', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            })

            const data = await res.json()

            if (!res.ok) {
                // Determine if it is a duplicate error (expected in one case)
                if (res.status === 409 || data.error === 'DUPLICATE_TITLE') {
                    setNotebookResult({
                        status: 'error', // Visually error, but conceptually might be success for the test
                        message: `Duplicate Error (Expected if testing duplicate): ${data.message}`,
                        data
                    })
                } else {
                    throw new Error(data.message || 'Unknown error')
                }
            } else {
                setNotebookResult({ status: 'success', message: 'Saved successfully', data })
            }
        } catch (error: any) {
            setNotebookResult({ status: 'error', message: error.message, data: error })
        }
    }

    // --- 2. Test RAG Summary Save (/api/backpack/save) ---
    const testRagSave = async () => {
        setRagSaveResult({ status: 'pending' })
        try {
            // Testing the "Enhanced Schema" path used by SummaryWorkbench
            const payload = {
                // user_id is handled by server auth usually, but the schema has it. 
                // The server code says "always use authenticated user ID", but schema validation might require it.
                // We'll send 'auto' as placeholder.
                user_id: 'auto',
                title: `RAG Summary Test ${new Date().toLocaleTimeString()}`,
                subject: 'english',
                content: "This is a RAG summary test content.",
                include_conversation: true,
                conversation_history: [
                    { id: '1', role: 'user', content: 'What is a test?' },
                    { id: '2', role: 'assistant', content: 'This is a test.' }
                ]
            }

            const res = await fetch('/api/backpack/save', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            })

            const data = await res.json()

            if (!res.ok) throw new Error(data.message || data.error || 'Failed')

            setRagSaveResult({ status: 'success', message: 'RAG Summary Saved', data })
        } catch (error: any) {
            setRagSaveResult({ status: 'error', message: error.message })
        }
    }

    // --- 3. Test Vocabulary Batch Save (/api/vocabulary/batch-save) ---
    const testVocabSave = async () => {
        setVocabResult({ status: 'pending' })
        try {
            const payload = {
                session_id: `test-session-${Date.now()}`,
                deck_type: 'practice',
                words: [
                    {
                        id: uuidv4(),
                        text: `test-word-${Date.now()}`, // Unique to avoid skip
                        definition_zh: "測試單字",
                        example_en: "This is a test word.",
                        pos: "n.",
                        level: "A1"
                    }
                ]
            }

            const res = await fetch('/api/vocabulary/batch-save', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            })

            const data = await res.json()

            if (!res.ok) throw new Error(data.message || 'Failed')

            setVocabResult({ status: 'success', message: `Saved: ${data.saved}, Skipped: ${data.skipped}`, data })
        } catch (error: any) {
            setVocabResult({ status: 'error', message: error.message })
        }
    }

    // --- 4. Test Error Book Save (/api/error-book) ---
    const testErrorBookSave = async () => {
        setErrorBookResult({ status: 'pending' })
        try {
            // We need a valid question ID usually.
            // If we use a fake ID that doesn't exist in seed_questions or pack_questions, it might fail.
            // However, the error logic tries to look it up.
            // Let's try to pass a known ID if possible, or expect a "Not Found" error which confirms the API is reached.
            // Or better, we can inject a dummy if we had access, but we don't.
            // In the `PVEResultModal`, it sends `questionId` and `source`.

            // Let's try with a made-up ID and see if we get the 404 QUESTION_NOT_FOUND, 
            // which confirms the route is working (logic-wise).
            const fakeId = "00000000-0000-0000-0000-000000000000"

            const payload = {
                questionId: fakeId,
                source: 'practice'
            }

            const res = await fetch('/api/error-book', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            })

            const data = await res.json()

            if (!res.ok) {
                if (res.status === 404 && data.error === 'QUESTION_NOT_FOUND') {
                    setErrorBookResult({
                        status: 'success',
                        message: 'API Reached (Got expected 404 for fake ID)',
                        data
                    })
                } else {
                    throw new Error(data.message || data.error || 'Failed')
                }
            } else {
                setErrorBookResult({ status: 'success', message: 'Saved to Error Book', data })
            }

        } catch (error: any) {
            setErrorBookResult({ status: 'error', message: error.message })
        }
    }

    return (
        <div className="space-y-8 p-6 max-w-4xl mx-auto">
            <h1 className="text-3xl font-bold mb-6">🎒 Backpack Logic Tester</h1>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* 1. Notebook Save */}
                <Card>
                    <CardHeader>
                        <CardTitle>Notebook Save</CardTitle>
                        <CardDescription>/api/notebook/save</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="flex gap-2">
                            <Button onClick={() => testNotebookSave(false)} disabled={notebookResult.status === 'pending'}>
                                Save New Note
                            </Button>
                            <Button variant="outline" onClick={() => testNotebookSave(true)} disabled={notebookResult.status === 'pending'}>
                                Save Duplicate
                            </Button>
                        </div>
                        <ResultDisplay result={notebookResult} />
                    </CardContent>
                </Card>

                {/* 2. RAG Summary Save */}
                <Card>
                    <CardHeader>
                        <CardTitle>RAG Summary Save</CardTitle>
                        <CardDescription>/api/backpack/save</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <Button onClick={testRagSave} disabled={ragSaveResult.status === 'pending'}>
                            Test RAG Save
                        </Button>
                        <ResultDisplay result={ragSaveResult} />
                    </CardContent>
                </Card>

                {/* 3. Vocabulary Save */}
                <Card>
                    <CardHeader>
                        <CardTitle>Vocabulary Save</CardTitle>
                        <CardDescription>/api/vocabulary/batch-save</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <Button onClick={testVocabSave} disabled={vocabResult.status === 'pending'}>
                            Test Vocab Batch
                        </Button>
                        <ResultDisplay result={vocabResult} />
                    </CardContent>
                </Card>

                {/* 4. Error Book Save */}
                <Card>
                    <CardHeader>
                        <CardTitle>Error Book Save</CardTitle>
                        <CardDescription>/api/error-book</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <Button onClick={testErrorBookSave} disabled={errorBookResult.status === 'pending'}>
                            Test Error Book (Fake ID)
                        </Button>
                        <ResultDisplay result={errorBookResult} />
                    </CardContent>
                </Card>
            </div>
        </div>
    )
}

function ResultDisplay({ result }: { result: TestResult }) {
    if (result.status === 'idle') return <div className="text-sm text-gray-500">Ready to test</div>

    return (
        <div className={`p-3 rounded-lg text-sm border ${result.status === 'success' ? 'bg-green-50 border-green-200 text-green-800' :
            result.status === 'error' ? 'bg-red-50 border-red-200 text-red-800' :
                'bg-blue-50 border-blue-200 text-blue-800'
            }`}>
            <div className="flex items-center gap-2 font-semibold mb-1">
                {result.status === 'pending' && <Loader2 className="w-4 h-4 animate-spin" />}
                {result.status === 'success' && <CheckCircle2 className="w-4 h-4 text-green-600" />}
                {result.status === 'error' && <XCircle className="w-4 h-4 text-red-600" />}
                <span>{result.status.toUpperCase()}</span>
            </div>
            {result.message && <div className="mb-2">{result.message}</div>}
            {result.data && (
                <pre className="bg-white/50 p-2 rounded overflow-x-auto text-xs font-mono">
                    {JSON.stringify(result.data, null, 2)}
                </pre>
            )}
        </div>
    )
}
