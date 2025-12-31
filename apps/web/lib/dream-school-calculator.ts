// apps/web/lib/dream-school-calculator.ts (Updated for V3.5 Multi-Skill Aggregation)

import {
    EnglishRequirement,
    GRADE_CONVERSION_MAP,
    SkillWeights
} from './taiwan-universities';

// --- 常數設定 ---
const MAX_GRADE = 15;
const MIN_QUESTIONS_FOR_VALID_SCORE = 30; // 最小題量門檻
const MAX_BEHAVIOR_BOOST = 10; // 總行為加成最高 10 分

export interface PerformanceData {
    weightedAccuracy: number;  // 難度加權準確率 (0.0 to 1.0)
    totalQuestions: number;
    avgResponseTimeMs: number;
}

export interface SkillPerformanceResult {
    skillName: keyof SkillWeights; // e.g., 'vocabulary', 'grammar'
    performance: PerformanceData;
    grade: number; // U_grade
    readyScore: number; // Academic Ready Score for this skill (0-100)
}

interface FinalCalculationInputs {
    skillResults: SkillPerformanceResult[];
    skillWeights: SkillWeights;
    mockExamLevel: number | null;
    streak: number;
    eloRank: number; // Assuming this is raw ELO rank or percentile (e.g., 0.1)
    minReadyScore: number;
    englishRequirement: EnglishRequirement;
}

// 實用函數：線性內插 (Linear Interpolation)
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

/**
 * 1. Layer 1.2: 將難度加權準確率 (Accuracy_W) 轉換為連續的模擬級分數 (U_grade)
 * 採用分段線性內插，使其最貼近真實級分分佈。
 */
export function simulateEnglishGrade(data: PerformanceData): number {
    const { weightedAccuracy, totalQuestions } = data;

    if (weightedAccuracy > 1.0) {
        console.warn("Weighted accuracy exceeded 1.0, clamping to 1.0.");
    }

    // 確保準確率在 [0, 1] 範圍內
    const clampedAccuracy = Math.min(1.0, Math.max(0, weightedAccuracy));

    let U_grade = 1.0;

    for (let i = 0; i < GRADE_CONVERSION_MAP.length - 1; i++) {
        const lower = GRADE_CONVERSION_MAP[i + 1];
        const upper = GRADE_CONVERSION_MAP[i];

        if (clampedAccuracy >= lower.accuracy && clampedAccuracy < upper.accuracy) {
            const t = (clampedAccuracy - lower.accuracy) / (upper.accuracy - lower.accuracy);
            U_grade = lerp(lower.grade, upper.grade, t);
            break;
        }
    }

    // 處理最高級分 15.0
    if (clampedAccuracy >= GRADE_CONVERSION_MAP[0].accuracy) {
        U_grade = MAX_GRADE;
    }

    // --- 題量不足的處理：限制分數上限 (Volume Factor) ---
    if (totalQuestions < MIN_QUESTIONS_FOR_VALID_SCORE) {
        const volumeFactor = Math.min(1, totalQuestions / MIN_QUESTIONS_FOR_VALID_SCORE);
        U_grade = Math.max(1.0, U_grade * volumeFactor);
    }

    return Math.min(MAX_GRADE, U_grade);
}

/**
 * 2. Layer 1.3: 將模擬級分數映射到單科 Ready Score (0-100)，並應用時間懲罰
 */
export function calculateEnglishReadyScore(
    userGrade: number,
    req: EnglishRequirement,
    avgResponseTimeMs: number
): number {
    const { requiredGradeLevel: T_grade, passScore: P_score, excellentScore: E_score } = req;
    let score: number;

    // --- 級分映射邏輯 (Ready Score) ---
    if (userGrade >= T_grade) {
        // T_grade 到 MAX_GRADE 映射 P_score 到 E_score
        const t = (userGrade - T_grade) / (MAX_GRADE - T_grade);
        score = lerp(P_score, E_score, t);
    } else {
        // 1.0 級分映射 0 分，T_grade 映射 P_score
        const t = (userGrade - 1.0) / (T_grade - 1.0);
        score = lerp(0, P_score, t);
    }

    // --- 速度懲罰 (Time Penalty) ---
    const TARGET_TIME_MS = 30000;
    const MAX_TIME_MS = 45000;
    let speedPenaltyFactor = 1.0;

    if (avgResponseTimeMs > TARGET_TIME_MS && avgResponseTimeMs < MAX_TIME_MS) {
        const excessRatio = (avgResponseTimeMs - TARGET_TIME_MS) / (MAX_TIME_MS - TARGET_TIME_MS);
        speedPenaltyFactor = 1 - (0.08 * excessRatio); // 最多扣 8%
    } else if (avgResponseTimeMs >= MAX_TIME_MS) {
        speedPenaltyFactor = 0.92; // 達到最大懲罰
    }

    return Math.min(100, Math.max(0, score * speedPenaltyFactor));
}

/**
 * 3. Layer 2.1: 模考潛力調整 (Mock Exam Adjustment)
 * 根據 App 表現 (U_grade) 與模考成績 (M_grade) 的差距，微調最終分數 (+/- 5%)
 * * 注意：這裡使用的是**總平均 U_grade**
 */
export function calculateMockExamAdjustment(userGrade: number, mockGrade: number | null): number {
    if (mockGrade === null) return 1.0;

    const deltaGrade = userGrade - mockGrade;
    const MAX_IMPACT = 0.05;

    const clampedDelta = Math.max(-3, Math.min(3, deltaGrade));

    return 1.0 + (clampedDelta / 3) * MAX_IMPACT;
}

/**
 * 4. Layer 2.2: 行為加成 (Behavior Boost)
 */
export function applyBehaviorBoost(streak: number, eloPercentile: number): number {
    let boost = 0;

    if (streak >= 20) boost += 7;
    else if (streak >= 10) boost += 5;
    else if (streak >= 5) boost += 3;
    else if (streak >= 1) boost += 1;

    // 假設 eloPercentile 是 0.0 (Top) 到 1.0 (Bottom)
    if (eloPercentile <= 0.1) boost += 3;
    else if (eloPercentile <= 0.3) boost += 2;
    else if (eloPercentile <= 0.5) boost += 1;

    return Math.min(MAX_BEHAVIOR_BOOST, boost);
}


// --- V3.5 頂尖聚合函數：計算總 Ready Score ---

/**
 * 5. 聚合所有技能的 Ready Score，並應用 L2 調整，得出最終總分。
 */
export function calculateDreamSchoolReadyScore(inputs: FinalCalculationInputs) {
    const {
        skillResults,
        skillWeights,
        mockExamLevel,
        streak,
        eloRank,
        minReadyScore,
        englishRequirement // 暫時只看英文要求
    } = inputs;

    let weightedAcademicScoreSum = 0;
    let totalWeight = 0;
    let totalGrade = 0;

    // A. 技能加權平均 Academic Score
    skillResults.forEach(result => {
        const weight = skillWeights[result.skillName] || 0;
        if (weight > 0) {
            weightedAcademicScoreSum += result.readyScore * weight;
            totalWeight += weight;
            totalGrade += result.grade; // 累積級分，用於算平均 U_grade
        }
    });

    if (totalWeight === 0) {
        return {
            readyPct: 0,
            userFinalScore: 0,
            breakdown: { message: "無有效技能權重或數據。" }
        };
    }

    // 總平均 Academic Score (0-100)
    const academicReadyScore = weightedAcademicScoreSum / totalWeight;
    // 總平均 U_grade (用於模考調整)
    const averageUserGrade = totalGrade / skillResults.length;

    // B. 模考潛力調整因子 (Adj_M)
    const adjFactor = calculateMockExamAdjustment(averageUserGrade, mockExamLevel);

    // C. 行為加成 (Boost)
    const eloPercentile = eloRank / 10000; // 假設 ELO 排名轉換
    const behaviorBoost = applyBehaviorBoost(streak, eloPercentile);

    // D. 總分 = (單科分數 * Adj_M) + Boost
    const userFinalScore = (academicReadyScore * adjFactor) + behaviorBoost;

    // 達成率
    const readyPct = Math.min(120, Math.max(0, (userFinalScore / minReadyScore) * 100));

    // 回傳詳細的計算結果
    return {
        readyPct: Math.round(readyPct * 10) / 10,
        userFinalScore: Math.round(userFinalScore * 10) / 10,
        academicReadyScore: Math.round(academicReadyScore * 10) / 10,
        targetMinScore: minReadyScore,
        currentGrade: Math.round(averageUserGrade * 10) / 10,
        requiredGrade: englishRequirement.requiredGradeLevel,
        breakdown: {
            adjFactor: adjFactor,
            behaviorBoost: behaviorBoost,
            skillDetails: skillResults.map(r => ({
                skill: r.skillName,
                score: Math.round(r.readyScore * 10) / 10,
                grade: Math.round(r.grade * 10) / 10,
                accuracy: Math.round(r.performance.weightedAccuracy * 100) / 100,
                weight: skillWeights[r.skillName] || 0
            })),
            message: totalWeight < 1.0
                ? "警告：僅基於部分技能進行評估，權重不足 100%。"
                : "評估結果基於所有設定技能的加權平均。"
        }
    };
} 
