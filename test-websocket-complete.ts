#!/usr/bin/env node
/**
 * WebSocket 完整流程測試腳本
 * 
 * 測試完整流程：
 * 1. 連接 WebSocket
 * 2. AUTH 認證
 * 3. START_MATCH 啟動對戰
 * 4. LOBBY_CONFIRMING 大廳確認
 * 5. CONFIRM_LOBBY 確認大廳
 * 6. MATCH_FOUND 找到對戰
 * 7. ROUND_STARTED 回合開始
 * 8. SUBMIT_ANSWER 提交答案
 * 9. QUESTION_RESULT 答題結果
 * 10. BATTLE_END 對戰結束
 */

import WebSocket from 'ws';

const WS_URL = process.env.WS_URL || 'ws://localhost:8080/ws/battle';
const TEST_USER_ID = `test-user-${Date.now()}`;
const TEST_TIMEOUT = 120000; // 2 分鐘超時

interface ServerMessage {
  type: string;
  [key: string]: any;
}

interface ClientMessage {
  type: string;
  [key: string]: any;
}

interface TestStats {
  startTime: number;
  endTime: number | null;
  messagesReceived: number;
  messagesSent: number;
  errors: string[];
  warnings: string[];
  stepsCompleted: Set<string>;
  questionsAnswered: number;
  correctAnswers: number;
  finalScore: number | null;
  winner: string | null;
}

class WebSocketCompleteTester {
  private ws: WebSocket | null = null;
  private matchId: string | null = null;
  private questions: any[] = [];
  private currentQuestionIndex = 0;
  private stats: TestStats;
  private timeoutId: NodeJS.Timeout | null = null;
  private isCompleted = false;
  private expectedSteps = [
    'CONNECTED',
    'AUTH_SENT',
    'START_MATCH_SENT',
    'LOBBY_CONFIRMING_RECEIVED',
    'CONFIRM_LOBBY_SENT',
    'MATCH_FOUND_RECEIVED',
    'ROUND_STARTED_RECEIVED',
    'QUESTIONS_ANSWERED',
    'BATTLE_END_RECEIVED',
  ];

  constructor() {
    this.stats = {
      startTime: Date.now(),
      endTime: null,
      messagesReceived: 0,
      messagesSent: 0,
      errors: [],
      warnings: [],
      stepsCompleted: new Set(),
      questionsAnswered: 0,
      correctAnswers: 0,
      finalScore: null,
      winner: null,
    };
  }

  async run() {
    console.log('🚀 WebSocket 完整流程測試開始\n');
    console.log(`📡 WebSocket URL: ${WS_URL}`);
    console.log(`👤 測試用戶 ID: ${TEST_USER_ID}\n`);
    console.log('='.repeat(60) + '\n');

    try {
      await this.connectWebSocket();
      this.markStep('CONNECTED');

      await this.authenticate();
      this.markStep('AUTH_SENT');

      await this.startPVEMatch();
      this.markStep('START_MATCH_SENT');

      // 設置總超時
      this.timeoutId = setTimeout(() => {
        if (!this.isCompleted) {
          console.log('\n⏱️  測試超時（2 分鐘）');
          this.printReport();
          this.cleanup();
          process.exit(1);
        }
      }, TEST_TIMEOUT);

      // 等待測試完成（通過 BATTLE_END 消息觸發）
      await this.waitForCompletion();
    } catch (error: any) {
      console.error('\n❌ 測試失敗:', error.message);
      this.stats.errors.push(error.message);
      this.printReport();
      this.cleanup();
      process.exit(1);
    }
  }

  private connectWebSocket(): Promise<void> {
    return new Promise((resolve, reject) => {
      console.log('📡 步驟 1: 連接 WebSocket...');

      this.ws = new WebSocket(WS_URL);

      this.ws.on('open', () => {
        console.log('✅ WebSocket 連接成功\n');
        resolve();
      });

      this.ws.on('error', (error: Error) => {
        const errorMsg = `WebSocket 連接錯誤: ${error.message}`;
        console.error(`❌ ${errorMsg}`);
        this.stats.errors.push(errorMsg);
        reject(error);
      });

      this.ws.on('close', (code, reason) => {
        console.log(`\n🔌 WebSocket 連接已關閉 (code: ${code}, reason: ${reason.toString()})`);
      });

      this.ws.on('message', (data) => {
        try {
          const message: ServerMessage = JSON.parse(data.toString());
          this.stats.messagesReceived++;
          this.handleServerMessage(message);
        } catch (error: any) {
          const errorMsg = `解析消息失敗: ${error.message}`;
          console.error(`❌ ${errorMsg}`);
          this.stats.errors.push(errorMsg);
        }
      });
    });
  }

  private authenticate(): Promise<void> {
    return new Promise((resolve) => {
      console.log('🔐 步驟 2: 發送 AUTH 消息...');

      this.sendMessage({
        type: 'AUTH',
        userId: TEST_USER_ID,
      });

      setTimeout(() => {
        console.log('✅ AUTH 消息已發送\n');
        resolve();
      }, 500);
    });
  }

  private async startPVEMatch(): Promise<void> {
    console.log('🎮 步驟 3: 發送 START_MATCH 消息...');
    console.log('   模式: PVE_TRAINING');
    console.log('   學科: english');
    console.log('   時間限制: 20 秒\n');

    this.sendMessage({
      type: 'START_MATCH',
      match_type: 'PVE_TRAINING',
      subject: 'english',
      time_limit: 20,
    });
  }

  private handleServerMessage(message: ServerMessage) {
    const timestamp = new Date().toISOString();
    console.log(`\n📨 [${timestamp}] 收到消息: ${message.type}`);

    switch (message.type) {
      case 'AUTH_SUCCESS':
      case 'AUTHENTICATED':
        console.log('   ✅ 認證成功');
        this.markStep('AUTH_SUCCESS');
        break;

      case 'MATCHMAKING_STARTED':
        console.log('   ⏳ 配對已開始');
        break;

      case 'LOBBY_CONFIRMING':
        console.log(`   🏁 大廳確認中`);
        console.log(`   Match ID: ${message.match_id || message.matchId}`);
        console.log(`   倒數: ${message.countdown} 秒`);
        console.log(`   玩家: ${JSON.stringify(message.players || [])}`);

        this.matchId = message.match_id || message.matchId;
        this.markStep('LOBBY_CONFIRMING_RECEIVED');

        // PVE 模式可能不需要確認，但我們還是發送
        if (message.countdown !== undefined && message.countdown > 0) {
          setTimeout(() => {
            console.log('\n✅ 步驟 4: 發送 CONFIRM_LOBBY 消息...');
            this.sendMessage({
              type: 'CONFIRM_LOBBY',
              match_id: this.matchId,
            });
            this.markStep('CONFIRM_LOBBY_SENT');
          }, 500);
        }
        break;

      case 'LOBBY_CONFIRMED':
        console.log('   ✅ 大廳已確認');
        this.markStep('LOBBY_CONFIRMED');
        break;

      case 'MATCH_FOUND':
        console.log(`   🎯 找到對戰！`);
        console.log(`   Match ID: ${message.match_id || message.matchId}`);
        console.log(`   對手: ${message.opponent_name || message.opponentName || 'AI'}`);
        console.log(`   題目數量: ${message.question_list?.length || message.questionList?.length || 0}`);

        this.matchId = message.match_id || message.matchId;
        this.questions = message.question_list || message.questionList || [];
        this.markStep('MATCH_FOUND_RECEIVED');

        if (this.questions.length > 0) {
          console.log('\n📝 題目列表:');
          this.questions.forEach((q, idx) => {
            const text = q.question_text || q.questionText || '';
            console.log(`   ${idx + 1}. ${text.substring(0, 60)}${text.length > 60 ? '...' : ''}`);
          });
          console.log('\n⏳ 等待 ROUND_STARTED 消息...');
        } else {
          const warning = '警告：沒有收到題目！';
          console.warn(`   ⚠️  ${warning}`);
          this.stats.warnings.push(warning);
        }
        break;

      case 'ROUND_STARTED':
        const roundInfo = message as any;
        const questionIndex = roundInfo.question_index || roundInfo.questionIndex || 0;
        const question = roundInfo.question || this.questions[questionIndex];

        console.log(`\n📝 步驟 6: 第 ${questionIndex + 1}/${this.questions.length} 題開始`);
        if (question) {
          console.log(`   題目: ${(question.question_text || question.questionText || '').substring(0, 80)}...`);
          if (question.options || question.choices) {
            const options = question.options || question.choices || [];
            console.log(`   選項:`);
            options.forEach((opt: string, idx: number) => {
              console.log(`     ${String.fromCharCode(65 + idx)}. ${opt}`);
            });
          }
        }

        this.currentQuestionIndex = questionIndex;
        this.markStep('ROUND_STARTED_RECEIVED');

        // 自動答題（1 秒後）
        setTimeout(() => this.answerCurrentQuestion(), 1000);
        break;

      case 'QUESTION_RESULT':
        const isCorrect = message.is_correct || message.isCorrect || false;
        const scoreGained = message.score_gained || message.scoreGained || 0;
        const totalScore = message.new_total_score || message.newTotalScore || 0;

        console.log(`\n📊 步驟 7: 答題結果`);
        console.log(`   是否正確: ${isCorrect ? '✅ 正確' : '❌ 錯誤'}`);
        console.log(`   得分: ${scoreGained}`);
        console.log(`   總分: ${totalScore}`);

        this.stats.questionsAnswered++;
        if (isCorrect) {
          this.stats.correctAnswers++;
        }
        this.stats.finalScore = totalScore;

        // 進入下一題
        this.currentQuestionIndex++;
        if (this.currentQuestionIndex < this.questions.length) {
          setTimeout(() => this.answerCurrentQuestion(), 2000);
        } else {
          this.markStep('QUESTIONS_ANSWERED');
          console.log('\n✅ 所有題目已完成，等待對戰結束...');
        }
        break;

      case 'ANSWER_RESULT':
        console.log(`   📊 答題結果`);
        console.log(`   你的分數: ${message.player1_score || message.player1Score || 0}`);
        console.log(`   對手分數: ${message.player2_score || message.player2Score || 0}`);
        break;

      case 'OPPONENT_ANSWERED':
        console.log(`   👤 對手已答題`);
        console.log(`   答案: ${message.answer}`);
        console.log(`   是否正確: ${message.is_correct ? '✓' : '✗'}`);
        break;

      case 'ROUND_RESOLVED':
        console.log(`   ⏭️  回合結束`);
        break;

      case 'BATTLE_END':
      case 'MATCH_ENDED':
        console.log(`\n🏆 步驟 8: 對戰結束！`);
        const winner = message.winner || message.winnerId;
        const finalScores = message.final_score || message.final_scores || {};
        const playerScore = finalScores.player1 || finalScores[TEST_USER_ID] || 0;
        const opponentScore = finalScores.player2 || finalScores[message.opponent_id] || 0;

        if (winner === 'draw' || winner === null) {
          console.log('   結果: 平局');
          this.stats.winner = 'draw';
        } else if (winner === TEST_USER_ID) {
          console.log('   結果: 🎉 你贏了！');
          this.stats.winner = 'player';
        } else {
          console.log('   結果: 對手獲勝');
          this.stats.winner = 'opponent';
        }

        console.log(`   最終分數:`);
        console.log(`     你: ${playerScore}`);
        console.log(`     對手: ${opponentScore}`);

        this.stats.finalScore = playerScore;
        this.markStep('BATTLE_END_RECEIVED');
        this.completeTest();
        break;

      case 'ERROR':
        const errorMsg = message.message || '未知錯誤';
        console.error(`   ❌ 錯誤: ${errorMsg}`);
        this.stats.errors.push(errorMsg);
        break;

      default:
        console.log(`   ℹ️  其他消息: ${JSON.stringify(message).substring(0, 100)}...`);
    }
  }

  private answerCurrentQuestion() {
    if (this.currentQuestionIndex >= this.questions.length) {
      console.log('✅ 所有題目已完成');
      return;
    }

    const question = this.questions[this.currentQuestionIndex];
    if (!question) {
      console.warn(`⚠️  警告：題目 ${this.currentQuestionIndex} 不存在`);
      return;
    }

    // 隨機選擇答案（模擬真實答題）
    const options = question.options || question.choices || [];
    if (options.length === 0) {
      console.warn(`⚠️  警告：題目 ${this.currentQuestionIndex} 沒有選項`);
      return;
    }

    const answers = ['A', 'B', 'C', 'D'].slice(0, options.length);
    const randomAnswer = answers[Math.floor(Math.random() * answers.length)];

    console.log(`\n💡 步驟 7: 提交答案 (第 ${this.currentQuestionIndex + 1} 題)`);
    console.log(`   選擇: ${randomAnswer}`);

    this.sendMessage({
      type: 'SUBMIT_ANSWER',
      match_id: this.matchId,
      question_index: this.currentQuestionIndex,
      answer: randomAnswer,
      client_timestamp: Date.now(),
    });
  }

  private sendMessage(message: ClientMessage) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(message));
      this.stats.messagesSent++;
    } else {
      const errorMsg = 'WebSocket 未連接，無法發送消息';
      console.error(`❌ ${errorMsg}`);
      this.stats.errors.push(errorMsg);
    }
  }

  private markStep(step: string) {
    this.stats.stepsCompleted.add(step);
    console.log(`   ✓ 步驟完成: ${step}`);
  }

  private async waitForCompletion(): Promise<void> {
    return new Promise((resolve) => {
      // 等待 completeTest 被調用
      const checkInterval = setInterval(() => {
        if (this.isCompleted) {
          clearInterval(checkInterval);
          resolve();
        }
      }, 100);
    });
  }

  private completeTest() {
    if (this.isCompleted) return;

    this.isCompleted = true;
    this.stats.endTime = Date.now();

    setTimeout(() => {
      this.printReport();
      this.cleanup();
      process.exit(0);
    }, 1000);
  }

  private printReport() {
    const duration = this.stats.endTime
      ? ((this.stats.endTime - this.stats.startTime) / 1000).toFixed(2)
      : 'N/A';

    console.log('\n' + '='.repeat(60));
    console.log('📊 測試報告');
    console.log('='.repeat(60));
    console.log(`⏱️  測試時長: ${duration} 秒`);
    console.log(`📨 收到消息數: ${this.stats.messagesReceived}`);
    console.log(`📤 發送消息數: ${this.stats.messagesSent}`);
    console.log(`📝 答題數量: ${this.stats.questionsAnswered}`);
    console.log(`✅ 正確答案: ${this.stats.correctAnswers}`);
    console.log(`📊 最終分數: ${this.stats.finalScore ?? 'N/A'}`);
    console.log(`🏆 獲勝者: ${this.stats.winner ?? 'N/A'}`);

    console.log('\n✅ 完成的步驟:');
    this.expectedSteps.forEach((step) => {
      const completed = this.stats.stepsCompleted.has(step);
      console.log(`   ${completed ? '✓' : '✗'} ${step}`);
    });

    if (this.stats.warnings.length > 0) {
      console.log('\n⚠️  警告:');
      this.stats.warnings.forEach((warning) => {
        console.log(`   - ${warning}`);
      });
    }

    if (this.stats.errors.length > 0) {
      console.log('\n❌ 錯誤:');
      this.stats.errors.forEach((error) => {
        console.log(`   - ${error}`);
      });
    }

    // 檢查是否所有步驟都完成
    const allStepsCompleted = this.expectedSteps.every((step) =>
      this.stats.stepsCompleted.has(step)
    );

    console.log('\n' + '='.repeat(60));
    if (allStepsCompleted && this.stats.errors.length === 0) {
      console.log('✅ 測試通過：所有步驟完成，無錯誤');
    } else if (this.stats.errors.length > 0) {
      console.log('❌ 測試失敗：發現錯誤');
    } else {
      console.log('⚠️  測試部分完成：部分步驟未完成');
    }
    console.log('='.repeat(60) + '\n');
  }

  private cleanup() {
    if (this.timeoutId) {
      clearTimeout(this.timeoutId);
    }
    if (this.ws) {
      this.ws.close();
    }
  }
}

// 執行測試
const tester = new WebSocketCompleteTester();
tester.run().catch((error) => {
  console.error('❌ 測試執行失敗:', error);
  process.exit(1);
});








































