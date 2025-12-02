// 強制清理認證狀態的腳本
export function forceCleanAuth() {
  if (typeof window !== 'undefined') {
    // 1. 清理 localStorage
    localStorage.removeItem('sb-localhost-auth-token')
    localStorage.removeItem('sb-' + window.location.hostname + '-auth-token')
    
    // 2. 清理 sessionStorage
    sessionStorage.clear()
    
    // 3. 清理所有 supabase 相關的 cookies
    document.cookie.split(";").forEach(function(c) { 
      document.cookie = c.replace(/^ +/, "").replace(/=.*/, "=;expires=" + new Date().toUTCString() + ";path=/"); 
    });
    
    console.log('🧹 All auth data cleared')
    
    // 4. 重新載入頁面
    window.location.reload()
  }
}