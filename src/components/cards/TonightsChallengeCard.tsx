'use client'
import { useEffect, useState } from 'react'
import CardWrapper from '@/components/layout/CardWrapper'
import Badge from '@/components/ui/Badge'

interface Challenge {
  object_name: string
  title_ka: string
  description_ka: string
  reward_points: number
  difficulty: 'easy' | 'medium' | 'hard'
  expires_at: string
  object_type: string
  completed: boolean
}

function useCountdown(expiresAt: string | undefined) {
  const [timeLeft, setTimeLeft] = useState('')

  useEffect(() => {
    if (!expiresAt) return

    function update() {
      const diff = new Date(expiresAt!).getTime() - Date.now()
      if (diff <= 0) {
        setTimeLeft('00:სთ 00:წთ 00:წმ')
        return
      }
      const h = Math.floor(diff / 3600000)
      const m = Math.floor((diff % 3600000) / 60000)
      const s = Math.floor((diff % 60000) / 1000)
      const pad = (n: number) => String(n).padStart(2, '0')
      setTimeLeft(`${pad(h)}:სთ ${pad(m)}:წთ ${pad(s)}:წმ`)
    }

    update()
    const id = setInterval(update, 1000)
    return () => clearInterval(id)
  }, [expiresAt])

  return timeLeft
}

export default function TonightsChallengeCard() {
  const [challenge, setChallenge] = useState<Challenge | null | undefined>(undefined)
  const timeLeft = useCountdown(challenge?.expires_at)

  useEffect(() => {
    fetch('/api/missions/daily')
      .then(r => r.json())
      .then(data => setChallenge(data.error ? null : data))
      .catch(() => setChallenge(null))
  }, [])

  if (challenge === undefined) {
    return (
      <CardWrapper>
        <div className="animate-pulse space-y-2">
          <div className="h-3 bg-[rgba(148,163,184,0.15)] rounded w-1/3" />
          <div className="h-4 bg-[rgba(148,163,184,0.15)] rounded w-2/3" />
          <div className="h-3 bg-[rgba(148,163,184,0.15)] rounded w-full" />
          <div className="h-3 bg-[rgba(148,163,184,0.15)] rounded w-4/5" />
        </div>
      </CardWrapper>
    )
  }

  if (!challenge) {
    return (
      <CardWrapper>
        <h3 className="text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wider mb-2">
          ღამის გამოწვევა
        </h3>
        <p className="text-sm text-[var(--text-secondary)]">აქტიური მისია არ არის.</p>
      </CardWrapper>
    )
  }

  const difficultyBadge = () => {
    if (challenge.difficulty === 'easy') return <Badge label="მარტივი" variant="emerald" />
    if (challenge.difficulty === 'medium') return <Badge label="საშუალო" variant="gold" />
    return (
      <span
        className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium"
        style={{ background: 'rgba(122,95,255,0.15)', color: 'var(--accent-purple, #7a5fff)', border: '1px solid rgba(122,95,255,0.3)' }}
      >
        რთული
      </span>
    )
  }

  return (
    <CardWrapper className="animate-pulse-glow">
      <div className="flex items-start justify-between gap-2 mb-2">
        <h3 className="text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wider">
          ღამის გამოწვევა
        </h3>
        {difficultyBadge()}
      </div>

      <p className="text-sm font-semibold text-[var(--text-primary)] mb-1">{challenge.title_ka}</p>
      <p className="text-xs text-[var(--text-secondary)] mb-3">{challenge.description_ka}</p>

      <div className="flex items-center justify-between gap-2 flex-wrap">
        <span className="text-lg font-bold text-[var(--accent-gold)]">+{challenge.reward_points} ქულა</span>
        {challenge.completed ? (
          <Badge label="შესრულებულია ✓" variant="emerald" />
        ) : (
          <a
            href={`/observations/new?object=${encodeURIComponent(challenge.object_name)}`}
            className="text-sm font-medium text-[var(--accent-gold)] hover:underline"
          >
            დაწყება →
          </a>
        )}
      </div>

      {timeLeft && (
        <p className="text-xs text-[var(--text-secondary)] mt-2">შემდეგი: {timeLeft}</p>
      )}
    </CardWrapper>
  )
}
