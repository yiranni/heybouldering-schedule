import type { Metadata } from 'next'
import type { ReactNode } from 'react'
import './globals.css'
import AuthGuard from './components/AuthGuard'

export const metadata: Metadata = {
  title: '嘿抱工作后台',
  description: '专业的排班管理系统',
}

export default function RootLayout({
  children,
}: {
  children: ReactNode
}) {
  return (
    <html lang="zh-CN">
      <body>
        <AuthGuard>{children}</AuthGuard>
      </body>
    </html>
  )
}
