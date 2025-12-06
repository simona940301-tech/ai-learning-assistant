import { Word, User } from './types/game';

export const MOCK_USER: User = {
    id: 'user_123',
    favorite_artists: ['Taylor Swift', 'Jay Chou', 'BTS'],
};

export const MOCK_WORDS: Word[] = [
    {
        id: '1',
        text: 'Fearless',
        pos: 'adj.',
        level: 'Level 3',
        definition_zh: '無所畏懼的',
        example_en: 'He was a fearless leader who inspired his troops.',
        lyric_snippet: {
            artist: 'Taylor Swift',
            line: 'In a storm in my best dress, fearless',
            song: 'Fearless',
        },
    },
    {
        id: '2',
        text: 'Enchanted',
        pos: 'adj.',
        level: 'Level 3',
        definition_zh: '著迷的；被施魔法的',
        example_en: 'She was enchanted by the beauty of the garden.',
        lyric_snippet: {
            artist: 'Taylor Swift',
            line: 'I was enchanted to meet you',
            song: 'Enchanted',
        },
    },
    {
        id: '3',
        text: 'Euphoria',
        pos: 'n.',
        level: 'Level 4',
        definition_zh: '極度興奮；愉悅',
        example_en: 'The fans were in a state of euphoria after the concert.',
        lyric_snippet: {
            artist: 'BTS',
            line: 'You are the cause of my euphoria',
            song: 'Euphoria',
        },
    },
    {
        id: '4',
        text: 'Silence',
        pos: 'n.',
        level: 'Level 2',
        definition_zh: '沈默；寂靜',
        example_en: 'The silence in the library was broken by a cough.',
        lyric_snippet: {
            artist: 'Jay Chou',
            line: '連沈默都是一種愛 (Even silence is a form of love)',
            song: 'Silent',
        },
    },
    {
        id: '5',
        text: 'Delicate',
        pos: 'adj.',
        level: 'Level 3',
        definition_zh: '脆弱的；精緻的',
        example_en: 'The flower is very delicate and needs special care.',
        lyric_snippet: {
            artist: 'Taylor Swift',
            line: 'Is it cool that I said all that? Is it chill that you\'re in my head? \'Cause I know that it\'s delicate',
            song: 'Delicate',
        },
    },
    {
        id: '6',
        text: 'Cruel',
        pos: 'adj.',
        level: 'Level 2',
        definition_zh: '殘忍的',
        example_en: 'Life can be cruel sometimes.',
        lyric_snippet: {
            artist: 'Taylor Swift',
            line: 'Devils roll the dice, angels roll their eyes, what doesn\'t kill me makes me want you more',
            song: 'Cruel Summer',
        },
    },
    {
        id: '7',
        text: 'Dynamite',
        pos: 'n.',
        level: 'Level 3',
        definition_zh: '炸藥；具爆炸性的事物',
        example_en: 'The news was absolute dynamite.',
        lyric_snippet: {
            artist: 'BTS',
            line: 'Light it up like dynamite',
            song: 'Dynamite',
        },
    },
    {
        id: '8',
        text: 'Karma',
        pos: 'n.',
        level: 'Level 3',
        definition_zh: '業障；因果報應',
        example_en: 'He believes that bad luck is just bad karma.',
        lyric_snippet: {
            artist: 'Taylor Swift',
            line: 'Karma is a god, Karma is the breeze in my hair on the weekend',
            song: 'Karma',
        },
    },
];
