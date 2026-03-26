import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        'space-900': '#0B0B1A',
        'space-800': '#15152F',
        'space-700': '#1E1E45',
        'space-accent': '#6366F1',
        'space-glow': '#A855F7',
        void: '#070B14',
        cosmos: '#0F1F3D',
        brass: '#FFD166',
        'brass-light': '#FFE08A',
        cyan: '#38F0FF',
        purple: '#7A5FFF',
        emerald: '#34d399',
      },
      fontFamily: {
        sans: ['"Noto Sans Georgian"', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'Fira Code', 'Courier New', 'monospace'],
      },
      borderRadius: {
        card: '24px',
        '4xl': '2rem',
      },
    },
  },
  plugins: [],
}

export default config
