'use client'
import { useMemo, useEffect, useState } from 'react'

export default function StarField() {
  const [isMobile, setIsMobile] = useState(false)

  useEffect(() => {
    setIsMobile(window.innerWidth < 640)
    const handler = () => setIsMobile(window.innerWidth < 640)
    window.addEventListener('resize', handler)
    return () => window.removeEventListener('resize', handler)
  }, [])

  const starCount = isMobile ? 50 : 180

  const stars = useMemo(() => Array.from({ length: starCount }, (_, i) => ({
    id: i,
    top: Math.random() * 100,
    left: Math.random() * 100,
    size: Math.random() * 1.8 + 0.2,
    duration: Math.random() * 6 + 3,
    delay: Math.random() * 10,
  })), [starCount])

  const shootingStars = useMemo(() => [
    { top: 10, left: 5,  cometDur: 14, cometDelay: 0  },
    { top: 28, left: 55, cometDur: 18, cometDelay: 6  },
    { top: 60, left: 25, cometDur: 22, cometDelay: 12 },
    { top: 15, left: 75, cometDur: 16, cometDelay: 20 },
  ], [])

  return (
    <div className="fixed inset-0 overflow-hidden pointer-events-none z-0">
      {stars.map(s => (
        <div key={s.id} className="star" style={{
          top: `${s.top}%`,
          left: `${s.left}%`,
          width: s.size,
          height: s.size,
          '--duration': `${s.duration}s`,
          '--delay': `${s.delay}s`,
        } as React.CSSProperties} />
      ))}
      {!isMobile && shootingStars.map((ss, i) => (
        <div key={`comet-${i}`} className="shooting-star" style={{
          top: `${ss.top}%`,
          left: `${ss.left}%`,
          '--comet-dur': `${ss.cometDur}s`,
          '--comet-delay': `${ss.cometDelay}s`,
        } as React.CSSProperties} />
      ))}
    </div>
  )
}
