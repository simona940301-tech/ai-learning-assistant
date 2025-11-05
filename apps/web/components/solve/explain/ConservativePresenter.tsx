'use client'

import { motion } from 'framer-motion'
import type {
  ConservativeResult,
  E1VocabAnswer,
  E2ClozeAnswer,
  E3FillInClozeAnswer,
  E4ReadingAnswer,
  E5DiscourseAnswer,
  E5TranslationAnswer,
  E6WritingAnswer,
} from '@/lib/ai/conservative-types'
import Typewriter from '../Typewriter'

interface ConservativePresenterProps {
  result: ConservativeResult
}

/**
 * Conservative Mode Presenter
 * Renders structured, slot-by-slot explanations
 */
export default function ConservativePresenter({ result }: ConservativePresenterProps) {
  const { detected_type, answer, confidence } = result

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-4"
    >
      {/* Type Badge */}
      <div className="flex items-center gap-2 text-xs">
        <span className="px-2 py-1 rounded bg-blue-500/20 text-blue-400 border border-blue-500/30">
          {detected_type}
        </span>
        {confidence && (
          <span className={`px-2 py-1 rounded ${
            confidence === 'high' ? 'bg-green-500/20 text-green-400' :
            confidence === 'medium' ? 'bg-yellow-500/20 text-yellow-400' :
            'bg-orange-500/20 text-orange-400'
          }`}>
            {confidence === 'high' ? '高信心' : confidence === 'medium' ? '中信心' : '低信心'}
          </span>
        )}
      </div>

      {/* Render by type */}
      {answer.type === 'E1_VOCAB' && <E1VocabRenderer answer={answer} />}
      {answer.type === 'E2_CLOZE' && <E2ClozeRenderer answer={answer} />}
      {answer.type === 'E3_FILL_IN_CLOZE' && <E3FillInClozeRenderer answer={answer} />}
      {answer.type === 'E4_READING' && <E4ReadingRenderer answer={answer} />}
      {answer.type === 'E5_DISCOURSE' && <E5DiscourseRenderer answer={answer} />}
      {answer.type === 'E5_TRANSLATION' && <E5TranslationRenderer answer={answer} />}
      {answer.type === 'E6_WRITING' && <E6WritingRenderer answer={answer} />}
    </motion.div>
  )
}

function E1VocabRenderer({ answer }: { answer: E1VocabAnswer }) {
  return (
    <div className="space-y-4">
      <div className="rounded-lg bg-zinc-900/60 border border-zinc-800/50 p-4">
        <div className="text-sm font-medium text-zinc-300 mb-2">題目</div>
        <div className="text-base text-zinc-200">{answer.question_text}</div>
      </div>

      <div className="rounded-lg bg-green-500/10 border border-green-500/30 p-4">
        <div className="text-sm font-medium text-green-400 mb-2">答案</div>
        <div className="text-lg font-semibold text-green-300">{answer.answer}</div>
        <div className="text-sm text-zinc-300 mt-2">
          <Typewriter text={answer.one_line_reason} />
        </div>
      </div>

      {answer.distractor_rejects.length > 0 && (
        <div className="rounded-lg bg-zinc-900/60 border border-zinc-800/50 p-4">
          <div className="text-sm font-medium text-zinc-300 mb-2">選項分析</div>
          <div className="space-y-2">
            {answer.distractor_rejects.map((reject, idx) => (
              <div key={idx} className="text-sm text-zinc-300">
                <span className="font-medium text-zinc-400">({reject.option})</span> {reject.reason}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

function E2ClozeRenderer({ answer }: { answer: E2ClozeAnswer }) {
  return (
    <div className="space-y-4">
      <div className="rounded-lg bg-zinc-900/60 border border-zinc-800/50 p-4">
        <div className="text-sm font-medium text-zinc-300 mb-2">文章摘要</div>
        <div className="text-sm text-zinc-300">{answer.passage_summary}</div>
      </div>

      {answer.slots.map((slot) => (
        <div key={slot.slot} className="rounded-lg bg-zinc-900/60 border border-zinc-800/50 p-4">
          <div className="flex items-center gap-2 mb-3">
            <span className="px-2 py-1 rounded bg-blue-500/20 text-blue-400 text-xs font-medium">
              空格 {slot.slot}
            </span>
            <span className="text-lg font-semibold text-green-400">答案: {slot.answer}</span>
          </div>
          <div className="text-sm text-zinc-300 mb-3">
            <Typewriter text={slot.one_line_reason} />
          </div>
          {slot.distractor_rejects.length > 0 && (
            <div className="mt-3 pt-3 border-t border-zinc-800/50">
              <div className="text-xs font-medium text-zinc-400 mb-2">其他選項分析</div>
              <div className="space-y-1">
                {slot.distractor_rejects.map((reject, idx) => (
                  <div key={idx} className="text-xs text-zinc-400">
                    <span className="font-medium">({reject.option})</span> {reject.reason}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      ))}
    </div>
  )
}

function E3FillInClozeRenderer({ answer }: { answer: E3FillInClozeAnswer }) {
  return <E2ClozeRenderer answer={answer as E2ClozeAnswer} />
}

function E4ReadingRenderer({ answer }: { answer: E4ReadingAnswer }) {
  return (
    <div className="space-y-4">
      <div className="rounded-lg bg-zinc-900/60 border border-zinc-800/50 p-4">
        <div className="text-sm font-medium text-zinc-300 mb-2">文章標題</div>
        <div className="text-base font-semibold text-zinc-200">{answer.title}</div>
      </div>

      {answer.questions.map((q) => (
        <div key={q.qid} className="rounded-lg bg-zinc-900/60 border border-zinc-800/50 p-4">
          <div className="flex items-center gap-2 mb-3">
            <span className="px-2 py-1 rounded bg-blue-500/20 text-blue-400 text-xs font-medium">
              題 {q.qid}
            </span>
            <span className="text-lg font-semibold text-green-400">答案: {q.answer}</span>
          </div>
          <div className="text-sm text-zinc-300 mb-3">
            <Typewriter text={q.one_line_reason} />
          </div>
          {q.evidence_sentence && (
            <div className="mt-3 p-2 rounded bg-zinc-800/30 border border-zinc-700/50">
              <div className="text-xs font-medium text-zinc-400 mb-1">關鍵證據</div>
              <div className="text-sm text-zinc-300 italic">{q.evidence_sentence}</div>
            </div>
          )}
          {q.distractor_rejects.length > 0 && (
            <div className="mt-3 pt-3 border-t border-zinc-800/50">
              <div className="text-xs font-medium text-zinc-400 mb-2">其他選項分析</div>
              <div className="space-y-1">
                {q.distractor_rejects.map((reject, idx) => (
                  <div key={idx} className="text-xs text-zinc-400">
                    <span className="font-medium">({reject.option})</span> {reject.reason}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      ))}
    </div>
  )
}

function E5DiscourseRenderer({ answer }: { answer: E5DiscourseAnswer }) {
  return <E2ClozeRenderer answer={answer as E2ClozeAnswer} />
}

function E5TranslationRenderer({ answer }: { answer: E5TranslationAnswer }) {
  return (
    <div className="space-y-4">
      <div className="rounded-lg bg-zinc-900/60 border border-zinc-800/50 p-4">
        <div className="text-sm font-medium text-zinc-300 mb-2">原文</div>
        <div className="text-base text-zinc-200">{answer.original_zh}</div>
      </div>

      <div className="rounded-lg bg-green-500/10 border border-green-500/30 p-4">
        <div className="text-sm font-medium text-green-400 mb-2">參考翻譯</div>
        <div className="text-base text-green-300">
          <Typewriter text={answer.reference_en} />
        </div>
      </div>

      <div className="rounded-lg bg-zinc-900/60 border border-zinc-800/50 p-4">
        <div className="text-sm font-medium text-zinc-300 mb-2">語法重點</div>
        <div className="text-sm text-zinc-300">{answer.grammar_focus}</div>
      </div>

      <div className="rounded-lg bg-zinc-900/60 border border-zinc-800/50 p-4">
        <div className="text-sm font-medium text-zinc-300 mb-2">關鍵片語分析</div>
        <div className="text-sm text-zinc-300">{answer.key_phrase_analysis}</div>
      </div>

      {answer.native_upgrade && (
        <div className="rounded-lg bg-blue-500/10 border border-blue-500/30 p-4">
          <div className="text-sm font-medium text-blue-400 mb-2">道地表達</div>
          <div className="text-sm text-blue-300">{answer.native_upgrade}</div>
        </div>
      )}
    </div>
  )
}

function E6WritingRenderer({ answer }: { answer: E6WritingAnswer }) {
  return (
    <div className="space-y-4">
      <div className="rounded-lg bg-zinc-900/60 border border-zinc-800/50 p-4">
        <div className="text-sm font-medium text-zinc-300 mb-2">題目摘要</div>
        <div className="text-base text-zinc-200">{answer.topic_summary}</div>
      </div>

      <div className="rounded-lg bg-zinc-900/60 border border-zinc-800/50 p-4">
        <div className="text-sm font-medium text-zinc-300 mb-3">MAWS 評分</div>
        <div className="grid grid-cols-2 gap-3">
          <div className="text-sm">
            <span className="text-zinc-400">內容：</span>
            <span className="text-zinc-200 font-semibold ml-2">{answer.maws_scores.content}</span>
          </div>
          <div className="text-sm">
            <span className="text-zinc-400">組織：</span>
            <span className="text-zinc-200 font-semibold ml-2">{answer.maws_scores.organization}</span>
          </div>
          <div className="text-sm">
            <span className="text-zinc-400">句構語法：</span>
            <span className="text-zinc-200 font-semibold ml-2">{answer.maws_scores.grammar_structure}</span>
          </div>
          <div className="text-sm">
            <span className="text-zinc-400">詞彙運用：</span>
            <span className="text-zinc-200 font-semibold ml-2">{answer.maws_scores.vocabulary_fluency}</span>
          </div>
        </div>
      </div>

      <div className="rounded-lg bg-zinc-900/60 border border-zinc-800/50 p-4">
        <div className="text-sm font-medium text-zinc-300 mb-2">質化評論</div>
        <div className="text-sm text-zinc-300 whitespace-pre-wrap">
          <Typewriter text={answer.qualitative_feedback} />
        </div>
      </div>

      {answer.student_sample && (
        <div className="rounded-lg bg-zinc-900/60 border border-zinc-800/50 p-4">
          <div className="text-sm font-medium text-zinc-300 mb-2">範文</div>
          <div className="text-sm text-zinc-300 whitespace-pre-wrap">{answer.student_sample}</div>
        </div>
      )}

      {answer.high_score_sample_intro && (
        <div className="rounded-lg bg-blue-500/10 border border-blue-500/30 p-4">
          <div className="text-sm font-medium text-blue-400 mb-2">高分示範寫法</div>
          <div className="text-sm text-blue-300">{answer.high_score_sample_intro}</div>
        </div>
      )}
    </div>
  )
}
