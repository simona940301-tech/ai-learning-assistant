'use client'

import { motion } from 'framer-motion'
import { Trophy, Sparkles } from 'lucide-react'

// ============================================
// Types
// ============================================

export type OptionLetter = 'A' | 'B' | 'C' | 'D'

export interface OptionButtonProps {
  letter: OptionLetter
  text: string
  isSelected: boolean
  isCorrect: boolean
  isAnswered: boolean
  isOpponentAnswer: boolean
  showComboBonus: boolean
  onSelect: (letter: OptionLetter) => void
}

export interface OptionsListProps {
  options: string[]
  selectedAnswer: OptionLetter | null
  correctAnswer: OptionLetter
  isAnswered: boolean
  opponentAnswer: OptionLetter | null
  showComboBonus?: boolean
  onSelectAnswer: (answer: OptionLetter) => void
}

// ============================================
// OptionButton - 單一選項按鈕
// ============================================

function OptionButton({
  letter,
  text,
  isSelected,
  isCorrect,
  isAnswered,
  isOpponentAnswer,
  showComboBonus,
  onSelect,
}: OptionButtonProps) {
  // 背景顏色狀態 - 溫黃色系
  const bgColor = isAnswered
    ? isCorrect
      ? 'bg-green-500/25 border-green-400/60'
      : isSelected && !isCorrect
        ? 'bg-red-500/25 border-red-400/60'
        : 'bg-amber-50 border-amber-200/30 opacity-60'
    : isSelected
      ? 'bg-amber-500/25 border-amber-400/70'
      : 'bg-white border-amber-200/30 hover:bg-amber-50 hover:border-amber-300/50'

  // 字母圓圈顏色 - 溫黃色系
  const letterBgColor = isAnswered && isCorrect
    ? 'bg-green-500'
    : isAnswered && isSelected && !isCorrect
      ? 'bg-red-500'
      : isSelected
        ? 'bg-amber-500'
        : 'bg-amber-200/40'

  // 文字顏色 - 溫黃色系
  const textColor = isAnswered
    ? isCorrect || (isSelected && !isCorrect)
      ? 'text-amber-900'
      : 'text-amber-600/50'
    : 'text-amber-800'

  return (
    <motion.button
      type="button"
      onClick={() => !isAnswered && onSelect(letter)}
      disabled={isAnswered}
      className={`relative flex h-16 w-full items-center gap-3 rounded-xl border px-3 transition-all ${bgColor}`}
      whileHover={!isAnswered ? { scale: 1.01 } : {}}
      whileTap={!isAnswered ? { scale: 0.98 } : {}}
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
    >
      {/* 字母圓圈 */}
      <div
        className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm font-bold transition-colors ${letterBgColor} ${isAnswered && isCorrect ? 'text-white' : isSelected ? 'text-white' : 'text-amber-800'
          }`}
      >
        {letter}
      </div>

      {/* 選項文字 */}
      <span className={`flex-1 text-left text-sm leading-relaxed font-medium ${textColor}`}>{text}</span>

      {/* 答對圖示 */}
      {isAnswered && isCorrect && (
        <motion.div
          initial={{ scale: 0, rotate: -180 }}
          animate={{ scale: 1, rotate: 0 }}
          transition={{ type: 'spring', stiffness: 500, damping: 25 }}
        >
          <Trophy className="h-4 w-4 text-green-300" />
        </motion.div>
      )}

      {/* Combo 獎勵標籤 */}
      {showComboBonus && !isAnswered && (
        <motion.span
          className="absolute -right-1 -top-1 rounded-full bg-amber-500 px-2 py-0.5 text-[9px] font-black uppercase text-white shadow-lg"
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: 'spring', stiffness: 400, damping: 15 }}
        >
          Bonus
        </motion.span>
      )}

      {/* 對手鎖定提示 - 已移除，不再顯示對手選擇 */}
      {/* {isOpponentAnswer && !isAnswered && (
          <motion.div
            className="flex items-center gap-1 text-[10px] font-semibold text-amber-600"
            initial={{ opacity: 0, x: 5 }}
            animate={{ opacity: 1, x: 0 }}
          >
            <Sparkles className="h-3 w-3 text-amber-600" />
          </motion.div>
      )} */}
    </motion.button>
  )
}

// ============================================
// OptionsList - 選項列表容器
// ============================================

export function OptionsList({
  options,
  selectedAnswer,
  correctAnswer,
  isAnswered,
  opponentAnswer,
  showComboBonus = false,
  onSelectAnswer,
}: OptionsListProps) {
  const letters: OptionLetter[] = ['A', 'B', 'C', 'D']

  // 確保顯示所有選項（最多4個）
  // 強制顯示4個選項按鈕，即使數據少於4個
  const displayOptions: Array<{ text: string; letter: OptionLetter; isEmpty: boolean }> = []

  for (let i = 0; i < 4; i++) {
    const opt = options[i]
    const letter = letters[i]
    if (opt && typeof opt === 'string' && opt.trim() !== '') {
      displayOptions.push({ text: opt, letter, isEmpty: false })
    } else {
      // 如果選項不存在，顯示占位符（用於調試和確保UI完整）
      displayOptions.push({ text: `選項 ${letter}`, letter, isEmpty: true })
    }
  }

  return (
    <div className="flex h-full min-h-0 flex-col bg-gradient-to-b from-amber-50 to-yellow-100 border-t border-amber-200/30 shadow-[0_-4px_20px_rgba(245,158,11,0.1)]">
      {/* 選項容器 - 內部可捲動，mobile-first padding */}
      <div className="flex min-h-0 flex-1 flex-col overflow-y-auto px-3 pt-2 pb-4 md:px-4 md:pt-3 md:pb-8">
        <div className="mx-auto w-full max-w-[390px] flex flex-col gap-2">
          {displayOptions.map(({ text, letter, isEmpty }, index) => {
            // 如果是空選項，顯示但禁用
            if (isEmpty) {
              return (
                <div
                  key={`${letter}-${index}`}
                  className="relative flex h-16 w-full items-center gap-3 rounded-xl border border-amber-200/30 bg-amber-50/50 px-3 opacity-40"
                >
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-amber-200/40 text-sm font-bold text-amber-600/50">
                    {letter}
                  </div>
                  <span className="flex-1 text-left text-sm leading-relaxed font-medium text-amber-600/30">{text}</span>
                </div>
              )
            }

            return (
              <OptionButton
                key={`${letter}-${index}`}
                letter={letter}
                text={text}
                isSelected={selectedAnswer === letter}
                isCorrect={correctAnswer === letter}
                isAnswered={isAnswered}
                isOpponentAnswer={opponentAnswer === letter}
                showComboBonus={showComboBonus}
                onSelect={onSelectAnswer}
              />
            )
          })}
        </div>
      </div>
    </div>
  )
}
