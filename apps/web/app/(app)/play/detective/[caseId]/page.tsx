'use client'

import React, { useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useDetectiveStore } from '@/lib/detective/store'
import { CaseFileViewer } from '@/components/detective/CaseFileViewer'
import { EvidenceBoard } from '@/components/detective/EvidenceBoard'
import { DashboardWidget } from '@/components/detective/DashboardWidget'
import { NarrativeFeedback } from '@/components/detective/NarrativeFeedback'
import { DetectiveCase } from '@/lib/detective/types'
import { Button } from '@/components/ui/button'
import { ArrowLeft } from 'lucide-react'
import { DetectiveCelebration } from '@/components/detective/DetectiveCelebration'

// Mock Data for Development (Replace with API fetch later)
const MOCK_CASE: DetectiveCase = {
    id: 'case-001',
    title: 'The Silent Witness',
    description: 'A locked room mystery in the old manor.',
    difficulty: 3,
    initialQuota: 5,
    initialBudget: 800,
    content: [
        { id: 'p1', text: 'The clock struck midnight. Rain lashed against the windowpane, drowning out the silence of the study.' },
        { id: 'p2', text: 'Detective Miller examined the desk. A half-empty glass of scotch sat on a coaster, condensation pooling at its base.' },
        { id: 'p3', text: '"He never drank scotch," the widow sobbed, clutching her handkerchief. "He was a gin man, through and through."' },
        { id: 'p4', text: 'Miller raised an eyebrow. The bottle on the shelf was indeed a rare single malt, opened recently.' },
        { id: 'p5', text: '', isImage: true, imageUrl: 'https://placehold.co/600x400/1a1a1a/FFF?text=Crime+Scene+Photo' }
    ],
    questions: [
        {
            id: 'q1',
            text: 'What inconsistency suggests the victim might not have poured the drink himself?',
            requiredEvidenceCount: 2,
            standardEvidence: [
                "He never drank scotch",
                "He was a gin man",
                "The bottle on the shelf was indeed a rare single malt"
            ]
        }
    ]
}

export default function DetectiveGamePage() {
    const params = useParams()
    const router = useRouter()
    const { initializeCase, resetGame } = useDetectiveStore()
    const [showCelebration, setShowCelebration] = React.useState(false)
    const [lastAccuracy, setLastAccuracy] = React.useState(0)

    useEffect(() => {
        // In a real app, fetch case data based on params.caseId
        // For now, use mock data
        initializeCase(MOCK_CASE)

        return () => {
            resetGame()
        }
    }, [initializeCase, resetGame, params.caseId])

    return (
        <div className="min-h-screen bg-[#0f172a] text-slate-200 flex flex-col overflow-hidden">
            {/* Top Bar */}
            <header className="h-14 border-b border-slate-800 flex items-center px-4 justify-between bg-[#0f172a] z-50">
                <div className="flex items-center gap-4">
                    <Button variant="ghost" size="icon" onClick={() => router.back()} className="text-slate-400 hover:text-white">
                        <ArrowLeft className="w-5 h-5" />
                    </Button>
                    <h1 className="font-serif text-lg font-bold tracking-wide text-amber-500">
                        CASE #{params.caseId} {/* {MOCK_CASE.title} */}
                    </h1>
                </div>

                <DashboardWidget />
            </header>

            {/* Main Layout */}
            <main className="flex-1 flex flex-col md:flex-row overflow-hidden relative">
                {/* Left/Top: Case File (Scrollable) */}
                <section className="flex-1 md:w-1/2 h-1/2 md:h-full overflow-y-auto border-r border-slate-800 bg-[#1e293b]">
                    <div className="max-w-2xl mx-auto py-8">
                        <div className="px-6 mb-6">
                            <h2 className="text-2xl font-serif font-bold text-slate-100 mb-2">Case File</h2>
                            <p className="text-sm text-slate-400 italic">{MOCK_CASE.description}</p>
                        </div>
                        <CaseFileViewer paragraphs={MOCK_CASE.content} />
                    </div>
                </section>

                {/* Right/Bottom: Evidence Board (Fixed) */}
                <section className="flex-1 md:w-1/2 h-1/2 md:h-full relative bg-[#0f172a]">
                    <EvidenceBoard className="w-full h-full" />

                    {/* Action Bar (Overlay at bottom of board) */}
                    <div className="absolute bottom-6 right-6 flex gap-2">
                        <Button
                            className="bg-amber-600 hover:bg-amber-700 text-white font-bold shadow-lg"
                            onClick={async () => {
                                const { highlightedEvidence, boardItems } = useDetectiveStore.getState()
                                const evidenceOnBoard = boardItems.map(item =>
                                    highlightedEvidence.find(e => e.id === item.evidenceId)?.text
                                ).filter(Boolean)

                                if (evidenceOnBoard.length === 0) {
                                    useDetectiveStore.getState().addNarrativeLog({
                                        speaker: 'Old Detective',
                                        message: "You haven't pinned anything to the board yet, rookie. Don't waste my time.",
                                        type: 'warning'
                                    })
                                    return
                                }

                                const currentCase = MOCK_CASE // In real app, get from store
                                const currentQuestion = currentCase.questions[0] // For MVP, just first question

                                // Call the new 3-Tier Validation API
                                try {
                                    const response = await fetch('/api/detective/validate-evidence', {
                                        method: 'POST',
                                        headers: { 'Content-Type': 'application/json' },
                                        body: JSON.stringify({
                                            question: currentQuestion.text,
                                            userHighlight: evidenceOnBoard.join(' '), // simplified for MVP
                                            passage: currentCase.content.map(p => p.text).join('\n'),
                                            standardEvidence: currentQuestion.standardEvidence || []
                                        })
                                    })

                                    const data = await response.json()

                                    useDetectiveStore.getState().addNarrativeLog({
                                        speaker: 'Old Detective',
                                        message: data.feedback,
                                        type: data.isValid ? 'success' : 'error'
                                    })

                                    if (data.isValid) {
                                        // Case solved!
                                        setLastAccuracy(Math.round(data.confidence * 100))
                                        setTimeout(() => setShowCelebration(true), 1500)
                                    }
                                } catch (error) {
                                    console.error('Validation error:', error)
                                    useDetectiveStore.getState().addNarrativeLog({
                                        speaker: 'System',
                                        message: "Comm link failure. Try again.",
                                        type: 'error'
                                    })
                                }
                            }}
                        >
                            SUBMIT FINDINGS
                        </Button>
                    </div>
                </section>
            </main>

            {/* Celebration Overlay */}
            {showCelebration && (
                <DetectiveCelebration
                    caseTitle={MOCK_CASE.title}
                    difficulty={MOCK_CASE.difficulty}
                    accuracy={lastAccuracy}
                    onClose={() => {
                        setShowCelebration(false)
                        router.push('/play')
                    }}
                />
            )}

            {/* Narrative Feedback Overlay */}
            <NarrativeFeedback />
        </div>
    )
}
