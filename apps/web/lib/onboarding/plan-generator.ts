
export interface OnboardingData {
    goal: {
        target_university: string
        target_department: string
        current_grade: string
        mock_exam_level: number
    }
    habits: {
        trigger?: string
        action?: string
        reward?: string
        investment?: string
        frequency?: string
    }
    challenge: {
        score: number
        weak_areas: string[] // e.g. ['vocabulary', 'cloze', 'reading']
        results: any[]
    }
    userName: string
}

export function generatePersonalPlan(data: OnboardingData): string {
    const { goal, habits, challenge, userName } = data
    const date = new Date().toLocaleDateString('zh-TW')

    // Determine stage based on level
    let stage = '基礎鞏固期'
    let stageDesc = '目前的重點是打好基礎，確保核心單字和文法無誤。'
    if (goal.mock_exam_level >= 9) {
        stage = '衝刺精進期'
        stageDesc = '基礎已經很穩固，現在要針對高難度題型進行突破。'
    } else if (goal.mock_exam_level >= 5) {
        stage = '實力養成期'
        stageDesc = '已經掌握基本概念，需要透過大量練習來提升解題速度和準確度。'
    }

    // Determine schedule based on investment
    let dailyTime = '30 分鐘'
    if (habits.investment?.includes('1 小時')) dailyTime = '60 分鐘'

    // Determine focus based on weak areas
    const focusAreaMap: Record<string, string> = {
        vocabulary: '單字量擴充',
        cloze: '文法與克漏字',
        reading: '閱讀理解速度',
    }

    const focusPoints = challenge.weak_areas.length > 0
        ? challenge.weak_areas.map(area => focusAreaMap[area] || area).join('、')
        : '全方位提升'

    return `# 🎓 ${userName} 的專屬學習計畫

> 📅 建立日期：${date}
> 🎯 目標：${goal.target_university} ${goal.target_department}

## 📊 現況分析
- **目前年級**：${goal.current_grade}
- **模考程度**：Level ${goal.mock_exam_level}
- **當前階段**：**${stage}**
- **階段目標**：${stageDesc}

## 🚀 核心策略：${focusPoints}

根據你的測驗結果，我們為你制定了以下的強化策略：

${challenge.weak_areas.includes('vocabulary') ? '- **單字特訓**：你的單字量還有提升空間，建議每天使用「單字卡」功能複習 20 個新單字。' : ''}
${challenge.weak_areas.includes('cloze') ? '- **文法強化**：克漏字部分顯示對文法結構掌握度不夠，建議多做「克漏字」專項練習。' : ''}
${challenge.weak_areas.includes('reading') ? '- **閱讀提速**：閱讀測驗耗時較長，建議每天閱讀一篇短文，訓練抓取關鍵字的能力。' : ''}
${challenge.weak_areas.length === 0 ? '- **保持優勢**：你的表現非常均衡！建議挑戰更高難度的題目，保持手感。' : ''}

## 📅 每週學習課表

根據你設定的 **${dailyTime}** 投入時間，我們建議以下安排：

| 星期 | 重點項目 | 建議內容 |
| :--- | :--- | :--- |
| **週一** | 單字積累 | 複習錯題本中的單字 + 新單字 10 個 |
| **週二** | ${challenge.weak_areas[0] ? focusAreaMap[challenge.weak_areas[0]] : '綜合練習'} | 專項練習 15 分鐘 + 檢討 |
| **週三** | 閱讀訓練 | 閱讀一篇短文 + 完成測驗 |
| **週四** | 文法複習 | 針對本週錯題進行文法觀念釐清 |
| **週五** | 模擬實戰 | 進行一次完整的 3 題對戰 |
| **週末** | 總結複習 | 回顧本週錯題本，重新挑戰錯題 |

## 💡 學習建議

- **觸發習慣**：${habits.trigger || '設定固定時間'}，讓學習成為反射動作。
- **獎勵機制**：${habits.reward || '完成後給自己一個小獎勵'}，保持動力。
- **善用工具**：記得隨時將不懂的題目加入「錯題本」，這是你進步最快的捷徑。

---
*這份計畫會隨著你的進步動態調整。加油，${goal.target_university} 在等著你！*
`
}
