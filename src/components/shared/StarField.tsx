'use client'
import { useMemo } from 'react'

// Static stars only — no JS animation loop, no shooting stars
// Opacity flicker handled by pure CSS on a tiny subset
export default function StarField() {
  const stars = useMemo(() => Array.from({ length: 60 }, (_, i) => ({
    id: i,
    top: (i * 37.3 + 11) % 100,
    left: (i * 61.7 + 7) % 100,
    size: i % 5 === 0 ? 1.5 : 1,
    opacity: 0.08 + (i % 7) * 0.04,
    twinkle: i % 8 === 0, // only 7-8 stars twinkle
    duration: 4 + (i % 4),
    delay: (i % 6) * 1.2,
  })), [])

  return (
    <div className="fixed inset-0 overflow-hidden pointer-events-none z-0" aria-hidden>
      {stars.map(s => (
        <div key={s.id} className={s.twinkle ? 'star' : undefined} style={{
          position: 'absolute',
          top: `${s.top}%`,
          left: `${s.left}%`,
          width: s.size,
          height: s.size,
          borderRadius: '50%',
          background: 'white',
          opacity: s.twinkle ? undefined : s.opacity,
          ...(s.twinkle ? {
            '--duration': `${s.duration}s`,
            '--delay': `${s.delay}s`,
          } as React.CSSProperties : {}),
        }} />
      ))}
    </div>
  )
}
