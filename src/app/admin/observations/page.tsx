'use client'
import { useState } from 'react'
import { CheckCircle, XCircle, Clock, Image as ImageIcon } from 'lucide-react'

interface MockObs {
  id: string
  object_name: string
  username: string
  description: string
  telescope_used: string
  photo_url: string | null
  created_at: string
  status: 'pending' | 'approved' | 'rejected'
}

const initialObservations: MockObs[] = [
  {
    id: '1', object_name: 'The Moon', username: 'night_sky_ge',
    description: 'Observed 5 craters clearly through the eyepiece. Mare Tranquillitatis was very visible.',
    telescope_used: 'Celestron 8" SCT', photo_url: null,
    created_at: new Date(Date.now() - 3600000).toISOString(), status: 'pending',
  },
  {
    id: '2', object_name: 'Jupiter', username: 'cosmos_nika',
    description: 'Could see all 4 Galilean moons and 2 cloud bands.',
    telescope_used: 'Sky-Watcher 6" Dobsonian', photo_url: null,
    created_at: new Date(Date.now() - 7200000).toISOString(), status: 'pending',
  },
  {
    id: '3', object_name: 'Pleiades (M45)', username: 'orion_hunter',
    description: 'Counted 9 stars with naked eye from dark site near Mtskheta.',
    telescope_used: 'Naked eye + binoculars', photo_url: null,
    created_at: new Date(Date.now() - 10800000).toISOString(), status: 'pending',
  },
]

export default function AdminObservationsPage() {
  const [observations, setObservations] = useState<MockObs[]>(initialObservations)
  const [points, setPoints] = useState<Record<string, number>>({ '1': 50, '2': 75, '3': 60 })
  const [toast, setToast] = useState<string | null>(null)

  function approve(id: string) {
    setObservations(prev => prev.filter(o => o.id !== id))
    setToast(`Approved! +${points[id] ?? 50} pts awarded`)
    setTimeout(() => setToast(null), 3000)
  }

  function reject(id: string) {
    setObservations(prev => prev.filter(o => o.id !== id))
    setToast('Observation rejected.')
    setTimeout(() => setToast(null), 3000)
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-6 animate-page-enter">
      {toast && (
        <div className="fixed top-4 right-4 z-50 glass-card px-4 py-3 text-sm text-white border-[rgba(52,211,153,0.3)]">
          {toast}
        </div>
      )}

      <header className="mb-6">
        <h1 className="text-2xl font-bold text-white">Admin — Pending Observations</h1>
        <p className="text-sm text-[var(--text-secondary)]">{observations.length} awaiting review</p>
      </header>

      {observations.length === 0 && (
        <div className="glass-card p-12 text-center">
          <CheckCircle size={40} className="text-[#34d399] mx-auto mb-3" />
          <p className="text-white font-semibold">All caught up!</p>
          <p className="text-sm text-[var(--text-secondary)] mt-1">No pending observations.</p>
        </div>
      )}

      <div className="flex flex-col gap-4">
        {observations.map(obs => (
          <div key={obs.id} className="glass-card p-5">
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="w-full sm:w-32 h-32 rounded-xl border border-[var(--border-glass)] flex items-center justify-center flex-shrink-0 bg-[rgba(15,31,61,0.5)]">
                <ImageIcon size={24} className="text-[var(--text-dim)]" />
              </div>
              <div className="flex-1 flex flex-col gap-2">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="font-bold text-white">{obs.object_name}</p>
                    <p className="text-xs text-[var(--text-secondary)]">by @{obs.username} · {new Date(obs.created_at).toLocaleDateString()}</p>
                  </div>
                  <span className="flex items-center gap-1 text-xs text-amber-400 bg-amber-400/10 px-2 py-1 rounded-lg flex-shrink-0">
                    <Clock size={12} /> Pending
                  </span>
                </div>
                <p className="text-sm text-[var(--text-secondary)]">{obs.description}</p>
                <p className="text-xs text-[var(--text-dim)]">Telescope: {obs.telescope_used}</p>

                <div className="flex items-center gap-3 mt-2 flex-wrap">
                  <div className="flex items-center gap-2">
                    <label className="text-xs text-[var(--text-secondary)]">Points:</label>
                    <input
                      type="number"
                      value={points[obs.id] ?? 50}
                      onChange={e => setPoints(prev => ({ ...prev, [obs.id]: parseInt(e.target.value) || 50 }))}
                      className="w-20 bg-[rgba(15,31,61,0.8)] border border-[var(--border-glass)] rounded-lg px-2 py-1 text-sm text-white text-center focus:outline-none focus:border-[rgba(255,209,102,0.4)]"
                      min={10} max={500}
                    />
                  </div>
                  <button onClick={() => approve(obs.id)} className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-bold bg-[#34d399]/10 border border-[#34d399]/30 text-[#34d399] hover:bg-[#34d399]/20 transition-all">
                    <CheckCircle size={15} /> Approve
                  </button>
                  <button onClick={() => reject(obs.id)} className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-medium bg-red-500/10 border border-red-500/30 text-red-400 hover:bg-red-500/20 transition-all">
                    <XCircle size={15} /> Reject
                  </button>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="mt-6 glass-card p-4 border-[rgba(255,209,102,0.15)]">
        <p className="text-xs text-[var(--text-dim)] text-center">
          Demo mode — connect Supabase to manage real observations
        </p>
      </div>
    </div>
  )
}
