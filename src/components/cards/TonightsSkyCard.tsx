import CardWrapper from '@/components/layout/CardWrapper'
import type { SkyConditions } from '@/lib/types'

interface TonightsSkyCardProps {
  conditions: SkyConditions | null
  loading?: boolean
}

function getMoonPhaseName(phase: number): string {
  if (phase < 0.05 || phase > 0.95) return 'New Moon'
  if (phase < 0.25) return 'Waxing Crescent'
  if (phase < 0.3) return 'First Quarter'
  if (phase < 0.45) return 'Waxing Gibbous'
  if (phase < 0.55) return 'Full Moon'
  if (phase < 0.7) return 'Waning Gibbous'
  if (phase < 0.75) return 'Last Quarter'
  return 'Waning Crescent'
}

function getVisibilityLabel(cloudCover: number): { label: string; color: string } {
  if (cloudCover < 20) return { label: 'Excellent', color: 'text-[var(--accent-emerald)]' }
  if (cloudCover < 40) return { label: 'Good', color: 'text-[var(--accent-cyan)]' }
  if (cloudCover < 70) return { label: 'Fair', color: 'text-[var(--accent-gold)]' }
  return { label: 'Poor', color: 'text-red-400' }
}

export default function TonightsSkyCard({ conditions, loading }: TonightsSkyCardProps) {
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

  const { label, color } = getVisibilityLabel(conditions.cloudCover)

  return (
    <CardWrapper glow="cyan">
      <h3 className="text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wider mb-3">
        Tonight&apos;s Sky
      </h3>
      <div className="grid grid-cols-2 gap-3 mb-4">
        <SkyMetric label="Conditions" value={label} valueClass={color} />
        <SkyMetric label="Cloud Cover" value={`${conditions.cloudCover}%`} />
        <SkyMetric label="Moon Phase" value={getMoonPhaseName(conditions.moonPhase)} />
        <SkyMetric label="Illumination" value={`${Math.round(conditions.moonIllumination * 100)}%`} />
      </div>
      <div className="border-t border-[var(--border-glass)] pt-3">
        <p className="text-xs text-[var(--text-secondary)]">
          Best viewing:{' '}
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
