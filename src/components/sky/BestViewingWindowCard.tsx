import CardWrapper from '@/components/layout/CardWrapper'

interface BestViewingWindowCardProps {
  start: string
  end: string
  sunset: string
  sunrise: string
}

export default function BestViewingWindowCard({ start, end, sunset, sunrise }: BestViewingWindowCardProps) {
  return (
    <CardWrapper glow="gold">
      <h3 className="text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wider mb-3">
        Best Viewing Window
      </h3>
      <p className="text-2xl font-bold text-[var(--accent-gold)] mb-1">{start} – {end}</p>
      <p className="text-xs text-[var(--text-secondary)]">Based on cloud cover forecast</p>
      <div className="mt-3 pt-3 border-t border-[var(--border-glass)] flex gap-4 text-xs text-[var(--text-secondary)]">
        <span>Sunset: <strong className="text-[var(--text-primary)]">{sunset}</strong></span>
        <span>Sunrise: <strong className="text-[var(--text-primary)]">{sunrise}</strong></span>
      </div>
    </CardWrapper>
  )
}
