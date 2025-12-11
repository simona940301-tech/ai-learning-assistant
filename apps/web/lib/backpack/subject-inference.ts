/**
 * Unified Subject Inference Utility
 * 
 * Provides consistent subject classification across the backpack system.
 * Priority: Direct field > tags > folder > canonical_skill > default
 */

export type Subject = 'chinese' | 'english' | 'math' | 'science' | 'social';

const SUBJECT_MAP: Record<string, Subject> = {
    '英文': 'english',
    'english': 'english',
    '數學': 'math',
    'math': 'math',
    '國文': 'chinese',
    'chinese': 'chinese',
    '社會': 'social',
    'social': 'social',
    '自然': 'science',
    'science': 'science',
};

const SUBJECT_KEYWORDS: Record<Subject, string[]> = {
    english: ['英', '文法', '單字', 'grammar', 'vocabulary', 'vocab'],
    math: ['數', '幾何', '代數', '微積分', 'calculus', 'algebra', 'geometry'],
    chinese: ['國', '古文', '文言文', '詩詞', '國文'],
    science: ['理', '化', '生', '物理', '化學', '生物', '地科', 'physics', 'chemistry', 'biology'],
    social: ['史', '地', '公', '歷史', '地理', '公民', 'history', 'geography'],
};

interface SubjectInferenceData {
    subject?: string | null;
    tags?: string[] | null;
    folder?: string | null;
    canonical_skill?: string | null;
}

/**
 * Infer subject from various data sources
 * 
 * @param data - Object containing potential subject indicators
 * @returns Inferred subject, defaults to 'math' if no match found
 * 
 * @example
 * inferSubject({ subject: 'english' }) // => 'english'
 * inferSubject({ tags: ['英文', 'vocabulary'] }) // => 'english'
 * inferSubject({ canonical_skill: '數學-幾何' }) // => 'math'
 */
export function inferSubject(data: SubjectInferenceData): Subject {
    // 1. Direct subject field (highest priority)
    if (data.subject && SUBJECT_MAP[data.subject]) {
        return SUBJECT_MAP[data.subject];
    }

    // 2. Tags array
    if (data.tags && Array.isArray(data.tags)) {
        for (const tag of data.tags) {
            if (SUBJECT_MAP[tag]) {
                return SUBJECT_MAP[tag];
            }
        }
    }

    // 3. Folder field
    if (data.folder && SUBJECT_MAP[data.folder]) {
        return SUBJECT_MAP[data.folder];
    }

    // 4. Canonical skill (keyword matching)
    if (data.canonical_skill) {
        for (const [subject, keywords] of Object.entries(SUBJECT_KEYWORDS)) {
            if (keywords.some(kw => data.canonical_skill!.includes(kw))) {
                return subject as Subject;
            }
        }
    }

    // 5. Default fallback
    return 'math';
}

/**
 * Validate if a string is a valid subject
 */
export function isValidSubject(value: unknown): value is Subject {
    return typeof value === 'string' &&
        ['chinese', 'english', 'math', 'science', 'social'].includes(value);
}

/**
 * Get display name for subject
 */
export function getSubjectDisplayName(subject: Subject): string {
    const displayNames: Record<Subject, string> = {
        chinese: '國文',
        english: '英文',
        math: '數學',
        science: '自然',
        social: '社會',
    };
    return displayNames[subject];
}
