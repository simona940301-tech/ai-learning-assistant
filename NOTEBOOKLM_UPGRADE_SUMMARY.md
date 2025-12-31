# Summary Workbench → NotebookLM Level Upgrade 🎓

**Date**: 2025-12-04
**Status**: ✅ **COMPLETED**

## 🎯 Goal

Upgrade the Summary Workbench to NotebookLM-level quality by implementing:
1. Multi-document synthesis (cross-document analysis)
2. Enhanced summary richness (dynamic based on input)
3. Source attribution (track which document contributed what)
4. Unified XML-based context format

---

## ✅ Completed Tasks

### 1. XML Context Formatting in API Route
**File**: [apps/web/app/api/rag/analyze-object/route.ts](apps/web/app/api/rag/analyze-object/route.ts)

**Changes**:
- Lines 54-81: Implemented XML tag wrapping for documents
- Format: `<document index="N" filename="..." type="primary|related">`
- Primary document gets `type="primary"`, related documents get `type="related"`
- Supports both single and multi-document analysis

**Example Output**:
```xml
<document index="1" filename="math_ch1.pdf" type="primary">
[content of primary document]
</document>

<document index="2" filename="math_ch2.pdf" type="related">
[content of related document]
</document>
```

---

### 2. NotebookLM-Level Synthesis Prompt
**File**: [apps/web/lib/services/elite-rag-analyzer.ts](apps/web/lib/services/elite-rag-analyzer.ts)

**Changes** (Lines 70-132):

#### 2a. Multi-Document Synthesis Instructions
- **Forbidden**: Only summarizing the first document
- **Required**: Cross-document comparison and integration
- **Required**: Source attribution in explanations (e.g., *來源: math_ch1.pdf*)
- **Required**: Identify conflicts or complementary information across documents

#### 2b. Dynamic Richness
- Old: Fixed-length summaries
- **New**: Adapt summary length/depth based on input richness
- If input is long and detailed → generate longer, more detailed summaries
- No artificial length constraints for rich content

#### 2c. Cross-Document Question Sets
- **Required**: At least 1 cross-chapter question set (`type: "question_set"`)
- Tests student's ability to integrate information from multiple documents
- Questions should require synthesizing knowledge from different sources

**Key Prompt Sections**:
```markdown
## 核心規則 (CRITICAL)
1. **多文件綜合 (Synthesis)**:
   - 絕對禁止只總結第一份文件
   - 必須交叉比對所有文件的內容
   - 標註來源：*(來源: math_ch1.pdf)* 或 *(綜合整理)*

2. **動態豐富度 (Dynamic Richness)**:
   - 根據輸入長度與深度，自由調整輸出豐富度
   - 不要受限於簡短的格式
   - 確保所有重要細節都被涵蓋
```

---

### 3. Enhanced Schema with Source Tracking
**File**: [apps/web/lib/schemas/gsat-analysis-schema.ts](apps/web/lib/schemas/gsat-analysis-schema.ts)

**Changes**:
- Line 23: Updated `explanation` field description to emphasize multi-source integration
- Line 26: Added `sources` field to `KeyConceptSchema`
  ```typescript
  sources: z.array(z.string()).optional()
    .describe('該概念的來源文件列表，例如：["math_ch1.pdf", "math_ch2.pdf"]')
  ```
- Line 37: Existing `sources` field in `GSATAnalysisSchema` (overall document sources)

**Result**: Concept-level and document-level source tracking

---

### 4. Multi-Document Synthesis Testing
**File**: [test-multi-document-synthesis.ts](test-multi-document-synthesis.ts)

**Test Cases**:
1. **Single Document** (baseline): Short summary for limited content
2. **Multi-Document (Same Subject)**: Math exponential laws + applications
   - Expected: Synthesis of both documents
   - Expected: Source attribution
   - Expected: Richer summary
3. **Multi-Document (Mixed Subjects)**: Math + Physics
   - Expected: Identify multiple subjects
   - Expected: Separate summaries per subject

**Test Data**: Realistic GSAT-level content (指數對數、牛頓運動定律)

**Run Test**:
```bash
npx tsx test-multi-document-synthesis.ts
```

---

## 🔍 Verification Checklist

| Item | Status | Location |
|------|--------|----------|
| XML formatting for multi-docs | ✅ | [route.ts:64-80](apps/web/app/api/rag/analyze-object/route.ts#L64-L80) |
| Synthesis prompt (禁止只總結第一份) | ✅ | [elite-rag-analyzer.ts:73-77](apps/web/lib/services/elite-rag-analyzer.ts#L73-L77) |
| Dynamic richness prompt | ✅ | [elite-rag-analyzer.ts:79-82](apps/web/lib/services/elite-rag-analyzer.ts#L79-L82) |
| Source attribution in prompt | ✅ | [elite-rag-analyzer.ts:77](apps/web/lib/services/elite-rag-analyzer.ts#L77) |
| Schema source tracking | ✅ | [gsat-analysis-schema.ts:26](apps/web/lib/schemas/gsat-analysis-schema.ts#L26) |
| Cross-document question sets | ✅ | [elite-rag-analyzer.ts:107-114](apps/web/lib/services/elite-rag-analyzer.ts#L107-L114) |
| Test data prepared | ✅ | [test-multi-document-synthesis.ts](test-multi-document-synthesis.ts) |

---

## 📊 Before vs. After

### Before
- ❌ Only analyzed first document in multi-doc scenarios
- ❌ Fixed-length summaries (regardless of input richness)
- ❌ No source attribution
- ❌ No cross-document synthesis

### After (NotebookLM-Level)
- ✅ True multi-document synthesis
- ✅ Dynamic summary richness based on input
- ✅ Source tracking at concept and document level
- ✅ Cross-chapter question sets
- ✅ Conflict/complement detection across documents

---

## 🧪 Manual Testing Guide

1. **Start Dev Server**:
   ```bash
   pnpm --filter web dev
   ```

2. **Upload Multiple Related Documents**:
   - Upload `math_ch1.pdf` (指數與對數)
   - Upload `math_ch2.pdf` (指數函數應用)

3. **Test Multi-Document Analysis**:
   - Go to "重點統整" (Summary Workbench)
   - Select primary document (e.g., `math_ch1.pdf`)
   - Click "選擇相關文件" button
   - Select related documents (e.g., `math_ch2.pdf`)
   - Click "生成摘要"

4. **Verify Output**:
   - ✅ Summary mentions concepts from **both** documents
   - ✅ Source attribution: `(來源: math_ch1.pdf, math_ch2.pdf)`
   - ✅ Key concepts show `sources: ["math_ch1.pdf", "math_ch2.pdf"]`
   - ✅ At least 1 question set that requires integrating both chapters
   - ✅ Longer, richer summary for longer input

---

## 🚀 Impact

### For Students
- **Better understanding** through cross-document synthesis
- **Clear source tracking** for reference and verification
- **More comprehensive summaries** for complex topics
- **Cross-chapter questions** to test integrated knowledge

### For the Platform
- **NotebookLM-level quality** analysis
- **Scalable** to N documents (not just 1)
- **Transparent** source attribution
- **Adaptive** summary richness

---

## 📝 Next Steps (Optional Enhancements)

1. **Frontend UI**:
   - Add visual indicators for multi-document analysis
   - Show source tags in the summary UI
   - Allow users to filter concepts by source document

2. **Advanced Synthesis**:
   - Detect contradictions between documents
   - Suggest reading order based on concept dependencies
   - Generate concept maps across documents

3. **Performance**:
   - Cache multi-document analysis results
   - Parallel processing for large document sets

---

## 🔗 Related Files

- [apps/web/app/api/rag/analyze-object/route.ts](apps/web/app/api/rag/analyze-object/route.ts) - API route with XML formatting
- [apps/web/lib/services/elite-rag-analyzer.ts](apps/web/lib/services/elite-rag-analyzer.ts) - Synthesis prompt
- [apps/web/lib/schemas/gsat-analysis-schema.ts](apps/web/lib/schemas/gsat-analysis-schema.ts) - Enhanced schema
- [test-multi-document-synthesis.ts](test-multi-document-synthesis.ts) - Test suite

---

**Completed by**: Claude Code
**Review Status**: Ready for QA testing ✅
