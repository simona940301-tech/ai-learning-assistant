export interface StyleExample {
    question: string;
    options: string[];
    correct: string;
    explanation: string;
    difficulty: number;
    tags: string[];
}

export const STYLE_LIBRARY: Record<string, StyleExample[]> = {
    "English": [
        {
            "question": "Mangoes are a _____ fruit that grows in tropical regions.",
            "options": [
                "mature",
                "usual",
                "seasonal",
                "particular"
            ],
            "correct": "C",
            "explanation": "核心考點：形容詞詞義辨析。題幹翻譯：芒果是一種生長在熱帶地區的_____水果。判斷詞義：seasonal 表示季節性的，符合題意。",
            "difficulty": 3,
            "tags": ["英文-詞彙題", "英文-自然/季節"]
        },
        {
            "question": "The teacher asked the students to _____ their homework before class.",
            "options": [
                "turn in",
                "turn on",
                "turn off",
                "turn up"
            ],
            "correct": "A",
            "explanation": "核心考點：片語動詞 turn in 的用法。題幹翻譯：老師要求學生在上課前_____作業。判斷詞義：turn in 表示繳交，符合題意。",
            "difficulty": 2,
            "tags": ["英文-片語動詞"]
        },
        {
            "question": "The company decided to _____ the project due to budget constraints.",
            "options": [
                "abandon",
                "continue",
                "expand",
                "promote"
            ],
            "correct": "A",
            "explanation": "核心考點：動詞詞義辨析與商業情境。題幹翻譯：由於預算限制，公司決定_____這個專案。判斷詞義：abandon 表示放棄，符合預算限制的情境。",
            "difficulty": 3,
            "tags": ["英文-詞彙題", "英文-商業用語"]
        },
        {
            "question": "Despite the heavy rain, the marathon _____ as scheduled.",
            "options": [
                "canceled",
                "proceeded",
                "postponed",
                "delayed"
            ],
            "correct": "B",
            "explanation": "核心考點：轉折語氣與動詞選擇。題幹翻譯：儘管下大雨，馬拉松仍然按計劃_____。判斷詞義：Despite 表示轉折，proceeded 表示繼續進行，符合題意。",
            "difficulty": 3,
            "tags": ["英文-詞彙題", "英文-轉折語氣"]
        },
        {
            "question": "The scientist's research has _____ contributed to our understanding of climate change.",
            "options": [
                "significantly",
                "slightly",
                "rarely",
                "never"
            ],
            "correct": "A",
            "explanation": "核心考點：副詞修飾與學術語境。題幹翻譯：這位科學家的研究_____地促進了我們對氣候變遷的理解。判斷詞義：significantly 表示顯著地，符合學術成就的正面描述。",
            "difficulty": 2,
            "tags": ["英文-副詞用法", "英文-學術用語"]
        }
    ]
};
