'use client'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { CheckCircle, XCircle, Clock, Image as ImageIcon } from 'lucide-react'
import type { Observation } from '@/lib/types'

export default function AdminObservationsPage() {
  const [observations, setObservations] = useState<(Observation & { profiles: { username: string } | null })[]>([])
  const [loading, setLoading] = useState(true)
  const [points, setPoints] = useState<Record<string, number>>({})

  useEffect(() => {
    fetchPending()
  }, [])

  async function fetchPending() {
    const supabase = createClient()
    const { data } = await supabase
      .from('observations')
      .select('*, profiles(username)')
      .eq('status', 'pending')
      .order('created_at', { ascending: false })
    setObservations(data ?? [])
    setLoading(false)
  }

  async function approve(id: string) {
    const supabase = createClient()
    const pts = points[id] ?? 50
    await supabase.from('observations').update({
      status: 'approved',
      points_awarded: pts,
      reviewed_at: new Date().toISOString(),
    }).eq('id', id)
    // Update user points
    const obs = observations.find(o => o.id === id)
    if (obs) {
      // Increment points directly via SQL increment pattern
      const { data: profile } = await supabase
        .from('profiles')
        .select('points')
        .eq('id', obs.user_id)
        .single()
      if (profile) {
        await supabase
          .from('profiles')
          .update({ points: profile.points + pts })
          .eq('id', obs.user_id)
      }
    }
    setObservations(prev => prev.filter(o => o.id !== id))
  }

  async function reject(id: string) {
    const supabase = createClient()
    await supabase.from('observations').update({
      status: 'rejected',
      reviewed_at: new Date().toISOString(),
    }).eq('id', id)
    setObservations(prev => prev.filter(o => o.id !== id))
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-6 animate-page-enter">
      <header className="mb-6">
        <h1 className="text-2xl font-bold text-white">Admin — Pending Observations</h1>
        <p className="text-sm text-[var(--text-secondary)]">{observations.length} awaiting review</p>
      </header>

      {loading && (
        <div className="glass-card p-8 text-center text-[var(--text-secondary)]">Loading...</div>
      )}

      {!loading && observations.length === 0 && (
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
              {obs.photo_url ? (
                <img src={obs.photo_url} alt={obs.object_name} className="w-full sm:w-32 h-32 object-cover rounded-xl border border-[var(--border-glass)] flex-shrink-0" />
              ) : (
                <div className="w-full sm:w-32 h-32 rounded-xl border border-[var(--border-glass)] flex items-center justify-center flex-shrink-0 bg-[rgba(15,31,61,0.5)]">
                  <ImageIcon size={24} className="text-[var(--text-dim)]" />
                </div>
              )}
              <div className="flex-1 flex flex-col gap-2">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="font-bold text-white">{obs.object_name}</p>
                    <p className="text-xs text-[var(--text-secondary)]">by @{obs.profiles?.username ?? 'unknown'} · {new Date(obs.created_at).toLocaleDateString()}</p>
                  </div>
                  <span className="flex items-center gap-1 text-xs text-amber-400 bg-amber-400/10 px-2 py-1 rounded-lg flex-shrink-0">
                    <Clock size={12} />
                    Pending
                  </span>
                </div>
                {obs.description && <p className="text-sm text-[var(--text-secondary)]">{obs.description}</p>}
                {obs.telescope_used && <p className="text-xs text-[var(--text-dim)]">Telescope: {obs.telescope_used}</p>}

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
                  <button
                    onClick={() => approve(obs.id)}
                    className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-bold bg-[#34d399]/10 border border-[#34d399]/30 text-[#34d399] hover:bg-[#34d399]/20 transition-all"
                  >
                    <CheckCircle size={15} /> Approve
                  </button>
                  <button
                    onClick={() => reject(obs.id)}
                    className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-medium bg-red-500/10 border border-red-500/30 text-red-400 hover:bg-red-500/20 transition-all"
                  >
                    <XCircle size={15} /> Reject
                  </button>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
