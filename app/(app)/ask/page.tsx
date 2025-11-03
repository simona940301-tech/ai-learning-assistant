'use client';

import { useCallback, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import ModeTabs from '@/components/ask/ModeTabs';
import InputDock from '@/components/ask/InputDock';
import QuestionBubble from '@/components/ask/messages/QuestionBubble';
import ConceptChips from '@/components/ask/ConceptChips';
import ExplanationCard from '@/components/ask/ExplanationCard';
import BatchList from '@/components/ask/messages/BatchList';
import BatchActions from '@/components/ask/messages/BatchActions';
import BatchOverview from '@/components/ask/messages/BatchOverview';
import SummaryCard from '@/components/ask/SummaryCard';
import { detectMode, parseQuestions, parseSingleQuestion } from '@/lib/question-detector';
import { useTutorFlow } from '@/lib/use-tutor-flow';
import type {
  AskState,
  Question,
  ConceptChip,
  Explanation,
  QuickAnswer,
  GrammarTableRow,
} from '@/lib/tutor-types';

// 模擬 API 回應的考點 chips（實際應從 /api/ai/concept 取得）
const MOCK_CONCEPTS: ConceptChip[] = [
  { id: 'c1', label: '關係子句' },
  { id: 'c2', label: '分詞構句' },
  { id: 'c3', label: '倒裝句' },
  { id: 'c4', label: '同位語從句' },
];

// 模擬詳解資料（實際應從 /api/ai/solve 取得）
const MOCK_EXPLANATION: Explanation = {
  summary: '本題考「關係子句—非限定用法」：逗號 + which 補充說明先行詞。',
  steps: [
    '先辨識句子主結構：The book is fascinating（主詞 + 動詞 + 補語）。',
    '找出關鍵逗號：逗號後接關係子句，代表非限定用法（補充說明）。',
    '檢查先行詞：先行詞是 the book（物），因此使用 which。',
    '確認子句完整性:which I bought yesterday 完整無缺。',
  ],
  grammarTable: [
    { category: '定義', description: '關係子句用來修飾名詞，分限定與非限定兩種。', example: 'The book which I read...' },
    { category: '種類', description: '限定：不可省略；非限定：可省略，需逗號隔開。', example: 'My car, which is red, ...' },
    { category: '非限定用法', description: '逗號 + which/who，補充說明先行詞。', example: 'Tom, who is a doctor, ...' },
    { category: '限定用法', description: '無逗號，直接修飾先行詞。', example: 'The man who called you...' },
    { category: '常見錯誤', description: '混用 who/which，或忘記逗號。', example: '錯誤：The book who I read.' },
  ],
  encouragement: '句型抓得很穩，再多練幾題你會更熟悉！',
};

const ENCOURAGEMENTS = [
  '句型抓得很穩，再多練幾題你會更熟悉！',
  '邏輯方向正確,只差一個逗號的觀察。',
  '關係子句你已經掌握節奏，繼續保持這個速度。',
  '節奏很好，保持這種拆題速度就能越來越扎實。',
];

export default function AskPage() {
  const [activeTab, setActiveTab] = useState<'solve' | 'summary'>('solve');
  const [inputValue, setInputValue] = useState('');
  const [ocrStatus, setOcrStatus] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // New tutor flow integration
  const { 
    isLoading: tutorLoading, 
    error: tutorError, 
    currentSession,
    detectAndWarmup, 
    answerWarmup, 
    getSolveStrategy, 
    reset 
  } = useTutorFlow();

  const [state, setState] = useState<AskState>({
    mode: 'single',
    singlePhase: 'question',
    currentQuestion: null,
    concepts: [],
    explanation: null,
    batchPhase: 'list',
    questions: [],
    selectedIds: [],
    currentIndex: 0,
    totalQuestions: 0,
    quickAnswers: [],
    isLoading: false,
    error: null,
  });

  // New state for tutor flow
  const [tutorPhase, setTutorPhase] = useState<'detect' | 'warmup' | 'answer' | 'solve'>('detect');
  const [warmupData, setWarmupData] = useState<any>(null);
  const [answerResult, setAnswerResult] = useState<any>(null);
  const [solveData, setSolveData] = useState<any>(null);

  // ========================================
  // 輸入處理：使用新的 tutor flow
  // ========================================
  const handleSubmit = useCallback(async (value: string) => {
    if (!value.trim()) return;

    const mode = detectMode(value);
    
    if (mode === 'single') {
      // Use new tutor flow for single questions
      try {
        setTutorPhase('detect');
        const warmupResponse = await detectAndWarmup(value);
        setWarmupData(warmupResponse);
        setTutorPhase('warmup');

        // Also update the legacy state for UI compatibility
        const question = parseSingleQuestion(value);

        // Convert warmup options to concept chips
        const conceptChips: ConceptChip[] = warmupResponse.options.map((opt: any) => ({
          id: opt.option_id,
          label: opt.label
        }));

        setState((prev) => ({
          ...prev,
          mode: 'single',
          singlePhase: 'concept', // Set to 'concept' to show options
          currentQuestion: question,
          concepts: conceptChips, // Populate with warmup options
          explanation: null,
          isLoading: false,
        }));
      } catch (error) {
        console.error('Tutor flow error:', error);
        // Fallback to legacy flow
        const question = parseSingleQuestion(value);
        setState((prev) => ({
          ...prev,
          mode: 'single',
          singlePhase: 'question',
          currentQuestion: question,
          concepts: MOCK_CONCEPTS,
          explanation: null,
          isLoading: false,
        }));
      }
    } else {
      // Legacy batch mode
      const questions = parseQuestions(value);
      setState((prev) => ({
        ...prev,
        mode: 'batch',
        batchPhase: 'list',
        questions,
        selectedIds: [],
        currentIndex: 0,
        totalQuestions: questions.length,
        isLoading: false,
      }));
    }

    setInputValue('');
  }, [detectAndWarmup]);

  // ========================================
  // SINGLE 模式：選擇考點 → 顯示詳解
  // ========================================
  const handleConceptSelect = useCallback(async (concept: ConceptChip) => {
    // For new tutor flow, handle warmup option selection
    if (tutorPhase === 'warmup' && warmupData && currentSession) {
      try {
        setTutorPhase('answer');
        const answerResponse = await answerWarmup(concept.id);
        setAnswerResult(answerResponse);

        // Get solve strategy
        const solveResponse = await getSolveStrategy('step');
        setSolveData(solveResponse);
        setTutorPhase('solve');

        // Update legacy state for UI
        const randomEncouragement = ENCOURAGEMENTS[Math.floor(Math.random() * ENCOURAGEMENTS.length)];

        // Guard against undefined solveResponse
        if (solveResponse) {
          setState((prev) => ({
            ...prev,
            singlePhase: 'explain',
            explanation: {
              summary: solveResponse.summary || '解題說明',
              steps: solveResponse.steps || [],
              grammarTable: [
                { category: '檢查項目', description: solveResponse.checks?.join(', ') || '', example: '' },
                { category: '常見錯誤', description: solveResponse.error_hints?.join(', ') || '', example: '' },
                { category: '相關概念', description: solveResponse.extensions?.join(', ') || '', example: '' }
              ],
              encouragement: randomEncouragement
            },
            isLoading: false,
          }));
        } else {
          throw new Error('Solve response is undefined');
        }
      } catch (error) {
        console.error('Answer/Solve error:', error);
        // Fallback to mock
        const randomEncouragement = ENCOURAGEMENTS[Math.floor(Math.random() * ENCOURAGEMENTS.length)];
        setState((prev) => ({
          ...prev,
          singlePhase: 'explain',
          explanation: { ...MOCK_EXPLANATION, encouragement: randomEncouragement },
          isLoading: false,
        }));
      }
    } else {
      // Legacy flow
      setState((prev) => ({ ...prev, isLoading: true }));
      await new Promise((resolve) => setTimeout(resolve, 800));
      const randomEncouragement = ENCOURAGEMENTS[Math.floor(Math.random() * ENCOURAGEMENTS.length)];
      setState((prev) => ({
        ...prev,
        singlePhase: 'explain',
        explanation: { ...MOCK_EXPLANATION, encouragement: randomEncouragement },
        isLoading: false,
      }));
    }
  }, [tutorPhase, warmupData, currentSession, answerWarmup, getSolveStrategy]);

  const handleSaveToBackpack = useCallback(async () => {
    setState((prev) => ({ ...prev, isLoading: true }));
    // 模擬儲存
    await new Promise((resolve) => setTimeout(resolve, 600));
    setState((prev) => ({ ...prev, isLoading: false }));
    alert('已存入書包！');
  }, []);

  const handleRetry = useCallback(() => {
    setState((prev) => ({
      ...prev,
      singlePhase: 'question',
      currentQuestion: null,
      concepts: [],
      explanation: null,
    }));
  }, []);

  // ========================================
  // BATCH 模式：勾選 → 逐步解析 / 快速解答
  // ========================================
  const handleToggleBatch = useCallback((id: string) => {
    setState((prev) => {
      const isSelected = prev.selectedIds.includes(id);
      return {
        ...prev,
        selectedIds: isSelected
          ? prev.selectedIds.filter((sid) => sid !== id)
          : [...prev.selectedIds, id],
      };
    });
  }, []);

  const handleStepByStep = useCallback(async () => {
    const selectedQuestions = state.questions.filter((q) => state.selectedIds.includes(q.id));
    if (selectedQuestions.length === 0) return;

    setState((prev) => ({
      ...prev,
      batchPhase: 'step-by-step',
      currentIndex: 0,
      isLoading: true,
    }));

    // 模擬取得第一題的詳解
    await new Promise((resolve) => setTimeout(resolve, 800));
    const randomEncouragement = ENCOURAGEMENTS[Math.floor(Math.random() * ENCOURAGEMENTS.length)];
    setState((prev) => ({
      ...prev,
      currentQuestion: selectedQuestions[0],
      explanation: { ...MOCK_EXPLANATION, encouragement: randomEncouragement },
      isLoading: false,
    }));
  }, [state.questions, state.selectedIds]);

  const handleBatchNext = useCallback(async () => {
    const selectedQuestions = state.questions.filter((q) => state.selectedIds.includes(q.id));
    const nextIndex = state.currentIndex + 1;

    if (nextIndex >= selectedQuestions.length) {
      // 完成所有題目
      setState((prev) => ({
        ...prev,
        batchPhase: 'list',
        currentIndex: 0,
        explanation: null,
      }));
      return;
    }

    setState((prev) => ({ ...prev, isLoading: true, currentIndex: nextIndex }));

    // 淡出淡入動畫 + 模擬 API
    await new Promise((resolve) => setTimeout(resolve, 400));
    const randomEncouragement = ENCOURAGEMENTS[Math.floor(Math.random() * ENCOURAGEMENTS.length)];
    setState((prev) => ({
      ...prev,
      currentQuestion: selectedQuestions[nextIndex],
      explanation: { ...MOCK_EXPLANATION, encouragement: randomEncouragement },
      isLoading: false,
    }));
  }, [state.questions, state.selectedIds, state.currentIndex]);

  const handleQuickAnswer = useCallback(async () => {
    const selectedQuestions = state.questions.filter((q) => state.selectedIds.includes(q.id));
    if (selectedQuestions.length === 0) return;

    setState((prev) => ({ ...prev, isLoading: true, batchPhase: 'quick' }));

    // 模擬批次取得快速解答
    await new Promise((resolve) => setTimeout(resolve, 1200));

    const quickAnswers: QuickAnswer[] = selectedQuestions.map((q) => ({
      questionId: q.id,
      suggestedAnswer: 'B',
      oneLiner: '本題考關係子句非限定用法，逗號後接 which。',
    }));

    setState((prev) => ({
      ...prev,
      quickAnswers,
      isLoading: false,
    }));
  }, [state.questions, state.selectedIds]);

  const handleBackToList = useCallback(() => {
    setState((prev) => ({
      ...prev,
      batchPhase: 'list',
      currentIndex: 0,
      quickAnswers: [],
      explanation: null,
    }));
  }, []);

  // ========================================
  // 渲染邏輯
  // ========================================
  const renderContent = () => {
    if (activeTab === 'summary') {
      return (
        <div className="mx-auto max-w-3xl px-4 py-6">
          <SummaryCard title="重點統整" bullets={['這裡可以顯示學習重點統整內容']} />
        </div>
      );
    }

    // 解題模式
    if (state.mode === 'single') {
  return (
        <div className="mx-auto max-w-3xl space-y-6 px-4 py-6">
          <AnimatePresence mode="wait">
            {state.singlePhase === 'question' && state.currentQuestion && (
              <QuestionBubble key="question" question={state.currentQuestion} />
            )}
            {state.singlePhase === 'concept' && state.currentQuestion && (
              <>
                <QuestionBubble key="question-with-concepts" question={state.currentQuestion} />
                {tutorPhase === 'warmup' && warmupData ? (
                  <div key="warmup-options" className="space-y-4">
                    <div className="text-lg font-medium text-white mb-4">
                      {warmupData.stem}
                    </div>
                    <div className="grid gap-3">
                      {warmupData.options.map((option: any, index: number) => (
                        <motion.button
                          key={option.option_id}
                          className="p-4 bg-gray-800 rounded-lg border border-gray-700 hover:border-blue-400 transition-colors text-left"
                          whileHover={{ scale: 1.02 }}
                          whileTap={{ scale: 0.98 }}
                          onClick={() => handleConceptSelect({ id: option.option_id, label: option.label })}
                        >
                          <span className="text-blue-400 font-medium mr-3">{String.fromCharCode(65 + index)}</span>
                          <span className="text-white">{option.label}</span>
                        </motion.button>
                      ))}
                    </div>
                  </div>
                ) : (
                  <ConceptChips
                    key="concepts"
                    concepts={state.concepts}
                    selectedId={null}
                    onSelect={handleConceptSelect}
                  />
                )}
              </>
            )}
            {state.singlePhase === 'explain' && state.currentQuestion && state.explanation && (
              <ExplanationCard
                key="explanation"
                question={state.currentQuestion.text}
                conceptLabel="關係子句"
                summary={state.explanation.summary}
                steps={state.explanation.steps}
                grammarRows={state.explanation.grammarTable}
                encouragement={state.explanation.encouragement}
                onSave={handleSaveToBackpack}
                onRetry={handleRetry}
                isSaving={state.isLoading}
                isRetrying={false}
                savedStatus="idle"
              />
            )}
          </AnimatePresence>
        </div>
      );
    }

    // BATCH 模式
    return (
      <div className="mx-auto max-w-3xl space-y-6 px-4 py-6">
        <AnimatePresence mode="wait">
          {state.batchPhase === 'list' && (
            <>
              <BatchList
                key="batch-list"
                questions={state.questions}
                selectedIds={state.selectedIds}
                onToggle={handleToggleBatch}
              />
              <BatchActions
                key="batch-actions"
                selectedCount={state.selectedIds.length}
                onStepByStep={handleStepByStep}
                onQuickAnswer={handleQuickAnswer}
              />
            </>
          )}

          {state.batchPhase === 'step-by-step' && state.currentQuestion && state.explanation && (
            <motion.div
              key={`step-${state.currentIndex}`}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -16 }}
              transition={{ duration: 0.3 }}
            >
              <div className="mb-3 text-center text-xs uppercase tracking-[0.25em] text-white/40">
                {state.currentIndex + 1} / {state.selectedIds.length}
              </div>
              <ExplanationCard
                question={state.currentQuestion.text}
                conceptLabel="關係子句"
                summary={state.explanation.summary}
                steps={state.explanation.steps}
                grammarRows={state.explanation.grammarTable}
                encouragement={state.explanation.encouragement}
                onSave={handleSaveToBackpack}
                onRetry={handleBackToList}
                onNext={handleBatchNext}
                isSaving={state.isLoading}
                isRetrying={false}
                isNextLoading={state.isLoading}
                savedStatus="idle"
                isLastStep={state.currentIndex === state.selectedIds.length - 1}
              />
            </motion.div>
          )}

          {state.batchPhase === 'quick' && (
            <BatchOverview
              key="batch-quick"
              quickAnswers={state.quickAnswers}
              onBack={handleBackToList}
            />
                  )}
                </AnimatePresence>
      </div>
    );
  };

  return (
    <div className="relative flex min-h-screen flex-col bg-[#0E1116] text-[#F1F5F9]">
      {/* 頂部分頁 */}
      <motion.div
        className="fixed inset-x-0 top-0 z-20 flex justify-center border-b border-white/5 bg-[#0E1116]/95 px-4 py-4 backdrop-blur"
        initial={{ opacity: 0, y: -12 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <ModeTabs active={activeTab} onChange={setActiveTab} />
      </motion.div>

      {/* 主內容區（留出頂部和底部空間） */}
      <div className="flex-1 overflow-y-auto pt-20 pb-40">
        {renderContent()}
        {(state.isLoading || tutorLoading) && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-gray-800 p-6 rounded-lg flex items-center space-x-3">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-400"></div>
              <span className="text-white">處理中...</span>
            </div>
          </div>
        )}
        {tutorError && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-red-800 p-6 rounded-lg flex items-center space-x-3">
              <span className="text-white">錯誤: {tutorError}</span>
              <button 
                onClick={reset}
                className="ml-4 px-3 py-1 bg-red-600 text-white rounded hover:bg-red-700"
              >
                重試
              </button>
            </div>
          </div>
        )}
      </div>

      {/* 底部輸入 Dock */}
      <InputDock
        mode={state.mode}
        value={inputValue}
        isBusy={state.isLoading}
        ocrStatus={ocrStatus}
        onChange={setInputValue}
        onSubmit={handleSubmit}
        onOcrComplete={setOcrStatus}
      />
    </div>
  );
}
