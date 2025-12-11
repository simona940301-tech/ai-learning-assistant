export interface DetectiveCase {
    id: string
    title: string
    description: string
    difficulty: 1 | 2 | 3 | 4 | 5
    content: CaseParagraph[]
    questions: CaseQuestion[]
    initialQuota: number
    initialBudget: number // e.g., 800 (¥)
}

export interface CaseParagraph {
    id: string
    text: string
    isImage?: boolean
    imageUrl?: string
}

export interface CaseQuestion {
    id: string
    text: string
    requiredEvidenceCount: number
    correctEvidenceIds?: string[] // For basic validation if needed locally, though AI is primary
    standardEvidence?: string[] // For 3-tier validation (Exact match & Semantic embedding source)
}

export interface Evidence {
    id: string
    text: string
    paragraphId: string
    startOffset: number
    endOffset: number
    isCorrect?: boolean // Result from AI analysis
    aiFeedback?: string // Narrative feedback from AI
}

export interface EvidenceBoardItem {
    id: string
    evidenceId: string
    x: number
    y: number
    rotation: number // For that "messy desk" feel
}

export interface NarrativeLogItem {
    id: string
    timestamp: number
    speaker: 'System' | 'Old Detective' | 'Chief'
    message: string
    type: 'info' | 'warning' | 'error' | 'success'
}

export interface GameState {
    caseId: string | null
    currentQuota: number
    currentBudget: number
    highlightedEvidence: Evidence[] // All evidence found in text
    boardItems: EvidenceBoardItem[] // Evidence placed on the board
    narrativeLog: NarrativeLogItem[]
    isAnalyzing: boolean
    gameStatus: 'investigating' | 'submitting' | 'closed'
}
