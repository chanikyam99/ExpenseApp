'use client'
import { SunIcon, MoonIcon } from 'lucide-react'
import { useTheme } from '@/components/theme-provider'

export function ThemeToggle() {
  const { theme, toggle } = useTheme()

  return (
    <button
      onClick={toggle}
      aria-label={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
      className="relative w-8 h-8 rounded-full shrink-0 flex items-center justify-center
                 border border-[#2c2825] bg-[#1a1614] text-[#8c7b70]
                 hover:border-[#f97316]/50 hover:text-[#f97316]
                 transition-all duration-200 overflow-hidden"
    >
      {/* Sun — visible in dark mode */}
      <span
        className="absolute inset-0 flex items-center justify-center transition-all duration-300"
        style={{
          opacity: theme === 'dark' ? 1 : 0,
          transform: theme === 'dark' ? 'rotate(0deg) scale(1)' : 'rotate(90deg) scale(0.5)',
        }}
      >
        <SunIcon size={14} />
      </span>
      {/* Moon — visible in light mode */}
      <span
        className="absolute inset-0 flex items-center justify-center transition-all duration-300"
        style={{
          opacity: theme === 'light' ? 1 : 0,
          transform: theme === 'light' ? 'rotate(0deg) scale(1)' : 'rotate(-90deg) scale(0.5)',
        }}
      >
        <MoonIcon size={14} />
      </span>
    </button>
  )
}
