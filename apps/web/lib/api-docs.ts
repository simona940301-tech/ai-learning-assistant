/**
 * OpenAPI/Swagger Documentation Generator
 * 
 * 自動生成 API 文檔
 */

import { NextRequest, NextResponse } from 'next/server'

export interface ApiEndpoint {
  path: string
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH'
  summary: string
  description?: string
  tags?: string[]
  requestBody?: {
    schema: any
    required?: boolean
  }
  parameters?: Array<{
    name: string
    in: 'query' | 'path' | 'header'
    required?: boolean
    schema: any
    description?: string
  }>
  responses: Record<number, {
    description: string
    schema?: any
  }>
}

/**
 * Play Battle API 端點定義
 */
export const playBattleEndpoints: ApiEndpoint[] = [
  {
    path: '/api/play/user/status',
    method: 'GET',
    summary: '獲取用戶狀態',
    description: '獲取用戶的羽毛和錢包餘額',
    tags: ['User'],
    responses: {
      200: {
        description: '成功',
        schema: {
          type: 'object',
          properties: {
            dailyEnergyCount: { type: 'number' },
            walletBalance: { type: 'number' },
            username: { type: 'string' },
          },
        },
      },
      401: { description: '未授權' },
    },
  },
  {
    path: '/api/play/user/energy/consume',
    method: 'POST',
    summary: '消耗羽毛',
    description: '原子性消耗 1 點羽毛',
    tags: ['User'],
    responses: {
      200: {
        description: '成功',
        schema: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            remainingEnergy: { type: 'number' },
          },
        },
      },
      403: { description: '羽毛已耗盡' },
    },
  },
  {
    path: '/api/play/match/queue',
    method: 'POST',
    summary: '加入匹配隊列',
    description: '加入匹配隊列，尋找對手',
    tags: ['Match'],
    requestBody: {
      schema: {
        type: 'object',
        properties: {
          matchType: { type: 'string', enum: ['RANKED', 'WEAKNESS_BATTLE'] },
          subject: { type: 'string', enum: ['chinese', 'english', 'math', 'social', 'science'] },
        },
        required: ['matchType'],
      },
    },
    responses: {
      200: { description: '成功' },
      400: { description: '無效的匹配類型' },
    },
  },
  {
    path: '/api/play/room/create',
    method: 'POST',
    summary: '創建自訂房間',
    description: '創建一個自訂對戰房間',
    tags: ['Room'],
    requestBody: {
      schema: {
        type: 'object',
        properties: {
          roomName: { type: 'string', minLength: 1, maxLength: 50 },
          subject: { type: 'string' },
          questionSource: { type: 'string', enum: ['SYSTEM', 'UGC', 'MIXED'] },
          enableDeceiverOptions: { type: 'boolean' },
          maxPlayers: { type: 'number', minimum: 2, maximum: 10 },
        },
        required: ['roomName'],
      },
    },
    responses: {
      200: { description: '成功' },
      400: { description: '無效的房間設置' },
    },
  },
  {
    path: '/api/play/room/join',
    method: 'POST',
    summary: '加入房間',
    description: '通過房間代碼加入房間',
    tags: ['Room'],
    requestBody: {
      schema: {
        type: 'object',
        properties: {
          roomCode: { type: 'string', pattern: '^[A-Z0-9]{6}$' },
        },
        required: ['roomCode'],
      },
    },
    responses: {
      200: { description: '成功' },
      404: { description: '房間不存在' },
      403: { description: '房間已滿' },
    },
  },
  {
    path: '/api/play/ugc/submit',
    method: 'POST',
    summary: '提交 UGC 題目',
    description: '提交用戶生成的題目',
    tags: ['UGC'],
    requestBody: {
      schema: {
        type: 'object',
        properties: {
          questionText: { type: 'string', minLength: 10, maxLength: 1000 },
          optionA: { type: 'string', maxLength: 200 },
          optionB: { type: 'string', maxLength: 200 },
          optionC: { type: 'string', maxLength: 200 },
          optionD: { type: 'string', maxLength: 200 },
          correctAnswer: { type: 'string', enum: ['A', 'B', 'C', 'D'] },
          subject: { type: 'string', enum: ['chinese', 'english', 'math', 'social', 'science'] },
          difficulty: { type: 'number', minimum: 1, maximum: 5 },
        },
        required: ['questionText', 'optionA', 'optionB', 'optionC', 'optionD', 'correctAnswer', 'subject'],
      },
    },
    responses: {
      200: { description: '成功' },
      400: { description: '驗證失敗' },
    },
  },
  {
    path: '/api/play/contract/lock',
    method: 'POST',
    summary: '鎖定合約金額',
    description: '創建並鎖定合約金額',
    tags: ['Contract'],
    requestBody: {
      schema: {
        type: 'object',
        properties: {
          amount: { type: 'number', minimum: 1, maximum: 1000000 },
          contractType: { type: 'string', enum: ['PVP_BATTLE', 'CHALLENGE', 'TOURNAMENT'] },
          expiresAt: { type: 'string', format: 'date-time' },
        },
        required: ['amount', 'contractType'],
      },
    },
    responses: {
      200: { description: '成功' },
      400: { description: '無效的合約參數' },
      403: { description: '餘額不足' },
    },
  },
  {
    path: '/api/play/contract/list',
    method: 'GET',
    summary: '獲取合約列表',
    description: '獲取用戶相關的合約列表',
    tags: ['Contract'],
    parameters: [
      {
        name: 'status',
        in: 'query',
        schema: { type: 'string', enum: ['PENDING', 'LOCKED', 'SETTLED'] },
      },
      {
        name: 'contractType',
        in: 'query',
        schema: { type: 'string', enum: ['PVP_BATTLE', 'CHALLENGE', 'TOURNAMENT'] },
      },
    ],
    responses: {
      200: { description: '成功' },
    },
  },
  {
    path: '/api/play/contract/accept',
    method: 'POST',
    summary: '承接合約',
    description: '承接一個待處理的合約',
    tags: ['Contract'],
    requestBody: {
      schema: {
        type: 'object',
        properties: {
          contractId: { type: 'string', format: 'uuid' },
        },
        required: ['contractId'],
      },
    },
    responses: {
      200: { description: '成功' },
      404: { description: '合約不存在' },
      403: { description: '餘額不足' },
    },
  },
  {
    path: '/api/play/contract/settle',
    method: 'POST',
    summary: '結算合約',
    description: '結算一個已鎖定的合約',
    tags: ['Contract'],
    requestBody: {
      schema: {
        type: 'object',
        properties: {
          contractId: { type: 'string', format: 'uuid' },
          winnerId: { type: 'string', format: 'uuid' },
          matchId: { type: 'string', format: 'uuid' },
        },
        required: ['contractId', 'winnerId'],
      },
    },
    responses: {
      200: { description: '成功' },
      404: { description: '合約不存在' },
      400: { description: '合約已結算' },
    },
  },
  {
    path: '/api/play/pve/start',
    method: 'POST',
    summary: '開始 PVE 訓練',
    description: '開始個人訓練模式',
    tags: ['PVE'],
    requestBody: {
      schema: {
        type: 'object',
        properties: {
          subject: { type: 'string' },
          focusOnWeakness: { type: 'boolean' },
        },
      },
    },
    responses: {
      200: { description: '成功' },
      400: { description: '暫無可用題目' },
    },
  },
  {
    path: '/api/play/ugc/review/list',
    method: 'GET',
    summary: '獲取待審核 UGC 列表',
    description: '管理員獲取待審核的 UGC 題目',
    tags: ['UGC', 'Admin'],
    parameters: [
      {
        name: 'status',
        in: 'query',
        schema: { type: 'string', enum: ['PENDING', 'APPROVED', 'REJECTED'] },
      },
    ],
    responses: {
      200: { description: '成功' },
      403: { description: '僅管理員可訪問' },
    },
  },
  {
    path: '/api/play/ugc/review',
    method: 'POST',
    summary: '審核 UGC 題目',
    description: '管理員審核 UGC 題目',
    tags: ['UGC', 'Admin'],
    requestBody: {
      schema: {
        type: 'object',
        properties: {
          questionId: { type: 'string', format: 'uuid' },
          action: { type: 'string', enum: ['APPROVE', 'REJECT'] },
          reviewNote: { type: 'string' },
        },
        required: ['questionId', 'action'],
      },
    },
    responses: {
      200: { description: '成功' },
      403: { description: '僅管理員可審核' },
    },
  },
]

/**
 * 生成 OpenAPI 規範
 */
export function generateOpenAPISpec(): any {
  return {
    openapi: '3.0.0',
    info: {
      title: 'Play Battle API',
      version: '1.0.0',
      description: 'Play Battle 系統 API 文檔',
    },
    servers: [
      {
        url: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000',
        description: 'API 服務器',
      },
    ],
    paths: playBattleEndpoints.reduce((paths, endpoint) => {
      const path = endpoint.path.replace('/api', '')
      if (!paths[path]) {
        paths[path] = {}
      }

      paths[path][endpoint.method.toLowerCase()] = {
        summary: endpoint.summary,
        description: endpoint.description,
        tags: endpoint.tags,
        parameters: endpoint.parameters?.map((p) => ({
          name: p.name,
          in: p.in,
          required: p.required,
          schema: p.schema,
          description: p.description,
        })),
        requestBody: endpoint.requestBody
          ? {
              required: endpoint.requestBody.required,
              content: {
                'application/json': {
                  schema: endpoint.requestBody.schema,
                },
              },
            }
          : undefined,
        responses: Object.entries(endpoint.responses).reduce(
          (res, [status, response]) => {
            res[status] = {
              description: response.description,
              content: response.schema
                ? {
                    'application/json': {
                      schema: response.schema,
                    },
                  }
                : undefined,
            }
            return res
          },
          {} as Record<string, any>
        ),
      }

      return paths
    }, {} as Record<string, any>),
  }
}

