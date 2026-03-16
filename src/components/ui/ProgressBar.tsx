interface ProgressBarProps {
  value: number // 0-100
  color?: 'gold' | 'cyan' | 'emerald'
  className?: string
}

export default function ProgressBar({ value, color = 'gold', className = '' }: ProgressBarProps) {
  const colorMap = {
    gold: 'bg-[var(--accent-gold)]',
    cyan: 'bg-[var(--accent-cyan)]',
    emerald: 'bg-[var(--accent-emerald)]',
  }
  return (
    <div className={`w-full h-2 bg-[var(--bg-cosmos)] rounded-full overflow-hidden ${className}`}>
      <div
        className={`h-full rounded-full transition-all duration-500 ${colorMap[color]}`}
        style={{ width: `${Math.min(Math.max(value, 0), 100)}%` }}
      />
    </div>
  )
}
