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
        void: '#070B14',
        cosmos: '#0F1F3D',
        brass: '#FFD166',
        'brass-light': '#FFE08A',
        cyan: '#38F0FF',
        purple: '#7A5FFF',
        emerald: '#34d399',
      },
      fontFamily: {
        serif: ['Georgia', 'Palatino', 'serif'],
        mono: ['JetBrains Mono', 'Fira Code', 'Courier New', 'monospace'],
      },
      borderRadius: {
        card: '16px',
      },
    },
  },
  plugins: [],
}

export default config
