import type { Metadata } from 'next'
import './globals.css'
import EnvChecker from '@/components/EnvChecker'

export const metadata: Metadata = {
  title: 'EduApp',
  description: 'Minimalist educational experience',
  icons: {
    icon: '/favicon.ico',
    shortcut: '/favicon.ico',
    apple: '/favicon.ico',
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="zh-TW" suppressHydrationWarning>
      <body>
        <EnvChecker />
        {children}
      </body>
    </html>
  )
}
