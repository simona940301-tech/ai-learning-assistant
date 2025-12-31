# RAG API 完整參考文檔

> Elite RAG Analyzer API v2.0
> 最後更新：2025-11-27

---

## 目錄

1. [API 概覽](#api-概覽)
2. [認證](#認證)
3. [端點詳情](#端點詳情)
4. [數據模型](#數據模型)
5. [錯誤處理](#錯誤處理)
6. [速率限制](#速率限制)
7. [示例代碼](#示例代碼)

---

## API 概覽

Base URL: `https://your-domain.com/api`

### 可用端點

| 方法 | 端點 | 描述 |
|------|------|------|
| POST | `/rag/upload-elite` | 上傳文件並啟動分析 |
| GET | `/rag/upload-elite?analysisId={id}` | 查詢分析狀態 |
| GET | `/rag/upload-elite/stream?analysisId={id}` | SSE 實時推送 |

---

## 認證

所有 API 請求需要有效的用戶會話。

### Cookie-based Auth

```http
Cookie: sb-access-token=<your-jwt-token>
```

### Bearer Token

```http
Authorization: Bearer <your-jwt-token>
```

---

## 端點詳情

### 1. 上傳文件

啟動文件分析流程。

**端點:** `POST /api/rag/upload-elite`

**Headers:**
```http
Content-Type: multipart/form-data
```

**Body (FormData):**
```typescript
{
    file: File | File[]  // 支援單個或多個文件
}
```

**支援格式:**
- PDF: `application/pdf`, `.pdf`
- Text: `text/plain`, `.txt`
- Images: `image/jpeg`, `image/png`, `image/gif`

**文件大小限制:** 20MB

#### Response (Success)

```json
{
    "success": true,
    "fileId": "550e8400-e29b-41d4-a716-446655440000",
    "analysisId": "6ba7b810-9dad-11d1-80b4-00c04fd430c8",
    "fileName": "example.pdf",
    "numPages": 0,
    "status": "pending",
    "message": "檔案上傳成功，正在提取內容...",
    "cached": false
}
```

**字段說明:**

| 字段 | 類型 | 描述 |
|------|------|------|
| `success` | boolean | 請求是否成功 |
| `fileId` | string | 文件唯一標識符 (UUID) |
| `analysisId` | string | 分析任務 ID (UUID) |
| `fileName` | string | 文件名稱 |
| `numPages` | number | 頁數（上傳時為 0） |
| `status` | string | 初始狀態 (`pending`) |
| `message` | string | 狀態描述 |
| `cached` | boolean | 是否使用緩存結果 |

#### Response (Error)

```json
{
    "error": "VALIDATION_ERROR",
    "message": "請上傳文件"
}
```

**錯誤代碼:**

| 錯誤代碼 | HTTP 狀態 | 描述 |
|----------|----------|------|
| `UNAUTHORIZED` | 401 | 未登入或 Token 無效 |
| `VALIDATION_ERROR` | 400 | 請求格式錯誤 |
| `INVALID_FILE_TYPE` | 400 | 不支援的文件格式 |
| `DATABASE_ERROR` | 500 | 數據庫錯誤 |
| `INTERNAL_ERROR` | 500 | 伺服器內部錯誤 |

---

### 2. 查詢分析狀態

輪詢分析進度和結果。

**端點:** `GET /api/rag/upload-elite`

**Query Parameters:**
```
analysisId: string (required)
```

#### Response (Success)

```json
{
    "success": true,
    "analysis": {
        "id": "6ba7b810-9dad-11d1-80b4-00c04fd430c8",
        "status": "prediction_ready",
        "processingTimeMs": 8234,
        "quickSummary": "本文檔介紹微積分的基本概念...",
        "detectedSubject": "math",
        "detectedTopics": ["微積分", "導數", "積分"],
        "coreConcepts": [
            {
                "name": "導數",
                "explanation": "函數的瞬時變化率",
                "importance": 5,
                "pageRefs": [1, 2]
            }
        ],
        "keyInsights": [
            {
                "insight": "微積分是分析變化的數學工具",
                "evidence": "...",
                "pageRefs": [1]
            }
        ],
        "suggestedQuestions": [
            {
                "question": "什麼是導數？",
                "difficulty": 2,
                "topic": "基礎概念"
            }
        ],
        "structuredNotes": "# 📚 數學\n\n## 📋 快速預覽\n...",
        "examPredictions": [
            {
                "questionText": "求 f(x) = x² 在 x=2 的導數",
                "questionType": "multiple_choice",
                "options": [
                    {
                        "label": "A",
                        "text": "2",
                        "isCorrect": false
                    },
                    {
                        "label": "B",
                        "text": "4",
                        "isCorrect": true
                    }
                ],
                "correctAnswer": "B",
                "explanation": "使用導數公式...",
                "difficulty": 3,
                "topicTags": ["導數", "計算"],
                "sourcePages": [5],
                "confidenceScore": 0.9
            }
        ],
        "weakPoints": [
            {
                "concept": "極限概念",
                "reason": "需要抽象思維",
                "practiceSuggestion": "多做基礎題目"
            }
        ],
        "studyRoadmap": [
            {
                "phase": "階段一：基礎概念",
                "topics": ["函數", "極限"],
                "estimatedHours": 5
            }
        ],
        "errorMessage": null
    }
}
```

**Status 值:**

| Status | 描述 |
|--------|------|
| `pending` | 等待處理 |
| `processing` | 正在提取文本 |
| `analysis_ready` | 重點統整完成 |
| `prediction_ready` | 考題預測完成（最終狀態） |
| `failed` | 分析失敗 |

#### Response (Error)

```json
{
    "error": "NOT_FOUND",
    "message": "找不到分析記錄"
}
```

---

### 3. SSE 實時推送

使用 Server-Sent Events 接收即時更新。

**端點:** `GET /api/rag/upload-elite/stream`

**Query Parameters:**
```
analysisId: string (required)
```

**Response Type:** `text/event-stream`

#### Event Stream 格式

```
data: {"id":"...","status":"processing","processing_time_ms":1234}

data: {"id":"...","status":"processing","quick_summary":"...","detected_subject":"math"}

data: {"id":"...","status":"analysis_ready","structured_notes":"# 完整內容..."}

data: {"id":"...","status":"prediction_ready","exam_predictions":[...]}
```

#### 使用示例

```typescript
const eventSource = new EventSource(
    `/api/rag/upload-elite/stream?analysisId=${analysisId}`
)

eventSource.onmessage = (event) => {
    const data = JSON.parse(event.data)
    console.log('Update:', data)

    if (data.status === 'prediction_ready' || data.status === 'failed') {
        eventSource.close()
    }
}

eventSource.onerror = (error) => {
    console.error('SSE Error:', error)
    eventSource.close()
}
```

---

## 數據模型

### FileAnalysis

```typescript
interface FileAnalysis {
    id: string                      // UUID
    status: AnalysisStatus
    processingTimeMs?: number        // 處理時間（毫秒）

    // Layer 1: Quick Preview
    quickSummary?: string
    detectedSubject?: string         // 'chinese' | 'english' | 'math' | 'science' | 'social' | 'other'
    detectedTopics?: string[]

    // Layer 2: Deep Analysis
    coreConcepts?: CoreConcept[]
    keyInsights?: KeyInsight[]
    suggestedQuestions?: SuggestedQuestion[]
    structuredNotes?: string         // Markdown 格式

    // Layer 3: Exam Prediction
    examPredictions?: ExamQuestion[]
    weakPoints?: WeakPoint[]
    studyRoadmap?: StudyPhase[]

    // Error Handling
    errorMessage?: string
}
```

### CoreConcept

```typescript
interface CoreConcept {
    name: string                     // 概念名稱
    explanation: string              // 說明
    importance: number               // 1-5
    pageRefs: number[]               // 來源頁碼
}
```

### KeyInsight

```typescript
interface KeyInsight {
    insight: string                  // 洞察
    evidence: string                 // 證據
    pageRefs: number[]
}
```

### SuggestedQuestion

```typescript
interface SuggestedQuestion {
    question: string
    difficulty: number               // 1-5
    topic: string
}
```

### ExamQuestion

```typescript
interface ExamQuestion {
    questionText: string
    questionType: 'multiple_choice' | 'short_answer' | 'essay' | 'calculation'
    options?: QuestionOption[]
    correctAnswer: string
    explanation: string
    difficulty: number               // 1-5
    topicTags: string[]
    sourcePages: number[]
    confidenceScore: number          // 0-1
}

interface QuestionOption {
    label: string                    // 'A', 'B', 'C', 'D'
    text: string
    isCorrect: boolean
}
```

### WeakPoint

```typescript
interface WeakPoint {
    concept: string
    reason: string
    practiceSuggestion: string
}
```

### StudyPhase

```typescript
interface StudyPhase {
    phase: string                    // "階段一：基礎概念"
    topics: string[]
    estimatedHours: number
}
```

---

## 錯誤處理

### 標準錯誤格式

```json
{
    "error": "ERROR_CODE",
    "message": "人類可讀的錯誤描述"
}
```

### 常見錯誤代碼

| 代碼 | HTTP | 原因 | 解決方案 |
|------|------|------|---------|
| `UNAUTHORIZED` | 401 | 未登入 | 檢查 Token |
| `VALIDATION_ERROR` | 400 | 請求格式錯誤 | 檢查請求參數 |
| `INVALID_FILE_TYPE` | 400 | 文件格式不支援 | 使用 PDF/TXT/Image |
| `NOT_FOUND` | 404 | 分析記錄不存在 | 檢查 analysisId |
| `DATABASE_ERROR` | 500 | 數據庫錯誤 | 聯繫技術支持 |
| `INTERNAL_ERROR` | 500 | 伺服器錯誤 | 檢查日誌 |

### 錯誤處理最佳實踐

```typescript
try {
    const response = await fetch('/api/rag/upload-elite', {
        method: 'POST',
        body: formData
    })

    if (!response.ok) {
        const error = await response.json()

        switch (error.error) {
            case 'UNAUTHORIZED':
                // 跳轉登入頁
                router.push('/login')
                break
            case 'INVALID_FILE_TYPE':
                // 顯示文件格式錯誤
                alert('請上傳 PDF、TXT 或圖片文件')
                break
            default:
                // 通用錯誤處理
                alert(error.message || '上傳失敗，請稍後再試')
        }

        return
    }

    const data = await response.json()
    // 處理成功響應...

} catch (error) {
    console.error('Network error:', error)
    alert('網絡錯誤，請檢查連接')
}
```

---

## 速率限制

### 限制策略

| 端點 | 限制 | 時間窗口 |
|------|------|---------|
| POST /rag/upload-elite | 10 請求 | 1 分鐘 |
| GET /rag/upload-elite | 60 請求 | 1 分鐘 |
| GET /rag/upload-elite/stream | 5 連接 | 同時 |

### 超出限制的響應

```json
{
    "error": "RATE_LIMIT_EXCEEDED",
    "message": "請求過於頻繁，請稍後再試",
    "retryAfter": 60
}
```

**HTTP Header:**
```http
X-RateLimit-Limit: 10
X-RateLimit-Remaining: 0
X-RateLimit-Reset: 1640995200
```

---

## 示例代碼

### JavaScript/TypeScript

```typescript
// 完整流程：上傳 → 輪詢 → 顯示結果
async function uploadAndAnalyze(file: File) {
    try {
        // 1. 上傳文件
        const formData = new FormData()
        formData.append('file', file)

        const uploadRes = await fetch('/api/rag/upload-elite', {
            method: 'POST',
            body: formData
        })

        if (!uploadRes.ok) {
            throw new Error('Upload failed')
        }

        const { analysisId } = await uploadRes.json()
        console.log('Analysis started:', analysisId)

        // 2. 輪詢結果
        const result = await pollAnalysis(analysisId)

        // 3. 顯示結果
        displayAnalysis(result)

    } catch (error) {
        console.error('Error:', error)
    }
}

async function pollAnalysis(analysisId: string, timeout = 30000) {
    const startTime = Date.now()
    const interval = 2000 // 2秒

    while (Date.now() - startTime < timeout) {
        const res = await fetch(
            `/api/rag/upload-elite?analysisId=${analysisId}`
        )

        const { analysis } = await res.json()

        if (analysis.status === 'prediction_ready') {
            return analysis
        }

        if (analysis.status === 'failed') {
            throw new Error(analysis.errorMessage)
        }

        await new Promise(resolve => setTimeout(resolve, interval))
    }

    throw new Error('Analysis timeout')
}
```

### Python

```python
import requests
import time

def upload_and_analyze(file_path):
    """上傳文件並分析"""

    # 1. 上傳
    with open(file_path, 'rb') as f:
        files = {'file': f}
        response = requests.post(
            'http://localhost:3000/api/rag/upload-elite',
            files=files
        )

    if not response.ok:
        raise Exception('Upload failed')

    data = response.json()
    analysis_id = data['analysisId']
    print(f'Analysis started: {analysis_id}')

    # 2. 輪詢
    while True:
        response = requests.get(
            f'http://localhost:3000/api/rag/upload-elite',
            params={'analysisId': analysis_id}
        )

        result = response.json()
        analysis = result['analysis']

        print(f'Status: {analysis["status"]}')

        if analysis['status'] == 'prediction_ready':
            return analysis

        if analysis['status'] == 'failed':
            raise Exception(analysis.get('errorMessage', 'Analysis failed'))

        time.sleep(2)

# 使用
result = upload_and_analyze('example.pdf')
print('Analysis completed!')
print(result['structuredNotes'])
```

### curl

```bash
# 1. 上傳文件
curl -X POST http://localhost:3000/api/rag/upload-elite \
  -F "file=@example.pdf" \
  -H "Cookie: sb-access-token=YOUR_TOKEN"

# 2. 查詢狀態
curl -X GET "http://localhost:3000/api/rag/upload-elite?analysisId=YOUR_ANALYSIS_ID" \
  -H "Cookie: sb-access-token=YOUR_TOKEN"

# 3. SSE Stream（使用 curl 不推薦，建議用瀏覽器或專門工具）
curl -N -X GET "http://localhost:3000/api/rag/upload-elite/stream?analysisId=YOUR_ANALYSIS_ID" \
  -H "Cookie: sb-access-token=YOUR_TOKEN"
```

---

## 附錄

### A. Subject 類型對照表

| Code | 中文 | English |
|------|------|---------|
| `chinese` | 國文 | Chinese |
| `english` | 英文 | English |
| `math` | 數學 | Mathematics |
| `science` | 自然 | Science |
| `social` | 社會 | Social Studies |
| `other` | 其他 | Other |

### B. Question Type 類型

| Type | 描述 |
|------|------|
| `multiple_choice` | 選擇題 |
| `short_answer` | 簡答題 |
| `essay` | 申論題 |
| `calculation` | 計算題 |

### C. 版本歷史

| 版本 | 日期 | 變更 |
|------|------|------|
| 2.0 | 2025-11-27 | Ultimate Parallel Edition |
| 1.5 | 2025-11-20 | 添加 SSE 支持 |
| 1.0 | 2025-11-01 | 初始版本 |

---

**維護**: AI Engineering Team
**聯繫**: api-support@example.com
