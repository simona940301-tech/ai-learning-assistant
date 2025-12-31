/**
 * Backpack Data Validation Schemas
 * 
 * Provides Zod schemas for validating backpack-related data
 */

import { z } from 'zod';

export const SubjectSchema = z.enum(['chinese', 'english', 'math', 'science', 'social']);

export const SourceTypeSchema = z.enum(['summary', 'qa', 'manual', 'explain', 'vocabulary']);

export const NotebookEntrySchema = z.object({
    title: z.string().min(1, '標題不能為空').max(200, '標題過長'),
    content_md: z.string().min(1, '內容不能為空'),
    source_type: SourceTypeSchema,
    subject: SubjectSchema,
    tags: z.array(z.string()).optional(),
    folder: z.string().optional(),
    skill_tags: z.array(z.string()).optional(),
});

export const BackpackSaveSchema = z.object({
    title: z.string().min(1, '標題不能為空').max(200, '標題過長'),
    content: z.string().min(1, '內容不能為空'),
    subject: SubjectSchema,
    source_type: z.enum(['summary', 'qa', 'explain']),
    tags: z.array(z.string()).optional(),
    skill_tags: z.array(z.string()).optional(),
});

export const VocabularyWordSchema = z.object({
    id: z.string(),
    text: z.string().min(1),
    definition_zh: z.string(),
    example_en: z.string(),
    pos: z.string(),
    level: z.string(),
    lyric_snippet: z.object({
        artist: z.string().optional().nullable(),
        song: z.string().optional().nullable(),
        line: z.string().optional().nullable(),
    }).optional().nullable(),
});

export const ErrorBookEntrySchema = z.object({
    questionId: z.string().uuid('無效的題目 ID'),
    source: z.enum(['battle', 'practice'], {
        errorMap: () => ({ message: '來源必須是 battle 或 practice' })
    }),
});

export type NotebookEntry = z.infer<typeof NotebookEntrySchema>;
export type BackpackSave = z.infer<typeof BackpackSaveSchema>;
export type VocabularyWord = z.infer<typeof VocabularyWordSchema>;
export type ErrorBookEntry = z.infer<typeof ErrorBookEntrySchema>;
