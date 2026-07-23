'use client'
import { createContext, useCallback, useContext, useEffect, useState } from 'react'

type Theme = 'dark' | 'light'
interface ThemeCtx { theme: Theme; toggle: () => void }

const ThemeContext = createContext<ThemeCtx>({ theme: 'dark', toggle: () => {} })
export const useTheme = () => useContext(ThemeContext)

const KEY = 'splithouse-theme'

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setTheme] = useState<Theme>('dark')

  useEffect(() => {
    // Read from DOM — the anti-flash script already set the correct value before paint
    const dom = document.documentElement.getAttribute('data-theme') as Theme | null
    if (dom === 'light' || dom === 'dark') setTheme(dom)
  }, [])

  const toggle = useCallback(() => {
    setTheme(prev => {
      const next: Theme = prev === 'dark' ? 'light' : 'dark'
      localStorage.setItem(KEY, next)
      document.documentElement.setAttribute('data-theme', next)
      return next
    })
  }, [])

  return (
    <ThemeContext.Provider value={{ theme, toggle }}>
      {children}
    </ThemeContext.Provider>
  )
}
