import ws from 'k6/ws'
import { check } from 'k6'
import { Counter, Rate, Trend } from 'k6/metrics'

/**
 * 場景 2: 實時對戰峰值測試 (P2, P5)
 * 
 * 目標: 驗證 10k+ WebSocket 連接的穩定性
 * 
 * 測試流程:
 * 1. 連接 WebSocket (10k 連接)
 * 2. 發送 AUTH 消息
 * 3. 發送 START_MATCH (PVE 模式，避免匹配複雜度)
 * 4. 等待 LOBBY_CONFIRMING
 * 5. 發送 CONFIRM_LOBBY
 * 6. 模擬對戰：發送 10 條 SubmitAnswer 消息
 * 7. 監聽 P5 倒數消息（LOBBY_CONFIRMING countdown）
 * 8. 記錄指標
 */

// 自定義指標
const wsConnections = new Counter('ws_connections_total')
const wsConnectionErrors = new Counter('ws_connection_errors')
const answerLatency = new Trend('answer_latency_ms')
const countdownAccuracy = new Rate('countdown_accuracy')
const messageLoss = new Counter('message_loss')

// 測試配置
export const options = {
  stages: [
    { duration: '60s', target: 1000 },   // 逐步增加到 1k 連接
    { duration: '120s', target: 5000 },  // 增加到 5k 連接
    { duration: '120s', target: 10000 }, // 峰值 10k 連接
    { duration: '60s', target: 10000 },  // 維持 10k 連接
    { duration: '60s', target: 0 },      // 逐步減少
  ],
  thresholds: {
    ws_connections_total: ['count>9000'],      // 至少 9k 連接成功
    answer_latency_ms: ['p(95)<100'],         // 95% 答案延遲 < 100ms
    countdown_accuracy: ['rate>0.99'],         // 99% 倒數消息準確
    message_loss: ['count<100'],              // 消息丟失 < 100
  },
}

const WS_URL = __ENV.WS_URL || 'ws://localhost:8080/ws/battle'

export default function () {
  const userId = `battle_user_${__VU}_${__ITER}`
  let matchId: string | null = null
  let questionIndex = 0
  let expectedCountdown = 15
  let lastCountdown = 15

  const response = ws.connect(WS_URL, {}, function (socket) {
    wsConnections.add(1)

    // 步驟 1: AUTH
    socket.send(JSON.stringify({
      type: 'AUTH',
      userId: userId,
    }))

    // 步驟 2: START_MATCH (PVE 模式)
    socket.send(JSON.stringify({
      type: 'START_MATCH',
      match_type: 'PVE_TRAINING',
      subject: 'math',
      contract_amount: null,
      is_ugc_deceiver_mode: false,
    }))

    // 步驟 3-7: 監聽消息並模擬對戰
    socket.on('message', function (data) {
      try {
        const message = JSON.parse(data)

        switch (message.type) {
          case 'LOBBY_CONFIRMING':
            matchId = message.match_id || message.matchId
            const countdown = message.countdown || 15

            // P5: 驗證倒數準確性
            if (countdown < lastCountdown) {
              // 倒數正常遞減
              countdownAccuracy.add(1)
            } else if (countdown === lastCountdown && countdown === 15) {
              // 初始狀態
              countdownAccuracy.add(1)
            } else {
              // 倒數異常
              countdownAccuracy.add(0)
              console.warn(`[VU ${__VU}] Countdown anomaly: ${lastCountdown} -> ${countdown}`)
            }
            lastCountdown = countdown

            // 如果倒數 > 0，發送確認
            if (countdown > 0 && countdown < 15) {
              socket.send(JSON.stringify({
                type: 'CONFIRM_LOBBY',
                match_id: matchId,
              }))
            }
            break

          case 'LOBBY_CONFIRMED':
          case 'MATCH_FOUND':
            // 開始模擬對戰：發送 10 條 SubmitAnswer
            if (!matchId) {
              matchId = message.match_id || message.matchId
            }

            // 發送答案（模擬快速答題）
            const sendAnswer = () => {
              if (questionIndex < 10 && matchId) {
                const answerStartTime = Date.now()

                socket.send(JSON.stringify({
                  type: 'SUBMIT_ANSWER',
                  match_id: matchId,
                  question_index: questionIndex,
                  answer: 'A', // 模擬答案
                  client_timestamp: Date.now(),
                }))

                // 監聽 ANSWER_RESULT
                const answerTimeout = setTimeout(() => {
                  const latency = Date.now() - answerStartTime
                  answerLatency.add(latency)
                  questionIndex++
                  
                  if (questionIndex < 10) {
                    setTimeout(sendAnswer, 100) // 100ms 間隔
                  }
                }, 1000)

                // 清理超時（如果收到 ANSWER_RESULT）
                socket.on('message', function checkAnswer(data) {
                  try {
                    const msg = JSON.parse(data)
                    if (msg.type === 'ANSWER_RESULT') {
                      clearTimeout(answerTimeout)
                      const latency = Date.now() - answerStartTime
                      answerLatency.add(latency)
                      questionIndex++
                      
                      if (questionIndex < 10) {
                        setTimeout(sendAnswer, 100)
                      }
                    }
                  } catch (e) {
                    // Ignore parse errors
                  }
                })
              }
            }

            setTimeout(sendAnswer, 500) // 500ms 後開始答題
            break

          case 'BATTLE_END':
            // 對戰結束，關閉連接
            socket.close()
            break

          case 'ERROR':
            wsConnectionErrors.add(1)
            console.error(`[VU ${__VU}] WebSocket error: ${message.message}`)
            break
        }
      } catch (e) {
        messageLoss.add(1)
        console.error(`[VU ${__VU}] Failed to parse message: ${e}`)
      }
    })

    // 超時處理（60 秒）
    setTimeout(function () {
      if (socket.readyState === 1) { // OPEN
        console.warn(`[VU ${__VU}] Test timeout, closing connection`)
        socket.close()
      }
    }, 60000)
  })

  // 檢查 WebSocket 連接
  check(response, {
    'WebSocket connected': (r) => r && r.status === 101,
  })
}

export function handleSummary(data) {
  return {
    'reports/battle-peak-load-test.json': JSON.stringify(data, null, 2),
    stdout: textSummary(data, { indent: ' ', enableColors: true }),
  }
}

function textSummary(data, options) {
  return JSON.stringify(data, null, 2)
}

