'use client'

import { useEffect } from 'react'

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    // Log error to console for debugging
    console.error('[Global Error Boundary] Critical error:', error)
  }, [error])

  return (
    <html lang="zh-TW">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <title>嚴重錯誤</title>
      </head>
      <body style={{ margin: 0, padding: 0, fontFamily: 'system-ui, sans-serif' }}>
        <div style={{
          display: 'flex',
          minHeight: '100vh',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '1rem',
          backgroundColor: '#0a0a0a',
          color: '#ffffff'
        }}>
          <div style={{ textAlign: 'center', maxWidth: '28rem' }}>
            <h1 style={{ marginBottom: '1rem', fontSize: '1.5rem', fontWeight: 'bold' }}>
              嚴重錯誤
            </h1>
            <p style={{ marginBottom: '0.5rem', color: '#a1a1aa' }}>
              {error.message || '應用程式發生嚴重錯誤'}
            </p>
            {error.digest && (
              <p style={{ marginBottom: '1.5rem', fontSize: '0.75rem', color: '#71717a' }}>
                錯誤代碼: {error.digest}
              </p>
            )}
            <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'center' }}>
              <button
                onClick={reset}
                style={{
                  padding: '0.5rem 1rem',
                  borderRadius: '0.375rem',
                  backgroundColor: '#ffffff',
                  color: '#000000',
                  border: 'none',
                  cursor: 'pointer',
                  fontWeight: '500'
                }}
              >
                重試
              </button>
              <button
                onClick={() => window.location.href = '/'}
                style={{
                  padding: '0.5rem 1rem',
                  borderRadius: '0.375rem',
                  backgroundColor: 'transparent',
                  color: '#ffffff',
                  border: '1px solid #3f3f46',
                  cursor: 'pointer',
                  fontWeight: '500'
                }}
              >
                返回首頁
              </button>
            </div>
          </div>
        </div>
      </body>
    </html>
  )
}

