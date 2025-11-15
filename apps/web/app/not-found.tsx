'use client'

export default function NotFound() {
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
          頁面不存在
        </h1>
        <p style={{ marginBottom: '1.5rem', color: '#666666' }}>
          找不到您要訪問的頁面
        </p>
        <button
          onClick={() => window.location.href = '/'}
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
          返回首頁
        </button>
      </div>
    </div>
  )
}

