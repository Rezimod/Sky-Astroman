import CardWrapper from '@/components/layout/CardWrapper'

interface HourlyData {
  hour: number
  cloudCover: number
  visibility: number
}

interface HourlyForecastCardProps {
  hourly: HourlyData[]
}

function CloudBar({ value }: { value: number }) {
  const color = value < 20 ? 'bg-[var(--accent-emerald)]'
    : value < 50 ? 'bg-[var(--accent-cyan)]'
    : value < 75 ? 'bg-[var(--accent-gold)]'
    : 'bg-red-400'

  return (
    <div className="flex flex-col items-center gap-1">
      <div className="w-4 h-16 bg-[var(--bg-cosmos)] rounded-full overflow-hidden flex flex-col-reverse">
        <div className={`${color} w-full rounded-full transition-all`} style={{ height: `${value}%` }} />
      </div>
    </div>
  )
}

export default function HourlyForecastCard({ hourly }: HourlyForecastCardProps) {
  const nightSlice = hourly.filter(h => h.hour >= 20 || h.hour <= 5)

  return (
    <CardWrapper>
      <h3 className="text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wider mb-4">
        Tonight&apos;s Forecast (Cloud Cover)
      </h3>
      <div className="flex items-end gap-3 overflow-x-auto pb-1">
        {nightSlice.map(h => (
          <div key={h.hour} className="flex flex-col items-center gap-1 shrink-0">
            <span className="text-xs text-[var(--text-dim)]">{h.cloudCover}%</span>
            <CloudBar value={h.cloudCover} />
            <span className="text-xs text-[var(--text-secondary)]">{String(h.hour).padStart(2, '0')}h</span>
          </div>
        ))}
      </div>
    </CardWrapper>
  )
}
