/**
 * 契約測試：確保 API 響應格式不變
 * 
 * 目的：只要有人把 ok({ ... }) 包裝或欄位動到，CI 立即亮紅燈
 */

import { describe, it, expect } from 'vitest'

/**
 * 測試輔助函數：發送 POST 請求
 */
async function post(endpoint: string, data: any) {
  const baseUrl = process.env.TEST_BASE_URL || 'http://localhost:4001'
  const response = await fetch(`${baseUrl}${endpoint}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(data),
  })

  if (!response.ok) {
    const text = await response.text()
    throw new Error(`HTTP ${response.status}: ${text}`)
  }

  return response.json()
}

describe('POST /api/solve - 契約測試', () => {
  it('keeps response contract - success format', async () => {
    const res = await post('/api/solve', {
      subject: 'math',
      prompt: '解方程 x+1=2',
      mode: 'step',
    })

    // 必須有 success 字段
    expect(res).toHaveProperty('success')
    
    // 成功時必須是 true
    if (res.success === true) {
      // 必須有 data 字段
      expect(res).toHaveProperty('data')
      
      // data 中必須包含舊格式的所有字段（前端依賴）
      expect(res.data).toHaveProperty('subject')
      expect(res.data).toHaveProperty('confidence')
      expect(res.data).toHaveProperty('detected_keypoint')
      expect(res.data).toHaveProperty('phase')
      expect(res.data).toHaveProperty('summary')
      expect(res.data).toHaveProperty('steps')
      expect(res.data).toHaveProperty('checks')
      expect(res.data).toHaveProperty('error_hints')
      expect(res.data).toHaveProperty('extensions')
      
      // 類型檢查
      expect(typeof res.data.subject).toBe('string')
      expect(typeof res.data.confidence).toBe('number')
      expect(typeof res.data.detected_keypoint).toBe('string')
      expect(res.data.phase).toBe('solve')
      expect(Array.isArray(res.data.steps)).toBe(true)
      expect(Array.isArray(res.data.checks)).toBe(true)
      expect(Array.isArray(res.data.error_hints)).toBe(true)
      expect(Array.isArray(res.data.extensions)).toBe(true)
    }
  }, 10000) // 10 秒超時

  it('keeps response contract - error format', async () => {
    // 故意發送無效請求觸發錯誤
    const res = await post('/api/solve', {
      subject: 'invalid_subject_that_does_not_exist',
      prompt: 'test',
    })

    // 錯誤響應格式
    expect(res).toHaveProperty('success')
    expect(res.success).toBe(false)
    expect(res).toHaveProperty('error')
    expect(typeof res.error).toBe('string')
  }, 10000)

  it('maintains backward compatibility - old fields still exist', async () => {
    const res = await post('/api/solve', {
      subject: 'math',
      prompt: 'test question',
      mode: 'fast',
    })

    if (res.success === true && res.data) {
      // 確保舊前端依賴的字段仍然存在
      const oldFormat = res.data
      
      // 這些字段是舊前端直接使用的
      expect(oldFormat).toHaveProperty('subject')
      expect(oldFormat).toHaveProperty('detected_keypoint')
      expect(oldFormat).toHaveProperty('summary')
      
      // 確保數據結構完整
      expect(oldFormat.subject).toBeTruthy()
      expect(oldFormat.detected_keypoint).toBeTruthy()
    }
  }, 10000)
})

