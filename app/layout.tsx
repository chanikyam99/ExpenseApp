// app/layout.tsx
import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import { ToastProvider } from '@/components/toast-provider'
import { ThemeProvider } from '@/components/theme-provider'
import { BackgroundGraphic } from '@/components/background-graphic'

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
    <html lang="en" data-theme="dark">
      <body className={`${inter.className} antialiased`}>
        {/* Runs synchronously before first paint — prevents light/dark flash */}
        <script
          dangerouslySetInnerHTML={{
            __html: `try{var t=localStorage.getItem('splithouse-theme');if(t==='light'||t==='dark')document.documentElement.setAttribute('data-theme',t)}catch(e){}`,
          }}
        />
        <ThemeProvider>
          <BackgroundGraphic />
          <ToastProvider>
            {children}
          </ToastProvider>
        </ThemeProvider>
      </body>
    </html>
  )
}
