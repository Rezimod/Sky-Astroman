// Stellar logo — 6-pointed star with inner glow (replaces old Saturn logo)
// Kept as SaturnLogo export for backwards compatibility with existing imports
export function SaturnLogo({ width = 40, height = 40 }: { width?: number; height?: number }) {
  const s = Math.min(width, height)
  return (
    <svg width={s} height={s} viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
      {/* Outer glow ring */}
      <circle cx="20" cy="20" r="17" fill="none" stroke="rgba(99,102,241,0.15)" strokeWidth="1" />
      {/* 6-pointed star / sparkle */}
      <path
        d="M20 4 L22.5 15 L33 12 L25.5 20 L33 28 L22.5 25 L20 36 L17.5 25 L7 28 L14.5 20 L7 12 L17.5 15 Z"
        fill="url(#satGrad)"
      />
      {/* Center highlight */}
      <circle cx="20" cy="20" r="3.5" fill="rgba(165,180,252,0.7)" />
      <defs>
        <radialGradient id="satGrad" cx="38%" cy="32%" r="65%">
          <stop offset="0%" stopColor="#A5B4FC" />
          <stop offset="60%" stopColor="#6366F1" />
          <stop offset="100%" stopColor="#4338CA" stopOpacity="0.8" />
        </radialGradient>
      </defs>
    </svg>
  )
}
