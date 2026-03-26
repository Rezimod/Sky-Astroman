'use client'
import CardWrapper from '@/components/layout/CardWrapper'
import Badge from '@/components/ui/Badge'
import { useLanguage } from '@/contexts/LanguageContext'
import type { Mission, MissionProgress } from '@/lib/types'

interface ActiveMissionsCardProps {
  missions: Mission[]
  progress: MissionProgress[]
}

const difficultyVariant: Record<string, 'emerald' | 'gold' | 'purple'> = {
  easy: 'emerald',
  medium: 'gold',
  hard: 'purple',
}

export default function ActiveMissionsCard({ missions, progress }: ActiveMissionsCardProps) {
  const { t, lang } = useLanguage()
  const completedIds = new Set(
    progress.filter(p => p.status === 'completed').map(p => p.mission_id)
  )

  const difficultyLabel: Record<string, string> = {
    easy:   t('landing.easy'),
    medium: t('landing.medium'),
    hard:   t('landing.hard'),
    expert: t('landing.expert'),
  }

  return (
    <CardWrapper>
      <h3 className="text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wider mb-3">
        {t('dashboard.activeMissions')}
      </h3>
      <div className="space-y-3">
        {missions.slice(0, 3).map(mission => (
          <div key={mission.id} className="flex items-center justify-between gap-2">
            <div className="flex-1 min-w-0">
              <div className={`text-sm font-medium truncate ${completedIds.has(mission.id) ? 'line-through text-[var(--text-dim)]' : 'text-[var(--text-primary)]'}`}>
                {mission.title}
              </div>
              <div className="flex items-center gap-2 mt-0.5">
                <Badge label={difficultyLabel[mission.difficulty] ?? mission.difficulty} variant={difficultyVariant[mission.difficulty] ?? 'dim'} />
                {mission.is_daily && <Badge label={t('dashboard.daily')} variant="cyan" />}
              </div>
            </div>
            <div className="text-sm font-bold text-[var(--accent-gold)] shrink-0">
              +{mission.reward_points}
            </div>
          </div>
        ))}
        {missions.length === 0 && (
          <p className="text-sm text-[var(--text-secondary)]">{t('dashboard.noMissions')}</p>
        )}
      </div>
    </CardWrapper>
  )
}
