-- Create words table for Lyrical Flow
CREATE TABLE IF NOT EXISTS public.words (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    text TEXT NOT NULL UNIQUE,
    phonetic_us TEXT,
    pos TEXT NOT NULL,
    level INTEGER DEFAULT 3, -- CEFR Level or Exam Level (2, 3, 4)
    definition_zh TEXT NOT NULL,
    definition_en TEXT NOT NULL,
    example_sentence TEXT NOT NULL,
    example_translation TEXT NOT NULL,
    lyric_match JSONB, -- Stores { artist, song_title, lyric_snippet }
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for faster search
CREATE INDEX IF NOT EXISTS words_text_idx ON public.words (text);
CREATE INDEX IF NOT EXISTS words_level_idx ON public.words (level);
