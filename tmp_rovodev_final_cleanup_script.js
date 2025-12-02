// 🔥 最終清理腳本 - 徹底移除 Mock User 和所有殘留狀態
// 在瀏覽器控制台執行此腳本

console.log('🔥 開始最終清理...');

// 1. 強制 Supabase 登出
try {
  // 嘗試多種方式登出
  if (window.supabase) {
    await window.supabase.auth.signOut();
    console.log('✅ Supabase 登出成功');
  }
} catch (e) {
  console.log('Supabase 登出嘗試:', e);
}

// 2. 清除所有認證相關的 localStorage
const authKeys = [
  'sb-umzqjgxsetsmwzhniemw-auth-token',
  'supabase.auth.token', 
  'sb-auth-token',
  'auth-token',
  'user',
  'session'
];

authKeys.forEach(key => {
  localStorage.removeItem(key);
  sessionStorage.removeItem(key);
  console.log(`🗑️ 清除認證 key: ${key}`);
});

// 3. 清除所有 onboarding 相關數據
const onboardingKeys = [
  'onboarding_challenge_score',
  'onboarding_challenge_results', 
  'onboarding_challenge_questions',
  'onboarding_session_id',
  'challenge_session_id',
  'onboarding_anonymous_data'
];

onboardingKeys.forEach(key => {
  localStorage.removeItem(key);
  sessionStorage.removeItem(key);
  console.log(`🗑️ 清除 onboarding key: ${key}`);
});

// 4. 清除所有 localStorage 和 sessionStorage
localStorage.clear();
sessionStorage.clear();
console.log('🧹 清除所有 storage');

// 5. 清除所有 cookies
document.cookie.split(";").forEach(c => { 
  document.cookie = c.replace(/^ +/, "").replace(/=.*/, "=;expires=" + new Date().toUTCString() + ";path=/"); 
});
console.log('🍪 清除所有 cookies');

// 6. 清除瀏覽器快取 (如果可能)
try {
  if ('caches' in window) {
    caches.keys().then(names => {
      names.forEach(name => {
        caches.delete(name);
      });
    });
    console.log('💾 清除快取');
  }
} catch (e) {
  console.log('快取清理嘗試:', e);
}

console.log('🎉 最終清理完成！');
console.log('🔄 即將重新整理頁面...');

// 等待 2 秒後重新整理
setTimeout(() => {
  window.location.href = '/';
}, 2000);