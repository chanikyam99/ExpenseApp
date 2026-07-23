// app/layout.tsx
import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import { ToastProvider } from '@/components/toast-provider'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'SplitHouse',
  description: 'Track shared house expenses — free, forever',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body
        className={`${inter.className} bg-[#0f0d0c] text-[#faf7f5] antialiased`}
      >
        <ToastProvider>
          {children}
        </ToastProvider>
      </body>
    </html>
  )
}