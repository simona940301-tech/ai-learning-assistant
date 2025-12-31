'use client'

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return (
    <div style={{
      display: 'flex',
      minHeight: '100vh',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '1rem',
      backgroundColor: '#ffffff',
      color: '#000000'
    }}>
      <div style={{ textAlign: 'center', maxWidth: '28rem' }}>
        <h1 style={{ marginBottom: '1rem', fontSize: '1.5rem', fontWeight: 'bold' }}>
          發生錯誤
        </h1>
        <p style={{ marginBottom: '0.5rem', color: '#666666' }}>
          {error.message || '未知錯誤'}
        </p>
        {error.digest && (
          <p style={{ marginBottom: '1.5rem', fontSize: '0.75rem', color: '#999999' }}>
            錯誤代碼: {error.digest}
          </p>
        )}
        <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'center' }}>
          <button
            onClick={reset}
            style={{
              padding: '0.5rem 1rem',
              borderRadius: '0.375rem',
              backgroundColor: '#000000',
              color: '#ffffff',
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
              color: '#000000',
              border: '1px solid #cccccc',
              cursor: 'pointer',
              fontWeight: '500'
            }}
          >
            返回首頁
          </button>
        </div>
      </div>
    </div>
  )
}
