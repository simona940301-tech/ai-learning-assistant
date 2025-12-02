# RAG 系統最佳實踐

> 生產環境部署與優化指南
> 最後更新：2025-11-27

---

## 🎯 核心原則

### 1. 安全第一
- ✅ **永遠驗證用戶權限**
- ✅ **限制文件大小和類型**
- ✅ **防止路徑遍歷攻擊**
- ✅ **清理用戶輸入**

### 2. 性能優先
- ⚡ **異步處理重任務**
- ⚡ **利用緩存減少重複計算**
- ⚡ **並行處理提升吞吐量**
- ⚡ **監控並優化瓶頸**

### 3. 用戶體驗至上
- 🎨 **即時反饋（<1s 響應）**
- 🎨 **漸進式顯示內容**
- 🎨 **優雅的錯誤處理**
- 🎨 **清晰的狀態指示**

---

## 💻 開發最佳實踐

### 文件上傳

#### ✅ 好的做法

```typescript
// 1. 客戶端驗證
function validateFile(file: File): string | null {
    // 檢查文件類型
    const validTypes = ['application/pdf', 'text/plain', 'image/jpeg', 'image/png']
    if (!validTypes.includes(file.type)) {
        return '僅支援 PDF、TXT 和圖片文件'
    }

    // 檢查文件大小
    const maxSize = 20 * 1024 * 1024 // 20MB
    if (file.size > maxSize) {
        return '文件大小不能超過 20MB'
    }

    // 檢查文件名
    if (file.name.length > 255) {
        return '文件名過長'
    }

    return null
}

// 2. 安全上傳
async function uploadFile(file: File) {
    const error = validateFile(file)
    if (error) {
        throw new Error(error)
    }

    const formData = new FormData()
    formData.append('file', file)

    try {
        const response = await fetch('/api/rag/upload-elite', {
            method: 'POST',
            body: formData
        })

        if (!response.ok) {
            const error = await response.json()
            throw new Error(error.message || 'Upload failed')
        }

        return await response.json()
    } catch (error) {
        console.error('[Upload Error]', error)
        throw error
    }
}
```

#### ❌ 避免的做法

```typescript
// ❌ 不檢查就直接上傳
async function badUpload(file: File) {
    const formData = new FormData()
    formData.append('file', file)
    await fetch('/api/rag/upload-elite', { method: 'POST', body: formData })
}

// ❌ 忽略錯誤
fetch('/api/rag/upload-elite', { method: 'POST', body: formData })
    .then(res => res.json())
    .then(data => console.log(data))
// 沒有 catch 錯誤！
```

### 狀態輪詢

#### ✅ 好的做法

```typescript
async function pollAnalysis(analysisId: string) {
    const maxRetries = 20
    const interval = 2000 // 2秒
    let retries = 0

    while (retries < maxRetries) {
        try {
            const response = await fetch(
                `/api/rag/upload-elite?analysisId=${analysisId}`
            )

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}`)
            }

            const { analysis } = await response.json()

            // 完成狀態
            if (analysis.status === 'prediction_ready') {
                return analysis
            }

            // 失敗狀態
            if (analysis.status === 'failed') {
                throw new Error(analysis.errorMessage || 'Analysis failed')
            }

            // 等待後重試
            await new Promise(resolve => setTimeout(resolve, interval))
            retries++

        } catch (error) {
            console.error('[Poll Error]', error)
            throw error
        }
    }

    throw new Error('Analysis timeout')
}
```

#### ❌ 避免的做法

```typescript
// ❌ 輪詢過於頻繁
setInterval(() => pollAnalysis(id), 500) // 每 500ms 一次太頻繁！

// ❌ 沒有超時控制
while (true) {
    const result = await pollAnalysis(id)
    if (result.status === 'ready') break
    // 可能永遠不會結束！
}

// ❌ 忽略錯誤繼續輪詢
setInterval(async () => {
    try {
        await pollAnalysis(id)
    } catch (e) {
        // 靜默忽略錯誤，繼續輪詢
    }
}, 2000)
```

### SSE 連接

#### ✅ 好的做法

```typescript
function useSSEAnalysis(analysisId: string) {
    const [analysis, setAnalysis] = useState<FileAnalysis | null>(null)
    const [error, setError] = useState<string | null>(null)

    useEffect(() => {
        if (!analysisId) return

        const eventSource = new EventSource(
            `/api/rag/upload-elite/stream?analysisId=${analysisId}`
        )

        // 處理消息
        eventSource.onmessage = (event) => {
            try {
                const data = JSON.parse(event.data)
                setAnalysis(data)

                // 完成時關閉連接
                if (data.status === 'prediction_ready' || data.status === 'failed') {
                    eventSource.close()
                }
            } catch (err) {
                console.error('[SSE Parse Error]', err)
            }
        }

        // 處理錯誤
        eventSource.onerror = (err) => {
            console.error('[SSE Error]', err)
            setError('連接中斷，請刷新頁面')
            eventSource.close()
        }

        // 清理資源
        return () => {
            eventSource.close()
        }
    }, [analysisId])

    return { analysis, error }
}
```

#### ❌ 避免的做法

```typescript
// ❌ 沒有清理資源
useEffect(() => {
    const es = new EventSource(url)
    es.onmessage = handleMessage
    // 忘記清理！組件卸載時連接仍然存在
}, [])

// ❌ 沒有錯誤處理
const es = new EventSource(url)
es.onmessage = (e) => {
    const data = JSON.parse(e.data) // 可能拋出異常
    setData(data)
}
// 沒有 onerror 處理器
```

---

## 🏗️ 架構最佳實踐

### 異步處理

```typescript
// ✅ 立即返回 + 後台處理
export async function POST(req: NextRequest) {
    // 1. 快速驗證
    const { user } = await getApiUser(req)
    if (!user) return unauthorized()

    // 2. 創建記錄
    const analysisId = randomUUID()
    await createAnalysisRecord(analysisId, user.id)

    // 3. 立即返回
    const response = NextResponse.json({ analysisId, status: 'pending' })

    // 4. 啟動後台任務（不 await）
    processAnalysisInBackground(analysisId, file).catch(console.error)

    return response
}
```

### 錯誤處理層次

```typescript
// Layer 1: API 層錯誤處理
export async function POST(req: NextRequest) {
    try {
        // API 邏輯
    } catch (error) {
        console.error('[API Error]', error)
        return NextResponse.json(
            { error: 'INTERNAL_ERROR', message: '請稍後再試' },
            { status: 500 }
        )
    }
}

// Layer 2: Service 層錯誤處理
async function processAnalysis(text: string) {
    try {
        return await generateAnalysis(text)
    } catch (error) {
        console.error('[Service Error]', error)

        // 降級策略
        return fallbackAnalysis(text)
    }
}

// Layer 3: Model 層錯誤處理
async function generateAnalysis(text: string) {
    try {
        const result = await model.generateContent(text)
        return result.response.text()
    } catch (error) {
        if (error.message.includes('quota')) {
            throw new Error('API 配額已用盡')
        }
        if (error.message.includes('timeout')) {
            throw new Error('請求超時')
        }
        throw error
    }
}
```

### 緩存策略

```typescript
// ✅ 多層緩存
async function getAnalysis(fileHash: string) {
    // L1: 內存緩存（最快）
    const memCache = memoryCache.get(fileHash)
    if (memCache) return memCache

    // L2: Redis 緩存
    const redisCache = await redis.get(`analysis:${fileHash}`)
    if (redisCache) {
        memoryCache.set(fileHash, redisCache)
        return redisCache
    }

    // L3: 數據庫
    const dbResult = await supabase
        .from('file_analysis')
        .select('*')
        .eq('file_hash', fileHash)
        .single()

    if (dbResult.data) {
        await redis.set(`analysis:${fileHash}`, dbResult.data, 'EX', 3600)
        memoryCache.set(fileHash, dbResult.data)
        return dbResult.data
    }

    return null
}
```

---

## 🔒 安全最佳實踐

### 1. 輸入驗證

```typescript
// ✅ 嚴格驗證
function validateAnalysisId(id: string): boolean {
    // UUID v4 格式
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
    return uuidRegex.test(id)
}

// ✅ 清理文件名
function sanitizeFileName(name: string): string {
    return name
        .replace(/[^a-zA-Z0-9\u4e00-\u9fa5._-]/g, '_') // 移除特殊字符
        .substring(0, 255) // 限制長度
}
```

### 2. 權限檢查

```typescript
// ✅ 每次操作都驗證
export async function GET(req: NextRequest) {
    const { supabase, user } = await getApiUser(req)

    if (!user) {
        return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 })
    }

    const analysisId = req.nextUrl.searchParams.get('analysisId')

    // 確保用戶只能訪問自己的分析
    const { data } = await supabase
        .from('file_analysis')
        .select('*')
        .eq('id', analysisId)
        .eq('user_id', user.id) // 重要！
        .single()

    if (!data) {
        return NextResponse.json({ error: 'NOT_FOUND' }, { status: 404 })
    }

    return NextResponse.json({ analysis: data })
}
```

### 3. 速率限制

```typescript
// ✅ 使用 Redis 實現速率限制
async function checkRateLimit(userId: string, endpoint: string): Promise<boolean> {
    const key = `ratelimit:${endpoint}:${userId}`
    const current = await redis.incr(key)

    if (current === 1) {
        await redis.expire(key, 60) // 60秒過期
    }

    const limit = endpoint === 'upload' ? 10 : 60
    return current <= limit
}

// 使用
export async function POST(req: NextRequest) {
    const { user } = await getApiUser(req)

    if (!await checkRateLimit(user.id, 'upload')) {
        return NextResponse.json(
            { error: 'RATE_LIMIT_EXCEEDED' },
            { status: 429 }
        )
    }

    // 處理請求...
}
```

---

## ⚡ 性能優化

### 1. 數據庫優化

```sql
-- ✅ 創建必要的索引
CREATE INDEX idx_file_analysis_user_status
ON file_analysis(user_id, status);

CREATE INDEX idx_file_analysis_created_at
ON file_analysis(created_at DESC);

CREATE INDEX idx_file_analysis_file_hash
ON file_analysis(file_hash)
WHERE status = 'prediction_ready';
```

### 2. API 響應優化

```typescript
// ✅ 只返回必要字段
const { data } = await supabase
    .from('file_analysis')
    .select('id, status, structured_notes, exam_predictions')
    .eq('id', analysisId)
    .single()

// ❌ 避免返回所有字段
const { data } = await supabase
    .from('file_analysis')
    .select('*') // 可能包含大量不必要的數據
    .eq('id', analysisId)
    .single()
```

### 3. 並行處理

```typescript
// ✅ 並行執行獨立任務
const [preview, summary, questions] = await Promise.all([
    generatePreview(text),
    generateSummary(text),
    generateQuestions(text)
])

// ❌ 順序執行（慢）
const preview = await generatePreview(text)
const summary = await generateSummary(text)
const questions = await generateQuestions(text)
```

---

## 📊 監控與日誌

### 結構化日誌

```typescript
// ✅ 使用結構化日誌
console.log('[RAG][Upload]', {
    userId: user.id,
    fileName: file.name,
    fileSize: file.size,
    analysisId,
    timestamp: new Date().toISOString()
})

// ✅ 記錄性能指標
console.log('[RAG][Performance]', {
    analysisId,
    stage: 'extraction',
    duration: Date.now() - startTime,
    textLength: extractedText.length
})

// ❌ 避免混亂的日誌
console.log('uploading file...', file, user, 'started at', new Date())
```

### 錯誤追蹤

```typescript
// ✅ 詳細的錯誤上下文
try {
    await processAnalysis(analysisId)
} catch (error) {
    console.error('[RAG][Error]', {
        analysisId,
        stage: 'processing',
        error: error instanceof Error ? {
            name: error.name,
            message: error.message,
            stack: error.stack
        } : String(error),
        timestamp: new Date().toISOString()
    })

    // 記錄到數據庫
    await supabase
        .from('error_logs')
        .insert({
            service: 'rag',
            analysis_id: analysisId,
            error_message: error.message,
            error_stack: error.stack
        })
}
```

---

## 🧪 測試最佳實踐

### 單元測試

```typescript
// elite-rag-analyzer.test.ts
describe('generateQuickPreview', () => {
    it('應該在3秒內返回預覽', async () => {
        const text = '這是測試文本'
        const start = Date.now()

        const result = await generateQuickPreview(text)

        expect(Date.now() - start).toBeLessThan(3000)
        expect(result.summary).toBeDefined()
        expect(result.subject).toBeDefined()
    })

    it('應該正確識別科目', async () => {
        const mathText = '微積分是數學的重要分支'
        const result = await generateQuickPreview(mathText)

        expect(result.subject).toBe('math')
    })
})
```

### 集成測試

```bash
# 運行完整流程測試
tsx tests/rag/test-rag-complete-flow.ts

# 運行性能基準測試
tsx tests/rag/performance-benchmark.ts
```

---

## 📝 部署檢查清單

### 上線前檢查

- [ ] 環境變量已配置（GEMINI_API_KEY, SUPABASE_URL, etc.）
- [ ] 數據庫遷移已執行
- [ ] Redis 連接正常
- [ ] 文件上傳限制已設置
- [ ] 速率限制已啟用
- [ ] 監控告警已配置
- [ ] 錯誤日誌記錄正常
- [ ] 性能基準測試通過
- [ ] 安全掃描通過

### 上線後監控

```sql
-- 監控分析成功率
SELECT
    DATE(created_at) as date,
    COUNT(*) as total,
    SUM(CASE WHEN status = 'prediction_ready' THEN 1 ELSE 0 END) as success,
    ROUND(100.0 * SUM(CASE WHEN status = 'prediction_ready' THEN 1 ELSE 0 END) / COUNT(*), 2) as success_rate
FROM file_analysis
WHERE created_at > NOW() - INTERVAL '7 days'
GROUP BY DATE(created_at)
ORDER BY date DESC;

-- 監控平均處理時間
SELECT
    AVG(processing_time_ms) as avg_ms,
    MAX(processing_time_ms) as max_ms,
    MIN(processing_time_ms) as min_ms
FROM file_analysis
WHERE status = 'prediction_ready'
AND created_at > NOW() - INTERVAL '24 hours';
```

---

## 🔄 持續優化

### 性能追蹤

1. **定期運行基準測試**
   ```bash
   # 每週運行一次
   tsx tests/rag/performance-benchmark.ts > benchmark-$(date +%Y%m%d).log
   ```

2. **分析慢查詢**
   ```sql
   SELECT * FROM file_analysis
   WHERE processing_time_ms > 15000
   ORDER BY created_at DESC
   LIMIT 10;
   ```

3. **優化熱點路徑**
   - 識別最常執行的代碼
   - 優化最耗時的操作
   - 添加緩存減少重複計算

### 用戶反饋

- 收集用戶對分析質量的評價
- 追蹤分析失敗的案例
- 持續改進 AI Prompts

---

**維護者**: AI Engineering Team
**更新頻率**: 每月
**下次審查**: 2025-12-27
