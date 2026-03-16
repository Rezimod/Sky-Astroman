import { clsx } from 'clsx'

interface BadgeProps {
  label: string
  variant?: 'gold' | 'cyan' | 'emerald' | 'purple' | 'dim'
}

const variantMap = {
  gold: 'bg-[rgba(255,209,102,0.15)] text-[var(--accent-gold)] border border-[rgba(255,209,102,0.3)]',
  cyan: 'bg-[rgba(56,240,255,0.12)] text-[var(--accent-cyan)] border border-[rgba(56,240,255,0.25)]',
  emerald: 'bg-[rgba(52,211,153,0.12)] text-[var(--accent-emerald)] border border-[rgba(52,211,153,0.25)]',
  purple: 'bg-[rgba(122,95,255,0.15)] text-[var(--accent-purple)] border border-[rgba(122,95,255,0.3)]',
  dim: 'bg-[rgba(148,163,184,0.1)] text-[var(--text-secondary)] border border-[rgba(148,163,184,0.15)]',
}

export default function Badge({ label, variant = 'dim' }: BadgeProps) {
  return (
    <span className={clsx('inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium', variantMap[variant])}>
      {label}
    </span>
  )
}
