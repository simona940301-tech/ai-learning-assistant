export interface User {
    id: string;
    favorite_artists: string[];
}

export interface LyricSnippet {
    artist: string;
    line: string;
    song: string;
}

export interface Word {
    id: string;
    text: string;
    pos: string; // Part of Speech (e.g., v., adj.)
    level: string; // CEFR/Exam level
    definition_zh: string;
    example_en: string;
    lyric_snippet?: LyricSnippet;
    is_saved?: boolean;
}

export interface Progress {
    user_id: string;
    word_id: string;
    status: 'mastered' | 'review';
    is_bookmarked: boolean;
    next_review_date: Date;
}
