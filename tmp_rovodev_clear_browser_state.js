// 在瀏覽器控制台執行這個腳本來清理所有認證狀態
console.log('🧹 開始清理瀏覽器認證狀態...')

// 1. 清理 localStorage
const localStorageKeys = Object.keys(localStorage)
localStorageKeys.forEach(key => {
  if (key.includes('supabase') || key.includes('auth') || key.includes('sb-')) {
    localStorage.removeItem(key)
    console.log('🗑️ 清理 localStorage:', key)
  }
})

// 2. 清理 sessionStorage  
const sessionStorageKeys = Object.keys(sessionStorage)
sessionStorageKeys.forEach(key => {
  if (key.includes('supabase') || key.includes('auth') || key.includes('sb-')) {
    sessionStorage.removeItem(key)
    console.log('🗑️ 清理 sessionStorage:', key)
  }
})

// 3. 清理 cookies
document.cookie.split(";").forEach(function(c) { 
  const cookieName = c.split("=")[0].trim()
  if (cookieName.includes('supabase') || cookieName.includes('auth') || cookieName.startsWith('sb-')) {
    document.cookie = c.replace(/^ +/, "").replace(/=.*/, "=;expires=" + new Date().toUTCString() + ";path=/")
    console.log('🗑️ 清理 cookie:', cookieName)
  }
})

console.log('✅ 瀏覽器狀態清理完成！請重新載入頁面。')
console.log('🔄 執行: window.location.reload()')

// 自動重新載入
setTimeout(() => {
  window.location.reload()
}, 1000)