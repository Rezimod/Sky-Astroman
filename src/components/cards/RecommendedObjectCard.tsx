'use client'
import { useState } from 'react'
import CardWrapper from '@/components/layout/CardWrapper'
import Badge from '@/components/ui/Badge'

interface CelestialObject {
  name: string
  type: string
  bestTime: string
  difficulty: 'easy' | 'medium' | 'hard'
  constellation: string
  guide: {
    howToFind: string
    equipment: string
    tips: string
  }
}

interface RecommendedObjectCardProps {
  object: CelestialObject | null
}

const difficultyVariant: Record<string, 'emerald' | 'gold' | 'purple'> = {
  easy: 'emerald',
  medium: 'gold',
  hard: 'purple',
}

export default function RecommendedObjectCard({ object }: RecommendedObjectCardProps) {
  const [expanded, setExpanded] = useState(false)

  if (!object) return null

  return (
    <CardWrapper>
      <h3 className="text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wider mb-3">
        Recommended Tonight
      </h3>
      <div className="flex items-start justify-between gap-2 mb-2">
        <div>
          <p className="text-base font-bold text-[var(--text-primary)]">{object.name}</p>
          <p className="text-xs text-[var(--text-secondary)]">{object.type} · {object.constellation}</p>
        </div>
        <Badge label={object.difficulty} variant={difficultyVariant[object.difficulty] ?? 'dim'} />
      </div>
      <p className="text-xs text-[var(--text-secondary)] mb-3">
        Best viewing: <span className="text-[var(--accent-cyan)]">{object.bestTime}</span>
      </p>

      {expanded && (
        <div className="border-t border-[var(--border-glass)] pt-3 space-y-2 mb-3">
          <GuideItem label="How to find" text={object.guide.howToFind} />
          <GuideItem label="Equipment" text={object.guide.equipment} />
          <GuideItem label="Tips" text={object.guide.tips} />
        </div>
      )}

      <button
        onClick={() => setExpanded(v => !v)}
        className="text-xs font-medium text-[var(--accent-cyan)] hover:text-[var(--accent-gold)] transition-colors"
      >
        {expanded ? 'Hide Guide' : 'View Guide'}
      </button>
    </CardWrapper>
  )
}

function GuideItem({ label, text }: { label: string; text: string }) {
  return (
    <div>
      <p className="text-xs font-semibold text-[var(--text-secondary)] mb-0.5">{label}</p>
      <p className="text-xs text-[var(--text-primary)]">{text}</p>
    </div>
  )
}
