/**
 * 原生橋接工具 - 檢測並與 iOS WebView 通訊
 */

declare global {
  interface Window {
    webkit?: {
      messageHandlers?: {
        native?: {
          postMessage: (message: any) => void
        }
      }
    }
  }
}

interface NativeMessage {
  action: string
  data?: Record<string, any>
}

/**
 * 檢測是否在 iOS App 內
 */
export function isInNativeApp(): boolean {
  return typeof window !== 'undefined' && 
         typeof window.webkit?.messageHandlers?.native !== 'undefined'
}

/**
 * 向原生 App 發送訊息
 */
export function postToNative(action: string, data?: Record<string, any>): void {
  if (!isInNativeApp()) {
    console.warn('Not in native app, message not sent:', action)
    return
  }
  
  try {
    window.webkit!.messageHandlers!.native!.postMessage({ action, data })
  } catch (error) {
    console.error('Failed to post message to native:', error)
  }
}

/**
 * 監聽來自原生的訊息
 */
export function listenToNative(callback: (event: CustomEvent<NativeMessage>) => void): () => void {
  if (typeof window === 'undefined') return () => {}
  
  const handler = (event: Event) => {
    callback(event as CustomEvent<NativeMessage>)
  }
  
  window.addEventListener('nativeMessage', handler)
  
  // 返回清理函式
  return () => {
    window.removeEventListener('nativeMessage', handler)
  }
}

/**
 * 通用 API
 */
export const NativeBridge = {
  /**
   * 震動回饋
   */
  vibrate(intensity: 'light' | 'medium' | 'heavy' = 'medium'): void {
    postToNative('vibrate', { intensity })
  },

  /**
   * 分享內容
   */
  share(text: string, url?: string): void {
    if (isInNativeApp()) {
      postToNative('share', { text, url })
    } else if (navigator.share) {
      navigator.share({ text, url }).catch(console.error)
    } else {
      // Fallback
      alert('分享功能不可用')
    }
  },

  /**
   * 記錄日誌到原生
   */
  log(message: string, level: 'info' | 'warn' | 'error' = 'info'): void {
    postToNative('log', { message, level })
    console[level](message)
  },

  /**
   * 開啟外部連結
   */
  openExternal(url: string): void {
    if (isInNativeApp()) {
      postToNative('openExternal', { url })
    } else {
      window.open(url, '_blank')
    }
  },

  /**
   * 檢測環境
   */
  isNative: isInNativeApp,
}

/**
 * React Hook: 使用原生橋接
 */
export function useNativeBridge() {
  const [isNative, setIsNative] = useState(false)

  useEffect(() => {
    setIsNative(isInNativeApp())
    
    // 監聽來自原生的訊息
    const unlisten = listenToNative((event) => {
      console.log('收到原生訊息:', event.detail)
    })
    
    return unlisten
  }, [])

  return {
    isNative,
    bridge: NativeBridge
  }
}

// 使用範例
import { useEffect, useState } from 'react'

/**
使用方式：

```tsx
import { useNativeBridge } from '@/lib/native-bridge'

export default function MyComponent() {
  const { isNative, bridge } = useNativeBridge()

  const handleShare = () => {
    bridge.share('我在 AI 學習助手學到了新知識！')
  }

  const handleVibrate = () => {
    bridge.vibrate('medium')
  }

  return (
    <div>
      {isNative && <p>在 iOS App 內運行</p>}
      <button onClick={handleShare}>分享</button>
      <button onClick={handleVibrate}>震動</button>
    </div>
  )
}
```
*/

