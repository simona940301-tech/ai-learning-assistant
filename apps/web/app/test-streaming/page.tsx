'use client'

/**
 * 測試頁面 - 流式輸出效果
 */

import { useState } from 'react'
import { StreamingMarkdownExplain } from '@/components/solve/StreamingMarkdownExplain'
import { AuthGuard } from '@/components/auth/AuthGuard'

const SAMPLE_QUESTION = `The fashion industry in Africa has witnessed tremendous growth in recent years. African fashion
design has caught the eyes of international celebrities including former US first lady, Michelle Obama,
Rihanna, and Beyoncé, (1) . Global demand for African-inspired fashion has led to incredible sales
for some African designers and brands.
Folake Folarin — Coker, founder of Tiffany Amber, is one of the best-known fashion designers in
both the African and global fashion industry. Born in Lagos, Nigeria, she received her education in
Europe, (2) she got an opportunity to interact with various cultures at a young age. (3) , she has a
master's degree in law from Switzerland, but as fate would have it, her passion for fashion led her into
fashion design.
Folake's tasteful and colorful creations have earned her global (4) , making her the first African fashion
designer to showcase her talent at the New York Mercedes Fashion Week for two consecutive years. She
has also been widely (5) in international media such as CNN. In 2013, she was listed as one of the
Forbes Power Women in Africa.
（ ）(１)(Ａ) if any (Ｂ) among others (Ｃ) in short (Ｄ) at best
（ ）(２)(Ａ) where (Ｂ) there (Ｃ) that (Ｄ) whether
（ ）(３)(Ａ) Generally (Ｂ) Ideally (Ｃ) Relatively (Ｄ) Interestingly
（ ）(４)(Ａ) recognition (Ｂ) motivation (Ｃ) supervision (Ｄ) preparation
（ ）(５)(Ａ) believed (Ｂ) announced (Ｃ) featured (Ｄ) populated`

export default function TestStreamingPage() {
  const [questionText, setQuestionText] = useState('')
  const [key, setKey] = useState(0)

  const handleLoadSample = () => {
    setQuestionText(SAMPLE_QUESTION)
    setKey((prev) => prev + 1)
  }

  const handleCustomInput = (text: string) => {
    setQuestionText(text)
  }

  const handleSubmit = () => {
    setKey((prev) => prev + 1)
  }

  return (
    <AuthGuard requireAuth={true}>
      <div className="test-streaming-page">
        <div className="container">
          <header className="page-header">
            <h1>🌊 流式輸出測試</h1>
            <p>測試 ChatGPT 風格的流式解釋生成</p>
          </header>

          <div className="input-section">
            <textarea
              className="question-input"
              value={questionText}
              onChange={(e) => handleCustomInput(e.target.value)}
              onPaste={(e) => {
                // 允許貼上
                const pastedText = e.clipboardData.getData('text')
                if (pastedText) {
                  e.preventDefault()
                  handleCustomInput(questionText + (questionText ? '\n' : '') + pastedText)
                }
              }}
              placeholder="輸入英文題目，或點擊「載入範例」..."
              rows={8}
            />

            <div className="button-group">
              <button className="button button-secondary" onClick={handleLoadSample}>
                載入範例（5 題閱讀理解）
              </button>
              <button
                className="button button-primary"
                onClick={handleSubmit}
                disabled={!questionText}
              >
                生成解析
              </button>
            </div>
          </div>

          <div className="result-section">
            {questionText && <StreamingMarkdownExplain key={key} inputText={questionText} />}
          </div>
        </div>

        <style jsx>{`
          .test-streaming-page {
            min-height: 100vh;
            background: #f9fafb;
            padding: 24px;
          }

          .container {
            max-width: 1200px;
            margin: 0 auto;
          }

          .page-header {
            text-align: center;
            margin-bottom: 48px;
          }

          .page-header h1 {
            font-size: 36px;
            font-weight: 700;
            color: #111827;
            margin-bottom: 8px;
          }

          .page-header p {
            font-size: 16px;
            color: #6b7280;
          }

          .input-section {
            background: white;
            border-radius: 12px;
            padding: 24px;
            box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
            margin-bottom: 32px;
          }

          .question-input {
            width: 100%;
            padding: 12px;
            border: 1px solid #d1d5db;
            border-radius: 8px;
            font-size: 14px;
            font-family: monospace;
            resize: vertical;
            margin-bottom: 16px;
          }

          .question-input:focus {
            outline: none;
            border-color: #3b82f6;
            box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
          }

          .button-group {
            display: flex;
            gap: 12px;
            justify-content: flex-end;
          }

          .button {
            padding: 10px 20px;
            border-radius: 8px;
            font-size: 14px;
            font-weight: 500;
            cursor: pointer;
            transition: all 0.2s;
            border: none;
          }

          .button:disabled {
            opacity: 0.5;
            cursor: not-allowed;
          }

          .button-primary {
            background: #3b82f6;
            color: white;
          }

          .button-primary:hover:not(:disabled) {
            background: #2563eb;
          }

          .button-secondary {
            background: #f3f4f6;
            color: #374151;
          }

          .button-secondary:hover {
            background: #e5e7eb;
          }

          .result-section {
            background: white;
            border-radius: 12px;
            box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
            min-height: 400px;
          }
        `}</style>
      </div>
    </AuthGuard>
  )
}
