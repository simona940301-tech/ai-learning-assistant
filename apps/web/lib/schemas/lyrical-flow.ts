import { z } from 'zod';

export const LyricMatchSchema = z.object({
    artist: z.string(),
    song_title: z.string(),
    lyric_snippet: z.string(),
});

export const WordDataSchema = z.object({
    word: z.string(),
    phonetic_us: z.string(),
    pos: z.string(),
    definition_zh: z.string().describe("Concise Traditional Chinese definition (Taiwan usage)"),
    definition_en: z.string().describe("Simple English definition"),
    example_sentence: z.string().describe("A clear sentence using the word (B2/C1 level)"),
    example_translation: z.string().describe("Chinese translation of the sentence"),
    lyric_match: LyricMatchSchema.nullable().optional().describe("Lyric info if found, null otherwise"),
});

export type WordData = z.infer<typeof WordDataSchema>;
