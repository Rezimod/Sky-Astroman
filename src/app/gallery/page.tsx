'use client'
import { useState, useEffect, useCallback } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import {
  ChevronLeft, LayoutDashboard, Camera, CheckCircle2, Clock, XCircle,
  Plus, X, MapPin, Calendar,
} from 'lucide-react'
import { useLanguage } from '@/contexts/LanguageContext'
import { useRouter } from 'next/navigation'

type Filter = 'all' | 'approved' | 'pending'

interface Obs {
  id: string
  user_id: string
  object_name: string
  description?: string
  photo_url?: string
  telescope_used?: string
  location_lat?: number
  location_lng?: number
  status: string
  points_awarded: number
  observed_at: string
  created_at: string
  profiles?: { display_name: string; username: string }
}

const STATUS_CONFIG = {
  approved: { icon: CheckCircle2, color: '#34D399', bg: 'rgba(52,211,153,0.12)', border: 'rgba(52,211,153,0.25)', label_en: 'Approved', label_ka: 'დამტკიცდა' },
  pending:  { icon: Clock,        color: '#FFD166', bg: 'rgba(255,209,102,0.12)', border: 'rgba(255,209,102,0.25)', label_en: 'Pending',  label_ka: 'განხილვაში' },
  rejected: { icon: XCircle,      color: '#F87171', bg: 'rgba(248,113,113,0.12)', border: 'rgba(248,113,113,0.25)', label_en: 'Rejected', label_ka: 'უარყოფილია' },
}

function initials(name?: string) {
  if (!name) return '?'
  return name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()
}

function formatDate(iso: string, lang: string) {
  return new Date(iso).toLocaleDateString(lang === 'ka' ? 'ka-GE' : 'en-US', { day: 'numeric', month: 'short', year: 'numeric' })
}

export default function GalleryPage() {
  const { lang } = useLanguage()
  const router = useRouter()
  const [filter, setFilter] = useState<Filter>('all')
  const [approved, setApproved] = useState<Obs[]>([])
  const [pending, setPending] = useState<Obs[]>([])
  const [loading, setLoading] = useState(true)
  const [selected, setSelected] = useState<Obs | null>(null)

  const loadData = useCallback(async () => {
    setLoading(true)
    const [approvedRes, pendingRes] = await Promise.allSettled([
      fetch('/api/observations?status=approved&limit=50').then(r => r.ok ? r.json() : []),
      fetch('/api/observations?status=pending&limit=50').then(r => r.ok ? r.json() : []),
    ])
    if (approvedRes.status === 'fulfilled' && Array.isArray(approvedRes.value)) setApproved(approvedRes.value)
    if (pendingRes.status === 'fulfilled' && Array.isArray(pendingRes.value)) setPending(pendingRes.value)
    setLoading(false)
  }, [])

  useEffect(() => { loadData() }, [loadData])

  // Close modal on Escape
  useEffect(() => {
    if (!selected) return
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') setSelected(null) }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [selected])

  const all = [...approved, ...pending].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
  const filtered = filter === 'all' ? all : filter === 'approved' ? approved : pending

  const communityXP = approved.reduce((sum, o) => sum + (o.points_awarded ?? 0), 0)

  const filterTabs: { key: Filter; en: string; ka: string }[] = [
    { key: 'all',      en: 'ALL',      ka: 'ყველა'      },
    { key: 'approved', en: 'APPROVED', ka: 'დამტკიცდა'  },
    { key: 'pending',  en: 'PENDING',  ka: 'განხილვაში' },
  ]

  return (
    <>
      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-5 pb-28 sm:pb-8 animate-page-enter">

        {/* Header */}
        <div className="relative flex items-center justify-center mb-4">
          <button
            onClick={() => router.back()}
            className="absolute left-0 w-9 h-9 rounded-full flex items-center justify-center transition-all hover:bg-white/[0.08]"
            style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}
          >
            <ChevronLeft size={16} className="text-[#94A3B8]" />
          </button>
          <h1 className="text-xl sm:text-2xl font-bold text-white">
            {lang === 'ka' ? 'გალერეა' : 'Gallery'}
          </h1>
          <Link
            href="/dashboard"
            className="absolute right-0 w-9 h-9 rounded-full flex items-center justify-center transition-all hover:bg-white/[0.08]"
            style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}
          >
            <LayoutDashboard size={15} className="text-[#94A3B8]" />
          </Link>
        </div>

        <p className="text-center text-xs text-[#475569] mb-4">
          {lang === 'ka' ? 'საზოგადოების ცის დაკვირვებები' : 'Community sky observations from Tbilisi'}
        </p>

        <Link
          href="/observations/new"
          className="flex items-center justify-center gap-2 w-full py-3 rounded-2xl font-bold text-sm mb-5 transition-all active:scale-[0.98]"
          style={{ background: 'linear-gradient(135deg, #6366F1, #818CF8)', color: 'white', minHeight: 48 }}
        >
          <Plus size={16} /> {lang === 'ka' ? 'ახალი დაკვირვება' : 'New Observation'}
        </Link>

        {/* Filter tabs */}
        <div className="flex justify-center mb-5">
          <div className="flex items-center gap-1 p-1 rounded-xl" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
            {filterTabs.map(tab => (
              <button
                key={tab.key}
                onClick={() => setFilter(tab.key)}
                className="px-4 py-1.5 rounded-lg text-[11px] font-bold tracking-wider transition-all"
                style={filter === tab.key ? { background: '#6366F1', color: 'white' } : { color: '#64748B' }}
              >
                {lang === 'ka' ? tab.ka : tab.en}
              </button>
            ))}
          </div>
        </div>

        {/* Stats bar */}
        <div className="flex items-center justify-center gap-8 mb-6">
          {[
            { val: approved.length, label_en: 'Approved', label_ka: 'დამტკიცდა', color: '#34D399' },
            { val: pending.length,  label_en: 'My Pending', label_ka: 'ჩემი', color: '#FFD166' },
            { val: communityXP.toLocaleString(), label_en: 'Community XP', label_ka: 'სულ XP', color: '#6366F1' },
          ].map(s => (
            <div key={s.label_en} className="text-center">
              <div className="text-lg font-bold" style={{ color: s.color }}>{s.val}</div>
              <div className="text-[10px] text-[#475569] uppercase tracking-wider">{lang === 'ka' ? s.label_ka : s.label_en}</div>
            </div>
          ))}
        </div>

        {/* Grid */}
        {loading ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="rounded-2xl animate-pulse" style={{ height: 260, background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }} />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="w-16 h-16 rounded-full flex items-center justify-center mb-4"
              style={{ background: 'rgba(99,102,241,0.08)', border: '1px solid rgba(99,102,241,0.15)' }}>
              <Camera size={24} className="text-[#6366F1] opacity-50" />
            </div>
            <p className="text-[#475569] text-sm font-medium">
              {lang === 'ka' ? 'ჯერ დაკვირვება არ არის' : 'No observations yet'}
            </p>
            <p className="text-[#334155] text-xs mt-1 mb-4">
              {lang === 'ka' ? 'მისიაზე გადი და შენი პირველი ფოტო გაგზავნე' : 'Head to missions and submit your first photo'}
            </p>
            <Link
              href="/missions"
              className="text-xs font-bold px-4 py-2 rounded-xl"
              style={{ background: '#6366F1', color: 'white' }}
            >
              {lang === 'ka' ? 'მისიები →' : 'Go to Missions →'}
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {filtered.map(o => {
              const cfg = STATUS_CONFIG[o.status as keyof typeof STATUS_CONFIG] ?? STATUS_CONFIG.pending
              const StatusIcon = cfg.icon
              const displayName = o.profiles?.display_name
              return (
                <div
                  key={o.id}
                  onClick={() => setSelected(o)}
                  className="rounded-2xl overflow-hidden flex flex-col cursor-pointer transition-all hover:scale-[1.01] hover:shadow-lg"
                  style={{ background: 'rgba(10,14,26,0.95)', border: '1px solid rgba(255,255,255,0.07)' }}
                >
                  {/* Photo */}
                  <div className="relative bg-[#0D1117]" style={{ height: 160 }}>
                    {o.photo_url ? (
                      <Image
                        src={o.photo_url}
                        alt={o.object_name}
                        fill
                        sizes="(max-width: 640px) 50vw, 33vw"
                        className="object-cover transition-transform duration-500 hover:scale-105"
                        loading="lazy"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <Camera size={32} className="text-[#1E2235]" />
                      </div>
                    )}
                    <div className="absolute inset-0 bg-gradient-to-t from-[#0A0E1A] via-transparent to-transparent" />

                    {/* Status badge */}
                    <div className="absolute top-2.5 right-2.5">
                      <span className="flex items-center gap-1 text-[9px] font-bold px-2 py-0.5 rounded-full backdrop-blur-sm"
                        style={{ background: cfg.bg, color: cfg.color, border: `1px solid ${cfg.border}` }}>
                        <StatusIcon size={9} />
                        {lang === 'ka' ? cfg.label_ka : cfg.label_en}
                      </span>
                    </div>

                    {/* XP badge */}
                    {o.status === 'approved' && o.points_awarded > 0 && (
                      <div className="absolute bottom-2.5 right-2.5 text-[10px] font-bold" style={{ color: '#F59E0B' }}>
                        +{o.points_awarded} ✦
                      </div>
                    )}
                  </div>

                  {/* Info */}
                  <div className="p-3 flex-1 flex flex-col">
                    <h3 className="text-sm font-bold text-white leading-snug line-clamp-1 mb-1">{o.object_name}</h3>
                    {o.description && (
                      <p className="text-[11px] text-[#64748B] leading-relaxed line-clamp-2 flex-1 mb-2">{o.description}</p>
                    )}
                    <div className="flex items-center justify-between mt-auto pt-2 border-t border-white/[0.05]">
                      <div className="flex items-center gap-1.5">
                        <div className="w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 text-[8px] font-bold text-white"
                          style={{ background: 'linear-gradient(135deg, rgba(99,102,241,0.4), rgba(168,85,247,0.3))' }}>
                          {initials(displayName)}
                        </div>
                        <span className="text-[10px] text-[#475569] font-medium truncate max-w-[70px]">
                          {displayName ?? (lang === 'ka' ? 'ანონიმი' : 'Anonymous')}
                        </span>
                      </div>
                      <span className="text-[10px] text-[#334155]">{formatDate(o.created_at, lang)}</span>
                    </div>
                    {o.telescope_used && (
                      <div className="mt-1.5">
                        <span className="text-[9px] font-bold tracking-wider px-2 py-0.5 rounded-full"
                          style={{ background: 'rgba(99,102,241,0.08)', color: '#818CF8', border: '1px solid rgba(99,102,241,0.15)' }}>
                          {o.telescope_used}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Detail Modal */}
      {selected && (
        <div
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4"
          style={{ background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(8px)' }}
          onClick={() => setSelected(null)}
        >
          <div
            className="w-full sm:max-w-2xl rounded-t-3xl sm:rounded-2xl overflow-hidden flex flex-col max-h-[92dvh]"
            style={{ background: '#0D1117', border: '1px solid rgba(255,255,255,0.08)' }}
            onClick={e => e.stopPropagation()}
          >
            {/* Photo */}
            <div className="relative w-full bg-black flex-shrink-0" style={{ height: 280 }}>
              {selected.photo_url ? (
                <Image
                  src={selected.photo_url}
                  alt={selected.object_name}
                  fill
                  sizes="(max-width: 640px) 100vw, 672px"
                  className="object-contain"
                  priority
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <Camera size={48} className="text-[#1E2235]" />
                </div>
              )}
              <button
                onClick={() => setSelected(null)}
                className="absolute top-3 right-3 w-8 h-8 rounded-full flex items-center justify-center z-10"
                style={{ background: 'rgba(0,0,0,0.6)', border: '1px solid rgba(255,255,255,0.15)' }}
              >
                <X size={14} className="text-white" />
              </button>
              {/* Status */}
              {(() => {
                const cfg = STATUS_CONFIG[selected.status as keyof typeof STATUS_CONFIG] ?? STATUS_CONFIG.pending
                const StatusIcon = cfg.icon
                return (
                  <div className="absolute top-3 left-3">
                    <span className="flex items-center gap-1 text-[10px] font-bold px-2.5 py-1 rounded-full"
                      style={{ background: cfg.bg, color: cfg.color, border: `1px solid ${cfg.border}` }}>
                      <StatusIcon size={10} />
                      {lang === 'ka' ? cfg.label_ka : cfg.label_en}
                    </span>
                  </div>
                )
              })()}
            </div>

            {/* Content */}
            <div className="p-5 overflow-y-auto flex-1">
              <div className="flex items-start justify-between gap-3 mb-4">
                <div>
                  <h2 className="text-lg font-bold text-white mb-1">{selected.object_name}</h2>
                  {selected.status === 'approved' && selected.points_awarded > 0 && (
                    <span className="text-sm font-bold" style={{ color: '#F59E0B' }}>+{selected.points_awarded} XP ✦</span>
                  )}
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <div className="w-8 h-8 rounded-full flex items-center justify-center text-[11px] font-bold text-white"
                    style={{ background: 'linear-gradient(135deg, rgba(99,102,241,0.4), rgba(168,85,247,0.3))' }}>
                    {initials(selected.profiles?.display_name)}
                  </div>
                  <div>
                    <div className="text-xs font-bold text-white leading-tight">{selected.profiles?.display_name ?? (lang === 'ka' ? 'ანონიმი' : 'Anonymous')}</div>
                    {selected.profiles?.username && (
                      <div className="text-[10px] text-[#475569]">@{selected.profiles.username}</div>
                    )}
                  </div>
                </div>
              </div>

              {selected.description && (
                <p className="text-sm text-[#94A3B8] leading-relaxed mb-4">{selected.description}</p>
              )}

              <div className="grid grid-cols-2 gap-2 text-[11px]">
                {selected.telescope_used && (
                  <div className="flex items-center gap-2 px-3 py-2 rounded-xl"
                    style={{ background: 'rgba(99,102,241,0.06)', border: '1px solid rgba(99,102,241,0.12)' }}>
                    <span className="text-[#6366F1]">⌬</span>
                    <span className="text-[#94A3B8]">{selected.telescope_used}</span>
                  </div>
                )}
                <div className="flex items-center gap-2 px-3 py-2 rounded-xl"
                  style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
                  <Calendar size={11} className="text-[#64748B]" />
                  <span className="text-[#94A3B8]">{formatDate(selected.observed_at, lang)}</span>
                </div>
                {selected.location_lat != null && selected.location_lng != null && (
                  <div className="flex items-center gap-2 px-3 py-2 rounded-xl col-span-2"
                    style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
                    <MapPin size={11} className="text-[#64748B]" />
                    <span className="text-[#94A3B8]">{selected.location_lat.toFixed(4)}, {selected.location_lng.toFixed(4)}</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
