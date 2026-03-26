'use client'
import CardWrapper from '@/components/layout/CardWrapper'
import Badge from '@/components/ui/Badge'
import { useLanguage } from '@/contexts/LanguageContext'

interface TonightsChallengeCardProps {
  challenge: {
    title: string
    description: string
    reward_points: number
    completed?: boolean
  } | null
}

export default function TonightsChallengeCard({ challenge }: TonightsChallengeCardProps) {
  const { t } = useLanguage()

  if (!challenge) {
    return (
      <CardWrapper>
        <h3 className="text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wider mb-2">
          {t('dashboard.challenge')}
        </h3>
        <p className="text-sm text-[var(--text-secondary)]">{t('dashboard.noMissions')}</p>
      </CardWrapper>
    )
  }

  return (
    <CardWrapper className="animate-pulse-glow">
      <div className="flex items-start justify-between gap-2 mb-2">
        <h3 className="text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wider">
          {t('dashboard.challenge')}
        </h3>
        <Badge label={t('dashboard.daily')} variant="gold" />
      </div>
      <p className="text-sm font-semibold text-[var(--text-primary)] mb-1">{challenge.title}</p>
      <p className="text-xs text-[var(--text-secondary)] mb-3">{challenge.description}</p>
      <div className="flex items-center justify-between">
        <span className="text-lg font-bold text-[var(--accent-gold)]">+{challenge.reward_points} {t('leaderboard.pts')}</span>
        {challenge.completed && <Badge label={t('missions.completed')} variant="emerald" />}
      </div>
    </CardWrapper>
  )
}
