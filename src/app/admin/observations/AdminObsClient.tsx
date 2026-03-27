'use client'
import { useState } from 'react'
import { CheckCircle, XCircle, Clock, Eye, Image as ImageIcon } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

interface Obs {
  id: string
  object_name: string
  description: string | null
  telescope_used: string | null
  photo_url: string | null
  created_at: string
  status: 'pending' | 'approved' | 'rejected'
  points_awarded: number
  // Supabase returns joined rows as array
  profiles: { username: string; display_name: string | null } | { username: string; display_name: string | null }[] | null
}

function getProfile(p: Obs['profiles']) {
  if (!p) return null
  return Array.isArray(p) ? p[0] : p
}

export default function AdminObsClient({ observations: initial, error }: { observations: Obs[]; error?: string }) {
  const [obs, setObs] = useState(initial)
  const [pointsMap, setPointsMap] = useState<Record<string, number>>(() =>
    Object.fromEntries(initial.map(o => [o.id, o.points_awarded || 50]))
  )
  const [toast, setToast] = useState<{ msg: string; ok: boolean } | null>(null)
  const [filter, setFilter] = useState<'all' | 'pending' | 'approved' | 'rejected'>('all')

  function showToast(msg: string, ok = true) {
    setToast({ msg, ok })
    setTimeout(() => setToast(null), 3000)
  }

  async function approve(id: string) {
    const supabase = createClient()
    const pts = pointsMap[id] ?? 50
    const { error } = await supabase
      .from('observations')
      .update({ status: 'approved', points_awarded: pts })
      .eq('id', id)
    if (error) { showToast(`Error: ${error.message}`, false); return }
    setObs(prev => prev.map(o => o.id === id ? { ...o, status: 'approved', points_awarded: pts } : o))
    showToast(`Approved · +${pts} pts awarded`)
  }

  async function reject(id: string) {
    const supabase = createClient()
    const { error } = await supabase
      .from('observations')
      .update({ status: 'rejected' })
      .eq('id', id)
    if (error) { showToast(`Error: ${error.message}`, false); return }
    setObs(prev => prev.map(o => o.id === id ? { ...o, status: 'rejected' } : o))
    showToast('Rejected', false)
  }

  const filtered = filter === 'all' ? obs : obs.filter(o => o.status === filter)
  const pendingCount = obs.filter(o => o.status === 'pending').length

  return (
    <div className="max-w-4xl animate-page-enter">
      {toast && (
        <div className={`fixed top-4 right-4 z-50 px-4 py-3 rounded-xl text-sm font-semibold border backdrop-blur-xl ${
          toast.ok
            ? 'bg-[#34D399]/10 border-[#34D399]/30 text-[#34D399]'
            : 'bg-red-500/10 border-red-500/30 text-red-400'
        }`}>
          {toast.msg}
        </div>
      )}

      <div className="mb-6 flex items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-white flex items-center gap-2">
            <Eye size={18} className="text-[#34D399]" /> Observations
          </h1>
          <p className="text-xs text-[#475569] mt-0.5">
            {pendingCount} pending · {obs.length} total
          </p>
        </div>
        <div className="flex items-center gap-1 p-1 bg-white/[0.03] border border-white/[0.06] rounded-lg">
          {(['all', 'pending', 'approved', 'rejected'] as const).map(f => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-3 py-1.5 rounded text-[10px] font-bold tracking-wider uppercase transition-all ${
                filter === f ? 'bg-[#6366F1] text-white' : 'text-[#64748B] hover:text-white'
              }`}
            >
              {f}
            </button>
          ))}
        </div>
      </div>

      {error && (
        <div className="card p-4 mb-4 border-red-500/20">
          <p className="text-red-400 text-sm">{error}</p>
        </div>
      )}

      {filtered.length === 0 ? (
        <div className="card p-10 text-center">
          <CheckCircle size={32} className="text-[#34D399] mx-auto mb-3" strokeWidth={1.5} />
          <p className="text-white font-semibold text-sm">All caught up</p>
          <p className="text-xs text-[#475569] mt-1">No {filter !== 'all' ? filter : ''} observations.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map(o => (
            <div key={o.id} className="card p-4">
              <div className="flex gap-4">
                {/* Photo */}
                <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-xl border border-white/[0.06] flex items-center justify-center flex-shrink-0 bg-white/[0.02] overflow-hidden">
                  {o.photo_url
                    ? <img src={o.photo_url} alt={o.object_name} className="w-full h-full object-cover" />
                    : <ImageIcon size={20} className="text-[#334155]" />
                  }
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2 mb-1">
                    <div>
                      <p className="text-sm font-bold text-white">{o.object_name}</p>
                      <p className="text-[10px] text-[#475569]">
                        by @{getProfile(o.profiles)?.username ?? '?'} · {new Date(o.created_at).toLocaleDateString()}
                      </p>
                    </div>
                    <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full flex-shrink-0 ${
                      o.status === 'approved' ? 'bg-[#34D399]/10 text-[#34D399]'
                      : o.status === 'pending' ? 'bg-[#FFD166]/10 text-[#FFD166]'
                      : 'bg-red-500/10 text-red-400'
                    }`}>
                      {o.status === 'pending' && <Clock size={8} className="inline mr-0.5" />}
                      {o.status.toUpperCase()}
                    </span>
                  </div>

                  {o.description && (
                    <p className="text-xs text-[#64748B] line-clamp-2 mb-2">{o.description}</p>
                  )}
                  {o.telescope_used && (
                    <p className="text-[10px] text-[#334155] mb-3">🔭 {o.telescope_used}</p>
                  )}

                  {o.status === 'pending' && (
                    <div className="flex items-center gap-2 flex-wrap">
                      <div className="flex items-center gap-2 bg-white/[0.03] border border-white/[0.06] rounded-lg px-2 py-1">
                        <label className="text-[10px] text-[#64748B]">XP:</label>
                        <input
                          type="number"
                          value={pointsMap[o.id] ?? 50}
                          onChange={e => setPointsMap(p => ({ ...p, [o.id]: parseInt(e.target.value) || 50 }))}
                          className="w-14 bg-transparent text-sm font-bold text-white text-center focus:outline-none"
                          min={10} max={500}
                        />
                      </div>
                      <button
                        onClick={() => approve(o.id)}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold bg-[#34D399]/10 border border-[#34D399]/30 text-[#34D399] hover:bg-[#34D399]/20 transition-all"
                      >
                        <CheckCircle size={13} /> Approve
                      </button>
                      <button
                        onClick={() => reject(o.id)}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-red-500/10 border border-red-500/30 text-red-400 hover:bg-red-500/20 transition-all"
                      >
                        <XCircle size={13} /> Reject
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
