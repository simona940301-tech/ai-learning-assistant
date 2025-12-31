/**
 * Kafka Client Wrapper
 * 
 * 提供 Kafka 事件發送接口（基礎集成）
 * 
 * 注意：這是基礎集成，完整的 Kafka 設置需要：
 * 1. 安裝 Kafka 客戶端庫（如 kafkajs）
 * 2. 配置 Kafka broker
 * 3. 設置生產者和消費者
 * 
 * 當前實現：提供接口和模擬實現，便於後續遷移
 */

export interface KafkaConfig {
  brokers: string[]
  clientId?: string
}

export interface KafkaMessage {
  topic: string
  key?: string
  value: any
  headers?: Record<string, string>
}

export interface KafkaProducer {
  send(message: KafkaMessage): Promise<void>
  disconnect(): Promise<void>
}

/**
 * Kafka 生產者（模擬實現）
 * 
 * 在生產環境中，應該使用真實的 Kafka 客戶端：
 * ```typescript
 * import { Kafka } from 'kafkajs'
 * ```
 */
class KafkaProducerImpl implements KafkaProducer {
  private config: KafkaConfig
  private messages: KafkaMessage[] = []

  constructor(config: KafkaConfig) {
    this.config = config
  }

  async send(message: KafkaMessage): Promise<void> {
    // 模擬：記錄消息（真實環境中應該發送到 Kafka）
    this.messages.push(message)
    console.log('[Kafka] Message sent:', {
      topic: message.topic,
      key: message.key,
      value: typeof message.value === 'string' ? message.value : JSON.stringify(message.value),
    })

    // 真實環境中：
    // const producer = kafka.producer()
    // await producer.connect()
    // await producer.send({
    //   topic: message.topic,
    //   messages: [{
    //     key: message.key,
    //     value: JSON.stringify(message.value),
    //     headers: message.headers,
    //   }],
    // })
  }

  async disconnect(): Promise<void> {
    // 斷開連接
    console.log('[Kafka] Producer disconnected')
  }

  // 用於測試：獲取發送的消息
  getMessages(): KafkaMessage[] {
    return [...this.messages]
  }
}

/**
 * 獲取 Kafka 生產者（單例）
 */
let kafkaProducer: KafkaProducer | null = null

export function getKafkaProducer(config?: KafkaConfig): KafkaProducer {
  if (!kafkaProducer) {
    const enabled = process.env.KAFKA_ENABLED === 'true'
    const brokers = config?.brokers || process.env.KAFKA_BROKERS?.split(',') || ['localhost:9092']

    if (enabled) {
      // 真實環境：使用 Kafka 客戶端
      // const kafka = new Kafka({ brokers, clientId: config?.clientId || 'play-battle' })
      // kafkaProducer = kafka.producer()
      // 當前：模擬實現
      console.warn('[Kafka] Using mock implementation. Set KAFKA_ENABLED=true and install kafkajs to use real implementation.')
    }

    kafkaProducer = new KafkaProducerImpl({ brokers, clientId: config?.clientId || 'play-battle' })
  }

  return kafkaProducer
}

/**
 * 發送 UGC 收益追蹤事件
 */
export async function trackUGCReward(
  questionId: string,
  designerId: string,
  reward: number,
  metadata?: Record<string, any>
): Promise<void> {
  const producer = getKafkaProducer()

  await producer.send({
    topic: 'ugc-rewards',
    key: questionId,
    value: {
      questionId,
      designerId,
      reward,
      timestamp: new Date().toISOString(),
      metadata: metadata || {},
    },
  })
}

/**
 * 發送答題事件
 */
export async function trackAnswerEvent(
  userId: string,
  questionId: string,
  isCorrect: boolean,
  timeSpent: number,
  metadata?: Record<string, any>
): Promise<void> {
  const producer = getKafkaProducer()

  await producer.send({
    topic: 'answer-events',
    key: userId,
    value: {
      userId,
      questionId,
      isCorrect,
      timeSpent,
      timestamp: new Date().toISOString(),
      metadata: metadata || {},
    },
  })
}

/**
 * 發送合約事件
 */
export async function trackContractEvent(
  eventType: 'CREATED' | 'ACCEPTED' | 'SETTLED',
  contractId: string,
  userId: string,
  amount: number,
  metadata?: Record<string, any>
): Promise<void> {
  const producer = getKafkaProducer()

  await producer.send({
    topic: 'contract-events',
    key: contractId,
    value: {
      eventType,
      contractId,
      userId,
      amount,
      timestamp: new Date().toISOString(),
      metadata: metadata || {},
    },
  })
}

