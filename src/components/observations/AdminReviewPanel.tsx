'use client'
import { useState } from 'react'
import Image from 'next/image'
import Badge from '@/components/ui/Badge'
import type { Observation } from '@/lib/types'

interface AdminReviewPanelProps {
  observations: Observation[]
  onReviewed?: () => void
}

export default function AdminReviewPanel({ observations, onReviewed }: AdminReviewPanelProps) {
  const [processing, setProcessing] = useState<string | null>(null)

  const review = async (id: string, status: 'approved' | 'rejected', points?: number) => {
    setProcessing(id)
    try {
      await fetch(`/api/observations/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status, points_awarded: points }),
      })
      onReviewed?.()
    } finally {
      setProcessing(null)
    }
  }

  const pending = observations.filter(o => o.status === 'pending')

  if (pending.length === 0) {
    return <p className="text-sm text-[var(--text-secondary)] text-center py-8">No pending observations.</p>
  }

  return (
    <div className="space-y-4">
      {pending.map(obs => (
        <div key={obs.id} className="glass-card p-4">
          <div className="flex items-start justify-between gap-2 mb-3">
            <div>
              <h3 className="text-sm font-bold text-[var(--text-primary)]">{obs.object_name}</h3>
              <p className="text-xs text-[var(--text-secondary)]">
                {new Date(obs.observed_at).toLocaleString()}
                {obs.telescope_used && ` · ${obs.telescope_used}`}
              </p>
            </div>
            <Badge label="pending" variant="gold" />
          </div>

          {obs.description && (
            <p className="text-xs text-[var(--text-secondary)] mb-3">{obs.description}</p>
          )}

          {obs.photo_url && (
            <div className="relative w-full h-48 rounded-xl overflow-hidden mb-3">
              <Image src={obs.photo_url} alt={obs.object_name} fill className="object-cover" />
            </div>
          )}

          <div className="flex gap-2">
            <button
              onClick={() => review(obs.id, 'approved', 100)}
              disabled={processing === obs.id}
              className="flex-1 py-2 rounded-xl text-xs font-semibold bg-[rgba(52,211,153,0.15)] text-[var(--accent-emerald)] border border-[rgba(52,211,153,0.3)] hover:bg-[rgba(52,211,153,0.25)] disabled:opacity-50 transition-colors"
            >
              Approve (+100 pts)
            </button>
            <button
              onClick={() => review(obs.id, 'rejected')}
              disabled={processing === obs.id}
              className="flex-1 py-2 rounded-xl text-xs font-semibold bg-[rgba(239,68,68,0.1)] text-red-400 border border-[rgba(239,68,68,0.25)] hover:bg-[rgba(239,68,68,0.2)] disabled:opacity-50 transition-colors"
            >
              Reject
            </button>
          </div>
        </div>
      ))}
    </div>
  )
}
