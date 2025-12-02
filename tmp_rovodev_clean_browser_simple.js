console.log('🧹 開始清理瀏覽器認證狀態...')

localStorage.clear()
sessionStorage.clear()

document.cookie.split(";").forEach(function(c) { 
  document.cookie = c.replace(/^ +/, "").replace(/=.*/, "=;expires=" + new Date().toUTCString() + ";path=/"); 
});

console.log('✅ 瀏覽器狀態清理完成！')
window.location.reload()