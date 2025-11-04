import { createPLMSClient } from './sdk';
import { getFlag } from './config/flags';
import { track } from './analytics';
import { formatDate, isEmail, capitalize } from './utils';

// 測試 SDK 初始化
console.log('🧪 測試 SDK 初始化...');
const plms = createPLMSClient({
  baseUrl: 'http://localhost:3000',
  platform: 'web',
});

console.log('✅ SDK 初始化成功');
console.log('可用方法:', Object.keys(plms));

// 測試 Ready Score calculateLevel (client-side helper)
console.log('\n🧪 測試 Ready Score calculateLevel...');
const level = plms.readyScore.calculateLevel(88);
console.log('Score 88 → Level:', level); // 應該是 'A'

// 測試 Feature Flags
console.log('\n🧪 測試 Feature Flags...');
console.log('ready_score_v2:', getFlag('ready_score_v2'));
console.log('ai_tutor:', getFlag('ai_tutor'));

// 測試 Analytics
console.log('\n🧪 測試 Analytics...');
track('login', { userId: 'test-123' });

// 測試 Utils
console.log('\n🧪 測試 Utils...');
console.log('formatDate:', formatDate('2025-10-25T10:00:00Z'));
console.log('isEmail:', isEmail('test@example.com'));
console.log('capitalize:', capitalize('hello world'));

console.log('\n✅ 所有測試通過！');
