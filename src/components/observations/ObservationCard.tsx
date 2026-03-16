import Image from 'next/image'
import Badge from '@/components/ui/Badge'
import type { Observation } from '@/lib/types'

const statusVariant: Record<string, 'emerald' | 'gold' | 'dim'> = {
  approved: 'emerald',
  pending: 'gold',
  rejected: 'dim',
}

interface ObservationCardProps {
  observation: Observation
}

export default function ObservationCard({ observation }: ObservationCardProps) {
  return (
    <div className="glass-card p-4">
      {observation.photo_url && (
        <div className="relative w-full h-40 rounded-xl overflow-hidden mb-3">
          <Image
            src={observation.photo_url}
            alt={observation.object_name}
            fill
            className="object-cover"
          />
        </div>
      )}
      <div className="flex items-start justify-between gap-2 mb-1">
        <h3 className="text-sm font-bold text-[var(--text-primary)]">{observation.object_name}</h3>
        <Badge label={observation.status} variant={statusVariant[observation.status] ?? 'dim'} />
      </div>
      {observation.description && (
        <p className="text-xs text-[var(--text-secondary)] mb-2 line-clamp-2">{observation.description}</p>
      )}
      <div className="flex items-center justify-between text-xs text-[var(--text-dim)]">
        <span>{new Date(observation.observed_at).toLocaleDateString()}</span>
        {observation.points_awarded > 0 && (
          <span className="text-[var(--accent-gold)] font-semibold">+{observation.points_awarded} pts</span>
        )}
      </div>
    </div>
  )
}
