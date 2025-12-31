import { useReducer } from 'react'

/**
 * Document Group from Router Classification
 */
export interface DocumentGroup {
    subject: string
    documentIds: string[]
    confidence: number
    reasoning?: string
}

/**
 * State Machine States
 */
export type WorkbenchStatus = 'IDLE' | 'UPLOADING' | 'CLASSIFYING' | 'ANALYSIS' | 'ERROR'

/**
 * State Definition
 */
interface WorkbenchState {
    status: WorkbenchStatus
    uploadProgress: number
    uploadedDocIds: string[]
    documentGroups: DocumentGroup[]
    error: string | null
    errorType: 'UPLOAD' | 'CLASSIFICATION' | 'UNKNOWN' | null
}

/**
 * Initial State
 */
const initialState: WorkbenchState = {
    status: 'IDLE',
    uploadProgress: 0,
    uploadedDocIds: [],
    documentGroups: [],
    error: null,
    errorType: null,
}

/**
 * Actions
 */
type WorkbenchAction =
    | { type: 'START_UPLOAD' }
    | { type: 'SET_UPLOAD_PROGRESS'; payload: number }
    | { type: 'UPLOAD_COMPLETE'; payload: string[] }
    | { type: 'START_CLASSIFY' }
    | { type: 'CLASSIFY_COMPLETE'; payload: DocumentGroup[] }
    | { type: 'SET_ERROR'; payload: { message: string; type: WorkbenchState['errorType'] } }
    | { type: 'RESET' }

/**
 * Reducer
 */
function workbenchReducer(state: WorkbenchState, action: WorkbenchAction): WorkbenchState {
    switch (action.type) {
        case 'START_UPLOAD':
            return {
                ...initialState,
                status: 'UPLOADING',
            }
        case 'SET_UPLOAD_PROGRESS':
            return {
                ...state,
                uploadProgress: action.payload,
            }
        case 'UPLOAD_COMPLETE':
            return {
                ...state,
                uploadedDocIds: action.payload,
                // If only 1 file, skip classifying and go straight to analysis (conceptually)
                // But the UI might want to show "Classifying" briefly or handle it in the effect.
                // For now, we just update data, the next dispatch determines the state.
            }
        case 'START_CLASSIFY':
            return {
                ...state,
                status: 'CLASSIFYING',
                uploadProgress: 100,
            }
        case 'CLASSIFY_COMPLETE':
            return {
                ...state,
                status: 'ANALYSIS',
                documentGroups: action.payload,
            }
        case 'SET_ERROR':
            return {
                ...state,
                status: 'ERROR',
                error: action.payload.message,
                errorType: action.payload.type,
                uploadProgress: 0,
            }
        case 'RESET':
            return initialState
        default:
            return state
    }
}

/**
 * Custom Hook
 */
export function useSummaryWorkbench() {
    const [state, dispatch] = useReducer(workbenchReducer, initialState)

    return {
        state,
        dispatch,
        // Helper actions
        startUpload: () => dispatch({ type: 'START_UPLOAD' }),
        setUploadProgress: (progress: number) => dispatch({ type: 'SET_UPLOAD_PROGRESS', payload: progress }),
        uploadComplete: (docIds: string[]) => dispatch({ type: 'UPLOAD_COMPLETE', payload: docIds }),
        startClassify: () => dispatch({ type: 'START_CLASSIFY' }),
        classifyComplete: (groups: DocumentGroup[]) => dispatch({ type: 'CLASSIFY_COMPLETE', payload: groups }),
        setError: (message: string, type: WorkbenchState['errorType'] = 'UNKNOWN') =>
            dispatch({ type: 'SET_ERROR', payload: { message, type } }),
        reset: () => dispatch({ type: 'RESET' }),
    }
}
