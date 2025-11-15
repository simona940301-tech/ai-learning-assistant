#!/usr/bin/env node
/**
 * 系統對戰功能測試腳本
 *
 * 測試流程：
 * 1. 連接 WebSocket (ws://localhost:8080/ws/battle)
 * 2. 發送認證消息
 * 3. 啟動 PVE 訓練模式
 * 4. 確認大廳
 * 5. 接收題目並自動答題
 * 6. 檢查對戰結果
 */

import WebSocket from 'ws';

const WS_URL = 'ws://localhost:8080/ws/battle';
const TEST_USER_ID = 'test-user-' + Date.now();

interface ServerMessage {
  type: string;
  [key: string]: any;
}

interface ClientMessage {
  type: string;
  [key: string]: any;
}

class BattleSystemTester {
  private ws: WebSocket | null = null;
  private matchId: string | null = null;
  private questions: any[] = [];
  private currentQuestionIndex = 0;

  async run() {
    console.log('🚀 開始測試系統對戰功能...\n');

    await this.connectWebSocket();
    await this.authenticate();
    await this.startPVEMatch();

    // 等待對戰完成
    await new Promise((resolve) => {
      setTimeout(() => {
        console.log('\n⏱️  測試超時，關閉連接');
        this.ws?.close();
        resolve(null);
      }, 60000); // 60 秒超時
    });
  }

  private connectWebSocket(): Promise<void> {
    return new Promise((resolve, reject) => {
      console.log(`📡 正在連接 WebSocket: ${WS_URL}`);

      this.ws = new WebSocket(WS_URL);

      this.ws.on('open', () => {
        console.log('✅ WebSocket 連接成功\n');
        resolve();
      });

      this.ws.on('error', (error) => {
        console.error('❌ WebSocket 錯誤:', error.message);
        reject(error);
      });

      this.ws.on('close', () => {
        console.log('🔌 WebSocket 連接已關閉');
      });

      this.ws.on('message', (data) => {
        try {
          const message: ServerMessage = JSON.parse(data.toString());
          this.handleServerMessage(message);
        } catch (error) {
          console.error('❌ 解析消息失敗:', error);
        }
      });
    });
  }

  private authenticate(): Promise<void> {
    return new Promise((resolve) => {
      console.log(`🔐 正在認證用戶: ${TEST_USER_ID}`);

      this.sendMessage({
        type: 'AUTH',
        userId: TEST_USER_ID,
      });

      // 等待認證完成
      setTimeout(() => {
        console.log('✅ 認證完成\n');
        resolve();
      }, 500);
    });
  }

  private async startPVEMatch(): Promise<void> {
    console.log('🎮 開始 PVE 訓練模式');
    console.log('參數:');
    console.log('  - match_type: PVE_TRAINING');
    console.log('  - subject: english');
    console.log('  - time_limit: 20\n');

    this.sendMessage({
      type: 'START_MATCH',
      match_type: 'PVE_TRAINING',
      subject: 'english',
      time_limit: 20,
    });
  }

  private handleServerMessage(message: ServerMessage) {
    console.log(`📨 收到消息: ${message.type}`);

    switch (message.type) {
      case 'MATCHMAKING_STARTED':
        console.log('  ⏳ 配對已開始\n');
        break;

      case 'LOBBY_CONFIRMING':
        console.log(`  🏁 大廳確認中`);
        console.log(`  Match ID: ${message.match_id}`);
        console.log(`  倒數: ${message.countdown} 秒`);
        console.log(`  玩家: ${JSON.stringify(message.players)}\n`);

        this.matchId = message.match_id;

        // 自動確認
        setTimeout(() => {
          console.log('✅ 確認大廳\n');
          this.sendMessage({
            type: 'CONFIRM_LOBBY',
            match_id: this.matchId,
          });
        }, 500);
        break;

      case 'MATCH_FOUND':
        console.log(`  🎯 找到對戰！`);
        console.log(`  Match ID: ${message.match_id}`);
        console.log(`  對手: ${message.opponent_name || 'AI'}`);
        console.log(`  題目數量: ${message.question_list?.length || 0}\n`);

        this.matchId = message.match_id;
        this.questions = message.question_list || [];

        if (this.questions.length > 0) {
          console.log('📝 題目列表:');
          this.questions.forEach((q, idx) => {
            console.log(`  ${idx + 1}. ${q.question_text?.substring(0, 50)}...`);
          });
          console.log('');
          console.log('⏳ 等待 ROUND_STARTED 消息來開始答題...\n');
        } else {
          console.warn('⚠️  警告：沒有收到題目！');
        }
        break;

      case 'OPPONENT_ANSWERED':
        console.log(`  👤 對手已答題`);
        console.log(`  答案: ${message.answer}`);
        console.log(`  是否正確: ${message.is_correct ? '✓' : '✗'}\n`);
        break;

      case 'ANSWER_RESULT':
        console.log(`  📊 答題結果`);
        console.log(`  你的分數: ${message.player1_score}`);
        console.log(`  對手分數: ${message.player2_score}\n`);
        break;

      case 'ROUND_STARTED':
        const roundInfo = message as any;
        console.log(`\n📝 第 ${roundInfo.question_index + 1}/${this.questions.length} 題 (新回合)`);

        // 更新當前題目索引
        this.currentQuestionIndex = roundInfo.question_index;

        // 自動答題
        setTimeout(() => this.answerCurrentQuestion(), 1000);
        break;

      case 'ROUND_RESOLVED':
        console.log(`  ⏭️  回合結束\n`);
        break;

      case 'QUESTION_RESULT':
        console.log(`  📊 答題結果`);
        console.log(`  是否正確: ${message.is_correct ? '✅ 正確' : '❌ 錯誤'}`);
        console.log(`  得分: ${message.score_gained}`);
        console.log(`  總分: ${message.new_total_score}\n`);

        // 進入下一題
        this.currentQuestionIndex++;
        if (this.currentQuestionIndex < this.questions.length) {
          setTimeout(() => this.answerCurrentQuestion(), 2000);
        }
        break;

      case 'BATTLE_END':
      case 'MATCH_ENDED':
        console.log('\n  🏆 對戰結束！');
        const winner = message.winner;
        const finalScore = message.final_score || message.final_scores || {};

        if (winner === 'draw') {
          console.log('  結果: 平局');
        } else if (winner === TEST_USER_ID) {
          console.log('  結果: 🎉 你贏了！');
        } else {
          console.log('  結果: 對手獲勝');
        }

        console.log(`  最終分數:`);
        console.log(`    你: ${finalScore.player1 || finalScore[TEST_USER_ID] || 0}`);
        console.log(`    對手: ${finalScore.player2 || finalScore[message.opponent_id] || 0}\n`);

        // 關閉連接
        setTimeout(() => {
          console.log('✅ 測試完成，關閉連接');
          this.ws?.close();
          process.exit(0);
        }, 1000);
        break;

      case 'ERROR':
        console.error(`  ❌ 錯誤: ${message.message}\n`);
        break;

      default:
        console.log(`  ℹ️  其他消息: ${JSON.stringify(message).substring(0, 100)}...\n`);
    }
  }

  private answerCurrentQuestion() {
    if (this.currentQuestionIndex >= this.questions.length) {
      console.log('✅ 所有題目已完成');
      return;
    }

    const question = this.questions[this.currentQuestionIndex];

    console.log(`\n📝 第 ${this.currentQuestionIndex + 1}/${this.questions.length} 題`);
    console.log(`題目: ${question.question_text}`);
    console.log(`選項:`);
    question.options?.forEach((opt: string, idx: number) => {
      console.log(`  ${String.fromCharCode(65 + idx)}. ${opt}`);
    });

    // 隨機選擇答案（模擬真實答題）
    const answers = ['A', 'B', 'C', 'D'];
    const randomAnswer = answers[Math.floor(Math.random() * answers.length)];

    console.log(`\n💡 選擇答案: ${randomAnswer}`);

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
    } else {
      console.error('❌ WebSocket 未連接，無法發送消息');
    }
  }
}

// 執行測試
const tester = new BattleSystemTester();
tester.run().catch((error) => {
  console.error('❌ 測試失敗:', error);
  process.exit(1);
});
