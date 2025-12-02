# 多文件重點統整修復報告

## 問題總結

用戶在重點統整頁面選取三個檔案後遇到以下問題:

1. ❌ **沒有確認 UI** - 選取文件後沒有明確的確認步驟來開始統整
2. ❌ **只統整一個文件** - 即使選了3個文件,`relatedDocIds` 總是空的,只分析第一個文件
3. ❌ **考題沒有來源標示** - 看不出每道考題是從哪個文件生成的
4. ❌ **useEffect 依賴錯誤** - 即使props改變也不會重新分析

## 修復方案

### 1. ✅ 添加確認 Toast UI

**文件:** [SummaryWorkbench.tsx](apps/web/components/ask/SummaryWorkbench.tsx)

添加了狀態管理:
- `selectedFileIds` - 用戶當前選擇的文件
- `pendingAnalysisIds` - 正在分析或即將分析的文件
- `showConfirmToast` - 控制確認 Toast 的顯示

當用戶改變文件選擇時:
```tsx
{showConfirmToast && selectedFileIds.length !== pendingAnalysisIds.length && (
    <motion.div className="...">
        <p>已選擇 {selectedFileIds.length} 個文件用於問答</p>
        <p>點擊「重新統整」以根據新的選擇生成重點與考題</p>
        <Button onClick={() => setPendingAnalysisIds(selectedFileIds)}>
            重新統整
        </Button>
    </motion.div>
)}
```

### 2. ✅ 修復多文件統整邏輯

**文件:** [SummaryWorkbench.tsx](apps/web/components/ask/SummaryWorkbench.tsx)

使用 `pendingAnalysisIds` 來決定要分析哪些文件:
```tsx
<ProgressiveAnalysisCard
    key={pendingAnalysisIds.join(',')} // 強制重新掛載
    documentId={pendingAnalysisIds[0]}
    relatedDocIds={pendingAnalysisIds.slice(1)} // 其他文件
    selectedDocIds={pendingAnalysisIds} // 所有選中的文件
/>
```

### 3. ✅ 添加來源標示

#### 前端 Schema 更新

**文件:** [ProgressiveAnalysisCard.tsx](apps/web/components/ask/ProgressiveAnalysisCard.tsx)

添加 `sourceDocId` 到問題 schema:
```tsx
z.object({
    questionType: z.string(),
    question: z.string(),
    options: z.array(z.string()).optional(),
    answer: z.string(),
    analysis: z.string(),
    difficulty: z.enum(['Easy', 'Medium', 'Hard']).optional(),
    curriculumCode: z.string().optional(),
    sourceDocId: z.string().optional() // ✅ 新增
})
```

#### QuestionCard 顯示來源

```tsx
{item.sourceDocId && documentNames[item.sourceDocId] && (
    <span className="text-[10px] px-2 py-0.5 rounded bg-blue-100 text-blue-700">
        來源: {documentNames[item.sourceDocId]}
    </span>
)}
```

#### 獲取文件名稱

添加 useEffect 來獲取文件名稱映射:
```tsx
useEffect(() => {
    const allDocIds = selectedDocIds.length > 0 ? selectedDocIds : [documentId, ...relatedDocIds]

    const fetchDocumentNames = async () => {
        const response = await fetch(`/api/rag/upload?ids=${allDocIds.join(',')}`)
        const data = await response.json()

        if (data.success && data.documents) {
            const nameMap: Record<string, string> = {}
            data.documents.forEach((doc) => {
                nameMap[doc.id] = doc.filename
            })
            setDocumentNames(nameMap)
        }
    }

    fetchDocumentNames()
}, [selectedDocIds, documentId, relatedDocIds])
```

### 4. ✅ 修復 useEffect 依賴

**文件:** [ProgressiveAnalysisCard.tsx](apps/web/components/ask/ProgressiveAnalysisCard.tsx)

修正 useEffect 依賴,確保 props 改變時會重新分析:
```tsx
useEffect(() => {
    if (documentId || initialText) {
        submit({
            documentId,
            relatedDocIds,
            subject,
            text: initialText
        })
    }
}, [documentId, initialText, submit]) // ✅ 添加 submit
```

### 5. ✅ 後端支援

#### API Schema 更新

**文件:** [elite-rag-analyzer.ts](apps/web/lib/services/elite-rag-analyzer.ts)

```tsx
const QuestionSchema = z.object({
    // ... 其他欄位
    sourceDocId: z.string().optional().describe('題目來源文件的ID（當有多個文件時使用）'),
})
```

#### GET API 支援按 IDs 查詢

**文件:** [apps/web/app/api/rag/upload/route.ts](apps/web/app/api/rag/upload/route.ts)

```tsx
const idsParam = searchParams.get('ids')

if (idsParam) {
    const ids = idsParam.split(',').filter(Boolean)
    if (ids.length > 0) {
        query = query.in('id', ids)
    }
}
```

## 用戶體驗流程

### 之前 ❌
1. 用戶選取3個文件 (國文2.pdf, 國學常識.pdf, 國學常識.pdf)
2. 直接顯示分析結果
3. 只看到一個文件的內容
4. 考題沒有來源標示

### 現在 ✅
1. 用戶上傳文件後,看到3個文件的選擇 chips
2. 系統自動分析所有3個文件
3. 如果用戶改變選擇,會出現確認 Toast:
   ```
   已選擇 3 個文件用於問答
   點擊「重新統整」以根據新的選擇生成重點與考題
   [重新統整按鈕]
   ```
4. 點擊按鈕後重新分析選中的文件
5. 每道考題都顯示來源文件名稱

## 技術細節

### State Management

```tsx
// 用戶選擇 (可隨時改變)
const [selectedFileIds, setSelectedFileIds] = useState<string[]>([])

// 當前正在分析的文件 (確認後才改變)
const [pendingAnalysisIds, setPendingAnalysisIds] = useState<string[]>([])

// 確認 Toast 顯示狀態
const [showConfirmToast, setShowConfirmToast] = useState(false)

// 文件名稱映射 (用於顯示來源)
const [documentNames, setDocumentNames] = useState<Record<string, string>>({})
```

### Re-analysis Trigger

使用 `key` prop 強制 React 重新掛載組件:
```tsx
<ProgressiveAnalysisCard
    key={pendingAnalysisIds.join(',')} // 當選擇改變時,key 改變,強制重新掛載
    // ...
/>
```

## 測試建議

1. **單文件測試**
   - 上傳1個PDF
   - 確認分析正常
   - 考題應該不顯示來源標籤

2. **多文件測試**
   - 上傳3個同科目PDF (如: 國文2.pdf, 國學常識.pdf, 國學常識.pdf)
   - 確認所有3個文件都被分析
   - 確認考題顯示來源標籤

3. **重新選擇測試**
   - 上傳3個文件
   - 取消選擇1個文件
   - 確認出現確認 Toast
   - 點擊「重新統整」
   - 確認只分析選中的2個文件

4. **24小時歷史測試**
   - FileSelectionChips 應該顯示最近24小時上傳的所有文件
   - 用戶可以選擇歷史文件重新統整

## 已知限制

1. **AI 生成的來源標示**
   - 目前 `sourceDocId` 需要 AI 在生成考題時填入
   - 如果 AI 沒有填入,則不會顯示來源標籤
   - 需要在 prompt 中明確指示 AI 標記來源

2. **性能考量**
   - 多文件分析會消耗更多 tokens
   - 建議限制最多5個文件同時分析

## 下一步建議

1. **Prompt 優化**
   - 在 `elite-rag-analyzer.ts` 的 prompt 中明確要求 AI 標記每道題的來源文件
   - 例如: "對於每道考題,請在 sourceDocId 欄位中填入該題主要基於的文件 ID"

2. **UI 優化**
   - 考慮添加文件顏色編碼
   - 在摘要中也標示哪些重點來自哪個文件

3. **分析策略**
   - 考慮先單獨分析每個文件
   - 然後合併結果並去重
   - 這樣可以更準確地追蹤來源
