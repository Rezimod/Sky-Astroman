'use client'
import { useState } from 'react'
import { CheckCircle, XCircle, Clock, Image as ImageIcon, X, ZoomIn } from 'lucide-react'

interface Obs {
  id: string
  user_id: string
  object_name: string
  description: string | null
  telescope_used: string | null
  photo_url: string | null
  location_lat: number | null
  location_lng: number | null
  observed_at: string
  created_at: string
  status: 'pending' | 'approved' | 'rejected'
  points_awarded: number
  profiles: { username: string; display_name: string | null } | { username: string; display_name: string | null }[] | null
}

interface Mission {
  id: string
  object_name: string | null
  reward_points: number
}

type FilterState = 'pending' | 'approved' | 'rejected' | 'all'
type ActionState = { type: 'approve' | 'reject'; points: number; reason: string }

function getProfile(p: Obs['profiles']) {
  if (!p) return null
  return Array.isArray(p) ? p[0] : p
}

function getInitials(name: string | null | undefined): string {
  if (!name) return '?'
  return name.slice(0, 2).toUpperCase()
}

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' })
}

export default function AdminObsClient({
  observations: initial,
  missions,
  error,
}: {
  observations: Obs[]
  missions: Mission[]
  error?: string
}) {
  const [obs, setObs]                 = useState(initial)
  const [filter, setFilter]           = useState<FilterState>('pending')
  const [enlargedPhoto, setEnlargedPhoto] = useState<string | null>(null)
  const [confirming, setConfirming]   = useState<Record<string, ActionState>>({})
  const [loadingId, setLoadingId]     = useState<string | null>(null)
  const [toast, setToast]             = useState<{ msg: string; ok: boolean } | null>(null)

  function showToast(msg: string, ok = true) {
    setToast({ msg, ok })
    setTimeout(() => setToast(null), 3000)
  }

  function missionPoints(objectName: string): number {
    return missions.find(m => m.object_name === objectName)?.reward_points ?? 100
  }

  function startApprove(id: string, objectName: string) {
    setConfirming(p => ({ ...p, [id]: { type: 'approve', points: missionPoints(objectName), reason: '' } }))
  }

  function startReject(id: string) {
    setConfirming(p => ({ ...p, [id]: { type: 'reject', points: 0, reason: '' } }))
  }

  function cancel(id: string) {
    setConfirming(p => { const n = { ...p }; delete n[id]; return n })
  }

  async function confirm(obsId: string) {
    const action = confirming[obsId]
    if (!action) return
    setLoadingId(obsId)

    const body: Record<string, unknown> = {
      status: action.type === 'approve' ? 'approved' : 'rejected',
    }
    if (action.type === 'approve') body.points_awarded = action.points

    try {
      const res = await fetch(`/api/observations/${obsId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.error ?? res.statusText)
      }
      const updated = await res.json()
      setObs(p => p.map(o => o.id === obsId ? { ...o, ...updated } : o))
      cancel(obsId)
      showToast(
        action.type === 'approve' ? `დამტკიცდა · +${action.points} XP` : 'უარყოფილია',
        action.type === 'approve',
      )
    } catch (err) {
      showToast(`Error: ${err instanceof Error ? err.message : 'unknown'}`, false)
    } finally {
      setLoadingId(null)
    }
  }

  const FILTERS: FilterState[] = ['pending', 'approved', 'rejected', 'all']
  const filtered = filter === 'all' ? obs : obs.filter(o => o.status === filter)
  const pendingCount = obs.filter(o => o.status === 'pending').length

  return (
    <>
      {/* Enlarged photo overlay */}
      {enlargedPhoto && (
        <div
          className="fixed inset-0 z-50 bg-black/95 flex items-center justify-center p-6 cursor-pointer"
          onClick={() => setEnlargedPhoto(null)}
        >
          <button
            className="absolute top-4 right-4 w-10 h-10 rounded-full bg-white/10 flex items-center justify-center hover:bg-white/20 transition-colors"
            onClick={() => setEnlargedPhoto(null)}
          >
            <X size={18} className="text-white" />
          </button>
          <img
            src={enlargedPhoto}
            alt="enlarged"
            className="max-w-full max-h-full object-contain rounded-xl"
            onClick={e => e.stopPropagation()}
          />
        </div>
      )}

      {/* Toast */}
      {toast && (
        <div className={`fixed top-4 right-4 z-50 px-4 py-3 rounded-xl text-sm font-semibold backdrop-blur-xl border ${
          toast.ok
            ? 'bg-[#34D399]/10 border-[#34D399]/30 text-[#34D399]'
            : 'bg-red-500/10 border-red-500/30 text-red-400'
        }`}>
          {toast.msg}
        </div>
      )}

      <div className="max-w-3xl animate-page-enter">
        {/* Header */}
        <div className="mb-6 flex items-center justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-xl font-bold text-white">Observations</h1>
            <p className="text-xs text-[#475569] mt-0.5">
              {pendingCount} pending · {obs.length} total
            </p>
          </div>
          <div className="flex items-center gap-1 p-1 bg-white/[0.03] border border-white/[0.06] rounded-lg">
            {FILTERS.map(f => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`px-3 py-1.5 rounded text-[10px] font-bold tracking-wider uppercase transition-all ${
                  filter === f ? 'bg-[#6366F1] text-white' : 'text-[#64748B] hover:text-white'
                }`}
              >
                {f === 'pending' ? `PENDING (${pendingCount})` : f.toUpperCase()}
              </button>
            ))}
          </div>
        </div>

        {error && (
          <div className="card p-4 mb-4" style={{ borderColor: 'rgba(248,113,113,0.20)' }}>
            <p className="text-red-400 text-sm">{error}</p>
          </div>
        )}

        {filtered.length === 0 ? (
          <div className="card p-12 text-center">
            <CheckCircle size={32} className="text-[#34D399] mx-auto mb-3" strokeWidth={1.5} />
            <p className="text-white font-semibold text-sm">All caught up</p>
            <p className="text-xs text-[#475569] mt-1">No {filter !== 'all' ? filter : ''} observations.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {filtered.map(o => {
              const profile = getProfile(o.profiles)
              const action  = confirming[o.id]
              const busy    = loadingId === o.id

              return (
                <div key={o.id} className="card p-0 overflow-hidden">

                  {/* Photo */}
                  <div
                    className="relative group"
                    style={{ height: 220, cursor: o.photo_url ? 'pointer' : 'default' }}
                    onClick={() => o.photo_url && setEnlargedPhoto(o.photo_url)}
                  >
                    {o.photo_url ? (
                      <>
                        <img
                          src={o.photo_url}
                          alt={o.object_name}
                          className="w-full h-full object-cover"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/10 to-transparent" />
                        <div className="absolute top-3 right-3 w-8 h-8 rounded-full bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                          <ZoomIn size={14} className="text-white" />
                        </div>
                        <div className="absolute bottom-3 left-4 right-4">
                          <p className="text-white font-bold text-lg leading-tight">{o.object_name}</p>
                        </div>
                      </>
                    ) : (
                      <div className="w-full h-full flex flex-col items-center justify-center gap-2"
                        style={{ background: 'rgba(255,255,255,0.02)' }}>
                        <ImageIcon size={32} className="text-[#1E2235]" />
                        <p className="text-[#1E2235] text-sm font-bold">{o.object_name}</p>
                      </div>
                    )}

                    {/* Status badge */}
                    <div className="absolute top-3 left-3">
                      <span className={`inline-flex items-center gap-1 text-[9px] font-bold px-2 py-1 rounded-full backdrop-blur-sm ${
                        o.status === 'approved' ? 'bg-[#34D399]/20 text-[#34D399] border border-[#34D399]/30'
                        : o.status === 'pending' ? 'bg-[#FFD166]/20 text-[#FFD166] border border-[#FFD166]/30'
                        : 'bg-red-500/20 text-red-400 border border-red-500/30'
                      }`}>
                        {o.status === 'pending'  && <Clock       size={8} />}
                        {o.status === 'approved' && <CheckCircle size={8} />}
                        {o.status === 'rejected' && <XCircle     size={8} />}
                        {o.status.toUpperCase()}
                      </span>
                    </div>
                  </div>

                  {/* Body */}
                  <div className="p-4 space-y-3">

                    {/* User row */}
                    <div className="flex items-center gap-3">
                      <div
                        className="w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold text-[#6366F1] flex-shrink-0"
                        style={{ background: 'rgba(99,102,241,0.15)', border: '1px solid rgba(99,102,241,0.25)' }}
                      >
                        {getInitials(profile?.display_name ?? profile?.username)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-bold text-white truncate">
                          {profile?.display_name ?? profile?.username ?? 'Unknown'}
                        </p>
                        <p className="text-[10px] text-[#475569]">@{profile?.username ?? '?'}</p>
                      </div>
                      {o.status === 'approved' && o.points_awarded > 0 && (
                        <span className="text-sm font-bold text-[#F59E0B] flex-shrink-0">
                          +{o.points_awarded} XP
                        </span>
                      )}
                    </div>

                    {/* Description */}
                    {o.description && (
                      <p className="text-sm text-[#94A3B8] leading-relaxed">{o.description}</p>
                    )}

                    {/* Meta chips */}
                    <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-[#64748B]">
                      {o.telescope_used && <span>🔭 {o.telescope_used}</span>}
                      {o.observed_at    && <span>📅 {fmtDate(o.observed_at)}</span>}
                      {o.location_lat !== null && o.location_lng !== null && (
                        <span>📍 {o.location_lat.toFixed(3)}, {o.location_lng!.toFixed(3)}</span>
                      )}
                      <span className="text-[#475569]">Submitted {fmtDate(o.created_at)}</span>
                    </div>

                    {/* Action buttons (pending only, no inline confirm open) */}
                    {o.status === 'pending' && !action && (
                      <div className="flex gap-2 pt-1">
                        <button
                          onClick={() => startApprove(o.id, o.object_name)}
                          className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-bold transition-all hover:brightness-110"
                          style={{ background: 'rgba(52,211,153,0.12)', border: '1px solid rgba(52,211,153,0.30)', color: '#34D399', minHeight: 48 }}
                        >
                          <CheckCircle size={16} /> დამტკიცება
                        </button>
                        <button
                          onClick={() => startReject(o.id)}
                          className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-bold transition-all hover:brightness-110"
                          style={{ background: 'rgba(248,113,113,0.10)', border: '1px solid rgba(248,113,113,0.28)', color: '#F87171', minHeight: 48 }}
                        >
                          <XCircle size={16} /> უარყოფა
                        </button>
                      </div>
                    )}

                    {/* Approve confirm */}
                    {action?.type === 'approve' && (
                      <div className="rounded-xl p-4 space-y-3"
                        style={{ background: 'rgba(52,211,153,0.06)', border: '1px solid rgba(52,211,153,0.20)' }}>
                        <p className="text-xs font-bold text-[#34D399] uppercase tracking-wider">XP to award</p>
                        <div className="flex items-center gap-3">
                          <input
                            type="number"
                            value={action.points}
                            onChange={e => setConfirming(p => ({ ...p, [o.id]: { ...p[o.id], points: parseInt(e.target.value) || 0 } }))}
                            min={10} max={500}
                            className="flex-1 rounded-xl px-4 py-3 text-2xl font-bold text-white text-center focus:outline-none"
                            style={{ background: 'rgba(10,15,30,0.8)', border: '1px solid rgba(52,211,153,0.30)' }}
                          />
                          <span className="text-xl font-bold text-[#34D399]">XP</span>
                        </div>
                        <div className="flex gap-2">
                          <button
                            onClick={() => confirm(o.id)}
                            disabled={busy}
                            className="flex-1 py-3 rounded-xl text-sm font-bold disabled:opacity-50 transition-all"
                            style={{ background: '#34D399', color: '#000', minHeight: 48 }}
                          >
                            {busy ? '...' : 'დადასტურება'}
                          </button>
                          <button
                            onClick={() => cancel(o.id)}
                            className="px-5 py-3 rounded-xl text-sm font-semibold transition-all"
                            style={{ background: 'rgba(255,255,255,0.05)', color: '#64748B', minHeight: 48 }}
                          >
                            გაუქმება
                          </button>
                        </div>
                      </div>
                    )}

                    {/* Reject confirm */}
                    {action?.type === 'reject' && (
                      <div className="rounded-xl p-4 space-y-3"
                        style={{ background: 'rgba(248,113,113,0.06)', border: '1px solid rgba(248,113,113,0.20)' }}>
                        <p className="text-xs font-bold text-[#F87171] uppercase tracking-wider">Rejection reason (optional)</p>
                        <textarea
                          value={action.reason}
                          onChange={e => setConfirming(p => ({ ...p, [o.id]: { ...p[o.id], reason: e.target.value } }))}
                          placeholder="Not a clear photo, wrong object..."
                          rows={2}
                          className="w-full rounded-xl px-4 py-3 text-sm text-white placeholder-[#475569] focus:outline-none resize-none"
                          style={{ background: 'rgba(10,15,30,0.8)', border: '1px solid rgba(248,113,113,0.25)' }}
                        />
                        <div className="flex gap-2">
                          <button
                            onClick={() => confirm(o.id)}
                            disabled={busy}
                            className="flex-1 py-3 rounded-xl text-sm font-bold disabled:opacity-50 transition-all"
                            style={{ background: '#F87171', color: '#000', minHeight: 48 }}
                          >
                            {busy ? '...' : 'დადასტურება'}
                          </button>
                          <button
                            onClick={() => cancel(o.id)}
                            className="px-5 py-3 rounded-xl text-sm font-semibold transition-all"
                            style={{ background: 'rgba(255,255,255,0.05)', color: '#64748B', minHeight: 48 }}
                          >
                            გაუქმება
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </>
  )
}
