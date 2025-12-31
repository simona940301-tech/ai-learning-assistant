/**
 * Question Sets Type Definitions
 * Phase 2: Question Set Store & Management System
 */

// ============================================
// Core Types
// ============================================

export type CreatorType = 'OFFICIAL' | 'TEACHER' | 'COMMUNITY' | 'RAG'
export type SourceType = 'MANUAL' | 'SEED_QUESTIONS' | 'UGC' | 'RAG'
export type QuestionSource = 'seed_questions' | 'pack_questions' | 'ugc_questions'
export type Subject = 'chinese' | 'english' | 'math' | 'science' | 'social' | 'mixed'
export type DifficultyLevel = 1 | 2 | 3 | 4 | 5
export type QuestionSetStatus = 'DRAFT' | 'PUBLISHED' | 'ARCHIVED' | 'DELETED'

// ============================================
// Database Schema Types
// ============================================

/**
 * 題本集合 - question_sets 表
 */
export interface QuestionSet {
    id: string
    title: string
    description: string | null
    cover_image_url: string | null

    // 創建者資訊
    creator_id: string | null
    creator_type: CreatorType

    // 題本來源
    source_type: SourceType
    source_metadata: Record<string, any>

    // 題目配置
    question_ids: string[]
    question_source: QuestionSource
    total_questions: number

    // 分類標籤
    subject: Subject | null
    difficulty_level: DifficultyLevel | null
    tags: string[]

    // 商店配置
    is_public: boolean
    is_featured: boolean
    price: number

    // 統計數據
    downloads: number
    rating: number
    review_count: number

    // 審計欄位
    created_at: string
    updated_at: string
    published_at: string | null

    // 狀態管理
    status: QuestionSetStatus
}

/**
 * 用戶已下載題本 - user_question_sets 表
 */
export interface UserQuestionSet {
    id: string
    user_id: string
    set_id: string

    // 下載資訊
    downloaded_at: string
    last_practiced_at: string | null

    // 學習進度
    progress_data: ProgressData
    practice_count: number

    // 個人化設定
    is_favorite: boolean
    custom_tags: string[]
    notes: string | null
}

/**
 * 題本評論 - question_set_reviews 表
 */
export interface QuestionSetReview {
    id: string
    set_id: string
    user_id: string
    rating: 1 | 2 | 3 | 4 | 5
    review_text: string | null
    created_at: string
    updated_at: string
}

// ============================================
// Progress Data
// ============================================

export interface ProgressData {
    completed: number
    total: number
    correct_rate: number
    last_question_index?: number
    completed_question_ids?: string[]
}

// ============================================
// API Response Types
// ============================================

/**
 * GET /api/store/question-sets Response
 */
export interface StoreQuestionSetsResponse {
    sets: QuestionSetWithDownloadStatus[]
    total: number
    page: number
    pages: number
    limit: number
}

/**
 * 題本 + 已下載狀態
 */
export interface QuestionSetWithDownloadStatus extends QuestionSet {
    is_downloaded: boolean
}

/**
 * POST /api/store/question-sets/download Response
 */
export interface DownloadQuestionSetResponse {
    success: boolean
    download: UserQuestionSet
    message: string
    is_duplicate: boolean
}

/**
 * GET /api/user/question-sets Response
 */
export interface UserQuestionSetsResponse {
    sets: UserQuestionSetWithDetails[]
    total: number
}

/**
 * 用戶題本 + 題本詳情
 */
export interface UserQuestionSetWithDetails extends QuestionSet {
    user_download_id: string
    downloaded_at: string
    last_practiced_at: string | null
    progress_data: ProgressData
    practice_count: number
    is_favorite: boolean
    is_downloaded: true
}

// ============================================
// API Request Types
// ============================================

/**
 * GET /api/store/question-sets Query Parameters
 */
export interface StoreQueryParams {
    subject?: Subject | 'all'
    difficulty?: DifficultyLevel
    sort?: 'popular' | 'newest' | 'rating' | 'downloads'
    search?: string
    tags?: string[]
    page?: number
    limit?: number
}

/**
 * POST /api/store/question-sets/download Request Body
 */
export interface DownloadQuestionSetRequest {
    setId: string
}

/**
 * GET /api/user/question-sets Query Parameters
 */
export interface UserQuestionSetsQueryParams {
    subject?: Subject | 'all'
}

// ============================================
// Practice Room Integration
// ============================================

/**
 * Practice Room Source Config for QUESTION_SET
 */
export interface QuestionSetPracticeConfig {
    source_type: 'QUESTION_SET'
    set_id: string
    user_id: string
}

// ============================================
// UI Component Props
// ============================================

/**
 * QuestionSetCard Props
 */
export interface QuestionSetCardProps {
    set: QuestionSetWithDownloadStatus
    onDownload: (setId: string) => Promise<void>
    isDownloading?: boolean
}

/**
 * UserQuestionSetCard Props
 */
export interface UserQuestionSetCardProps {
    set: UserQuestionSetWithDetails
    onStartPractice: (setId: string) => Promise<void>
    isCreatingRoom?: boolean
}

// ============================================
// Utility Types
// ============================================

/**
 * Question Set 過濾選項
 */
export interface QuestionSetFilters {
    subject: Subject | 'all'
    difficulty: DifficultyLevel | null
    sort: 'popular' | 'newest' | 'rating' | 'downloads'
    search: string
    tags: string[]
}

/**
 * Subject 選項
 */
export interface SubjectOption {
    id: Subject | 'all'
    name: string
    icon: any // Lucide icon component
    color?: string
}

// ============================================
// Type Guards
// ============================================

export function isQuestionSet(value: any): value is QuestionSet {
    return (
        typeof value === 'object' &&
        value !== null &&
        typeof value.id === 'string' &&
        typeof value.title === 'string' &&
        Array.isArray(value.question_ids) &&
        typeof value.question_source === 'string'
    )
}

export function isUserQuestionSet(value: any): value is UserQuestionSet {
    return (
        typeof value === 'object' &&
        value !== null &&
        typeof value.id === 'string' &&
        typeof value.user_id === 'string' &&
        typeof value.set_id === 'string' &&
        typeof value.progress_data === 'object'
    )
}

// ============================================
// Helper Functions
// ============================================

/**
 * 計算進度百分比
 */
export function calculateProgressPercent(progressData: ProgressData): number {
    if (progressData.total === 0) return 0
    return Math.round((progressData.completed / progressData.total) * 100)
}

/**
 * 格式化價格
 */
export function formatPrice(price: number): string {
    return price === 0 ? '免費' : `NT$ ${price}`
}

/**
 * 獲取難度標籤
 */
export function getDifficultyLabel(level: DifficultyLevel): string {
    const labels: Record<DifficultyLevel, string> = {
        1: '非常簡單',
        2: '簡單',
        3: '中等',
        4: '困難',
        5: '非常困難'
    }
    return labels[level]
}

/**
 * 獲取科目名稱
 */
export function getSubjectName(subject: Subject): string {
    const names: Record<Subject, string> = {
        chinese: '國文',
        english: '英文',
        math: '數學',
        science: '自然',
        social: '社會',
        mixed: '綜合'
    }
    return names[subject]
}
