import CardWrapper from '@/components/layout/CardWrapper'

interface MoonPhaseCardProps {
  phase: number
  illumination: number
  phaseName: string
  rise?: string
  set?: string
}

export default function MoonPhaseCard({ phase, illumination, phaseName, rise, set }: MoonPhaseCardProps) {
  const illPct = Math.round(illumination * 100)

  return (
    <CardWrapper>
      <h3 className="text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wider mb-3">Moon Phase</h3>
      <div className="flex items-center gap-4">
        <div className="text-4xl select-none">
          {illPct < 5 ? '🌑' : illPct < 25 ? '🌒' : illPct < 45 ? '🌓' : illPct < 55 ? '🌕' : illPct < 75 ? '🌖' : illPct < 95 ? '🌗' : '🌘'}
        </div>
        <div>
          <p className="text-sm font-bold text-[var(--text-primary)]">{phaseName}</p>
          <p className="text-xs text-[var(--text-secondary)]">{illPct}% illuminated</p>
          {(rise || set) && (
            <p className="text-xs text-[var(--text-dim)] mt-1">
              {rise && `Rise: ${rise}`}{rise && set && ' · '}{set && `Set: ${set}`}
            </p>
          )}
        </div>
      </div>
    </CardWrapper>
  )
}
