import CardWrapper from '@/components/layout/CardWrapper'

interface SeeingConditionsCardProps {
  cloudCover: number
  visibility: number // km
  temperature: number
}

function getSeeingScore(cloudCover: number, visibility: number): { score: number; label: string; color: string } {
  const visScore = Math.min(visibility / 20, 1)
  const cloudScore = 1 - cloudCover / 100
  const score = Math.round((visScore * 0.4 + cloudScore * 0.6) * 5)

  if (score >= 4) return { score, label: 'Excellent seeing', color: 'text-[var(--accent-emerald)]' }
  if (score >= 3) return { score, label: 'Good seeing', color: 'text-[var(--accent-cyan)]' }
  if (score >= 2) return { score, label: 'Average seeing', color: 'text-[var(--accent-gold)]' }
  return { score, label: 'Poor seeing', color: 'text-red-400' }
}

export default function SeeingConditionsCard({ cloudCover, visibility, temperature }: SeeingConditionsCardProps) {
  const { score, label, color } = getSeeingScore(cloudCover, visibility)

  return (
    <CardWrapper>
      <h3 className="text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wider mb-3">Seeing Conditions</h3>
      <div className="flex items-center gap-3 mb-3">
        <div className="flex gap-1">
          {Array.from({ length: 5 }).map((_, i) => (
            <div
              key={i}
              className={`w-3 h-6 rounded-sm ${i < score ? 'bg-[var(--accent-gold)]' : 'bg-[var(--bg-cosmos)]'}`}
            />
          ))}
        </div>
        <span className={`text-sm font-semibold ${color}`}>{label}</span>
      </div>
      <div className="text-xs text-[var(--text-secondary)] space-y-0.5">
        <p>Cloud cover: {cloudCover}%</p>
        <p>Visibility: {visibility} km</p>
        <p>Temperature: {temperature}°C</p>
      </div>
    </CardWrapper>
  )
}
