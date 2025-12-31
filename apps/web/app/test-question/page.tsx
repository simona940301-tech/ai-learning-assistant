'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import ExplainCardV2 from '@/components/solve/ExplainCardV2'
import { supabaseBrowserClient } from '@/lib/supabase'
import { AuthGuard } from '@/components/auth/AuthGuard'

export default function TestQuestionPage() {
  const [question, setQuestion] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    loadTestQuestion()
  }, [])

  const loadTestQuestion = async () => {
    try {
      setLoading(true)

      // Fetch the test question from our test pack
      const { data, error } = await supabaseBrowserClient
        .from('pack_questions')
        .select('*')
        .eq('stem', 'The Taiwanese national health insurance (NHI) scheme is ranked one of the best in the world. In 1995, the system was (1) in Taiwan, a small island with a population of roughly 23 million. What does (1) most likely refer to?')
        .single()

      if (error) {
        throw error
      }

      if (!data) {
        throw new Error('Test question not found. Please run SEED_TEST_PACKS_QUESTIONS.sql first.')
      }

      setQuestion(data)
    } catch (err) {
      console.error('Failed to load test question:', err)
      setError(err instanceof Error ? err.message : 'Failed to load question')
    } finally {
      setLoading(false)
    }
  }

  return (
    <AuthGuard requireAuth={true}>
      {loading ? (
        <div className="h-screen overflow-y-auto bg-zinc-950 p-4">
          <div className="max-w-4xl mx-auto">
            <Card className="bg-zinc-900 border-zinc-800">
              <CardContent className="p-6">
                <div className="text-center">
                  <div className="h-8 w-8 rounded-full bg-blue-500 animate-pulse mx-auto mb-4" />
                  <p className="text-zinc-400">Loading test question...</p>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      ) : error || !question ? (
        <div className="h-screen overflow-y-auto bg-zinc-950 p-4">
          <div className="max-w-4xl mx-auto">
            <Card className="bg-zinc-900 border-zinc-800">
              <CardContent className="p-6">
                <div className="text-center">
                  <h1 className="text-xl font-bold text-white mb-4">Test Question Setup</h1>
                  <p className="text-red-400 mb-4">{error}</p>
                  <div className="text-left text-zinc-400 text-sm">
                    <p className="mb-2">To set up the test question:</p>
                    <ol className="list-decimal list-inside space-y-1">
                      <li>Run the SQL script: <code className="bg-zinc-800 px-2 py-1 rounded">SEED_TEST_PACKS_QUESTIONS.sql</code></li>
                      <li>Make sure migrations are applied</li>
                      <li>Refresh this page</li>
                    </ol>
                  </div>
                  <Button onClick={loadTestQuestion} className="mt-4">
                    Retry
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      ) : (
        <div className="h-screen bg-zinc-950 p-4 overflow-y-auto">
          <div className="max-w-4xl mx-auto space-y-6 pb-24">
            {/* Test Question Info */}
            <Card className="bg-zinc-900 border-zinc-800">
              <CardHeader>
                <CardTitle className="text-white flex items-center gap-2">
                  🧪 Test Question: Error Book Integration
                  <span className="text-xs bg-blue-500/20 text-blue-300 px-2 py-1 rounded">
                    ID: {question.id}
                  </span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div>
                    <h3 className="text-zinc-300 font-medium mb-2">Question:</h3>
                    <p className="text-zinc-100 bg-zinc-800 p-3 rounded">{question.stem}</p>
                  </div>

                  <div>
                    <h3 className="text-zinc-300 font-medium mb-2">Options:</h3>
                    <div className="space-y-1">
                      {question.choices.map((choice: string, index: number) => (
                        <div key={index} className="text-zinc-100 bg-zinc-800 p-2 rounded">
                          ({String.fromCharCode(65 + index)}) {choice}
                        </div>
                      ))}
                    </div>
                  </div>

                  <div>
                    <h3 className="text-zinc-300 font-medium mb-2">Correct Answer:</h3>
                    <p className="text-green-400 font-bold">{question.answer}</p>
                  </div>

                  <div className="bg-blue-500/10 border border-blue-500/20 p-4 rounded">
                    <p className="text-blue-300 text-sm">
                      💡 <strong>Testing Instructions:</strong> Click &ldquo;加入錯題本&rdquo; below to test the error book integration. This should
                      create an entry in the error_book table with question_id = <code>{question.id}</code>
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* ExplainCardV2 with questionId */}
            <div className="sticky bottom-0 sm:static sm:relative">
              <ExplainCardV2
                inputText={question.stem}
                questionId={question.id}
                onLoadingChange={(isLoading) => {
                  // Optional: handle loading state
                }}
              />
            </div>
          </div>
        </div>
      )}
    </AuthGuard>
  )
}
