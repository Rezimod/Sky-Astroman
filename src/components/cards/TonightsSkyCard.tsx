'use client'
import CardWrapper from '@/components/layout/CardWrapper'
import { useLanguage } from '@/contexts/LanguageContext'
import type { SkyConditions } from '@/lib/types'

interface TonightsSkyCardProps {
  conditions: SkyConditions | null
  loading?: boolean
}

function getMoonPhaseKey(phase: number): string {
  if (phase < 0.05 || phase > 0.95) return 'sky.newMoon'
  if (phase < 0.25) return 'sky.waxCrescent'
  if (phase < 0.3)  return 'sky.firstQuarter'
  if (phase < 0.45) return 'sky.waxGibbous'
  if (phase < 0.55) return 'sky.fullMoon'
  if (phase < 0.7)  return 'sky.wanGibbous'
  if (phase < 0.75) return 'sky.lastQuarter'
  return 'sky.wanCrescent'
}

function getVisibilityKey(cloudCover: number): { key: string; color: string } {
  if (cloudCover < 20) return { key: 'sky.excellent', color: 'text-[var(--accent-emerald)]' }
  if (cloudCover < 40) return { key: 'sky.good',      color: 'text-[var(--accent-cyan)]' }
  if (cloudCover < 70) return { key: 'sky.fair',      color: 'text-[var(--accent-gold)]' }
  return { key: 'sky.poor', color: 'text-red-400' }
}

export default function TonightsSkyCard({ conditions, loading }: TonightsSkyCardProps) {
  const { t } = useLanguage()

  if (loading || !conditions) {
    return (
      <CardWrapper>
        <div className="animate-pulse space-y-3">
          <div className="h-4 bg-[var(--bg-cosmos)] rounded w-1/2" />
          <div className="h-8 bg-[var(--bg-cosmos)] rounded" />
          <div className="h-4 bg-[var(--bg-cosmos)] rounded w-3/4" />
        </div>
      </CardWrapper>
    )
  }

  const { key: visKey, color } = getVisibilityKey(conditions.cloudCover)

  return (
    <CardWrapper glow="cyan">
      <h3 className="text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wider mb-3">
        {t('sky.title')}
      </h3>
      <div className="grid grid-cols-2 gap-3 mb-4">
        <SkyMetric label={t('dashboard.conditions')} value={t(visKey)} valueClass={color} />
        <SkyMetric label={t('sky.cloudCover')} value={`${conditions.cloudCover}%`} />
        <SkyMetric label={t('sky.moonPhase')} value={t(getMoonPhaseKey(conditions.moonPhase))} />
        <SkyMetric label={t('dashboard.illumination')} value={`${Math.round(conditions.moonIllumination * 100)}%`} />
      </div>
      <div className="border-t border-[var(--border-glass)] pt-3">
        <p className="text-xs text-[var(--text-secondary)]">
          {t('dashboard.bestViewing')}{' '}
          <span className="text-[var(--accent-cyan)] font-medium">
            {conditions.bestViewingStart} – {conditions.bestViewingEnd}
          </span>
        </p>
      </div>
    </CardWrapper>
  )
}

function SkyMetric({ label, value, valueClass = 'text-[var(--text-primary)]' }: {
  label: string
  value: string
  valueClass?: string
}) {
  return (
    <div>
      <div className={`text-sm font-semibold ${valueClass}`}>{value}</div>
      <div className="text-xs text-[var(--text-secondary)]">{label}</div>
    </div>
  )
}
