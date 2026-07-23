import type { Config } from 'tailwindcss'

const config: Config = {
  darkMode: 'class',
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        bg: '#0f0d0c',
        surface: '#1a1614',
        'surface-2': '#201c1a',
        border: '#2c2825',
        'border-2': '#3a3330',
        primary: '#f97316',
        'primary-h': '#fb923c',
        muted: '#8c7b70',
      },
    },
  },
  plugins: [],
}

export default config