interface LevelIndicatorProps {
  level: number
  size?: 'sm' | 'md' | 'lg'
}

const sizeMap = {
  sm: 'w-7 h-7 text-xs',
  md: 'w-9 h-9 text-sm',
  lg: 'w-12 h-12 text-base',
}

export default function LevelIndicator({ level, size = 'md' }: LevelIndicatorProps) {
  return (
    <div
      className={`${sizeMap[size]} rounded-full flex items-center justify-center font-bold font-mono bg-[rgba(255,209,102,0.15)] text-[var(--accent-gold)] border border-[rgba(255,209,102,0.4)]`}
    >
      {level}
    </div>
  )
}
