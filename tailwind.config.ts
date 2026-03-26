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
        'space-900':   '#090C14',
        'space-800':   '#0D1117',
        'space-700':   '#111827',
        'space-600':   '#1E2235',
        'space-accent':'#6366F1',
        'space-glow':  '#A855F7',
        void:          '#090C14',
        cosmos:        '#0F172A',
        brass:         '#FFD166',
        cyan:          '#38F0FF',
        purple:        '#7A5FFF',
        emerald:       '#34d399',
      },
      fontFamily: {
        sans: ['"Noto Sans Georgian"', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'Fira Code', 'Courier New', 'monospace'],
      },
      borderRadius: {
        card: '10px',
        sm:   '6px',
      },
      fontSize: {
        label: ['10px', { letterSpacing: '0.12em', fontWeight: '700' }],
      },
    },
  },
  plugins: [],
}

export default config
