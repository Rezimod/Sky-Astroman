'use client'
import { useState, useEffect } from 'react'
import Link from 'next/link'
import { ChevronLeft, LayoutDashboard, Camera, CheckCircle2, Clock, XCircle, Image as ImageIcon } from 'lucide-react'
import { useLanguage } from '@/contexts/LanguageContext'
import { useRouter } from 'next/navigation'

type Status = 'all' | 'approved' | 'pending'

interface Obs {
  id: string
  object_name: string
  description?: string
  photo_url?: string
  telescope_used?: string
  status: string
  points_awarded: number
  observed_at: string
  created_at: string
  profiles?: { display_name: string; username: string }
}

const MOCK_OBS: Obs[] = [
  { id: 'm1', object_name: 'Moon', description: 'Full moon through 8" reflector — incredible detail on the maria.', photo_url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/e/e1/FullMoon2010.jpg/480px-FullMoon2010.jpg', telescope_used: '8" Reflector', status: 'approved', points_awarded: 50, observed_at: new Date(Date.now() - 86400000 * 2).toISOString(), created_at: new Date(Date.now() - 86400000 * 2).toISOString(), profiles: { display_name: 'გიორგი მ.', username: 'giorgi_m' } },
  { id: 'm2', object_name: 'Jupiter', description: 'Jupiter with the Great Red Spot visible. Caught the four Galilean moons.', photo_url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/2/2b/Jupiter_and_its_shrunken_Great_Red_Spot.jpg/480px-Jupiter_and_its_shrunken_Great_Red_Spot.jpg', telescope_used: '10" Dobsonian', status: 'approved', points_awarded: 75, observed_at: new Date(Date.now() - 86400000 * 4).toISOString(), created_at: new Date(Date.now() - 86400000 * 4).toISOString(), profiles: { display_name: 'ნინო დ.', username: 'nino_d' } },
  { id: 'm3', object_name: 'Orion Nebula (M42)', description: 'First time capturing M42! Shot with phone through eyepiece.', photo_url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/f/f3/Orion_Nebula_-_Hubble_2006_mosaic_18000.jpg/480px-Orion_Nebula_-_Hubble_2006_mosaic_18000.jpg', telescope_used: 'Phone + Eyepiece', status: 'approved', points_awarded: 100, observed_at: new Date(Date.now() - 86400000 * 6).toISOString(), created_at: new Date(Date.now() - 86400000 * 6).toISOString(), profiles: { display_name: 'ლევანი ჭ.', username: 'levani_ch' } },
  { id: 'm4', object_name: 'Saturn', description: 'Rings clearly visible even at 40x magnification. Stunning.', photo_url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/c/c7/Saturn_during_Equinox.jpg/480px-Saturn_during_Equinox.jpg', telescope_used: '6" Refractor', status: 'pending', points_awarded: 0, observed_at: new Date(Date.now() - 86400000).toISOString(), created_at: new Date(Date.now() - 86400000).toISOString(), profiles: { display_name: 'ანა გ.', username: 'ana_g' } },
  { id: 'm5', object_name: 'Pleiades (M45)', description: 'Naked eye observation from Tbilisi Sea Park. Counted 6 stars.', photo_url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/4/4e/Pleiades_large.jpg/480px-Pleiades_large.jpg', telescope_used: 'Naked Eye', status: 'approved', points_awarded: 60, observed_at: new Date(Date.now() - 86400000 * 9).toISOString(), created_at: new Date(Date.now() - 86400000 * 9).toISOString(), profiles: { display_name: 'Stargazer', username: 'stargazer' } },
  { id: 'm6', object_name: 'Andromeda Galaxy (M31)', description: 'Faint fuzzy patch visible naked eye from Mtatsminda.', photo_url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/9/98/Andromeda_Galaxy_%28with_h-alpha%29.jpg/480px-Andromeda_Galaxy_%28with_h-alpha%29.jpg', telescope_used: 'Binoculars', status: 'pending', points_awarded: 0, observed_at: new Date(Date.now() - 86400000 * 1).toISOString(), created_at: new Date(Date.now() - 86400000 * 1).toISOString(), profiles: { display_name: 'თ. კაპანაძე', username: 'tamar_k' } },
]

const STATUS_CONFIG = {
  approved: { icon: CheckCircle2, color: '#34D399', bg: 'rgba(52,211,153,0.12)', border: 'rgba(52,211,153,0.25)', label_en: 'Approved', label_ka: 'დამტკიცდა' },
  pending:  { icon: Clock,         color: '#FFD166', bg: 'rgba(255,209,102,0.12)', border: 'rgba(255,209,102,0.25)', label_en: 'Pending',  label_ka: 'განხილვაში' },
  rejected: { icon: XCircle,       color: '#F87171', bg: 'rgba(248,113,113,0.12)', border: 'rgba(248,113,113,0.25)', label_en: 'Rejected', label_ka: 'უარყოფილია' },
}

function formatDate(iso: string, lang: string) {
  return new Date(iso).toLocaleDateString(lang === 'ka' ? 'ka-GE' : 'en-US', { day: 'numeric', month: 'short', year: 'numeric' })
}

export default function GalleryPage() {
  const { lang } = useLanguage()
  const router = useRouter()
  const [filter, setFilter] = useState<Status>('all')
  const [obs, setObs] = useState<Obs[]>(MOCK_OBS)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    // Try to load real approved observations from API; fall back to mock
    setLoading(true)
    fetch('/api/observations?status=approved&limit=20')
      .then(r => r.ok ? r.json() : null)
      .then(data => {
        if (Array.isArray(data) && data.length > 0) setObs([...data, ...MOCK_OBS])
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [])

  const filtered = filter === 'all' ? obs : obs.filter(o => o.status === filter)

  const filterTabs: { key: Status; en: string; ka: string }[] = [
    { key: 'all',      en: 'ALL',      ka: 'ყველა'       },
    { key: 'approved', en: 'APPROVED', ka: 'დამტკიცდა'   },
    { key: 'pending',  en: 'PENDING',  ka: 'განხილვაში'  },
  ]

  return (
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

      <p className="text-center text-xs text-[#475569] mb-5">
        {lang === 'ka' ? 'საზოგადოების ცის დაკვირვებები' : 'Community sky observations from Tbilisi'}
      </p>

      {/* Filter tabs */}
      <div className="flex justify-center mb-6">
        <div className="flex items-center gap-1 p-1 rounded-xl" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
          {filterTabs.map(tab => (
            <button
              key={tab.key}
              onClick={() => setFilter(tab.key)}
              className="px-4 py-1.5 rounded-lg text-[11px] font-bold tracking-wider transition-all"
              style={filter === tab.key
                ? { background: '#6366F1', color: 'white' }
                : { color: '#64748B' }}
            >
              {lang === 'ka' ? tab.ka : tab.en}
            </button>
          ))}
        </div>
      </div>

      {/* Stats bar */}
      <div className="flex items-center justify-center gap-6 mb-6">
        {[
          { val: obs.filter(o => o.status === 'approved').length, label_en: 'Approved', label_ka: 'დამტკიცდა', color: '#34D399' },
          { val: obs.filter(o => o.status === 'pending').length,  label_en: 'Pending',  label_ka: 'განხილვაში', color: '#FFD166' },
          { val: obs.reduce((sum, o) => sum + o.points_awarded, 0), label_en: 'XP Awarded', label_ka: 'XP სულ', color: '#6366F1' },
        ].map(s => (
          <div key={s.label_en} className="text-center">
            <div className="text-lg font-bold" style={{ color: s.color }}>{s.val.toLocaleString()}</div>
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
            className="text-xs font-bold px-4 py-2 rounded-xl transition-all"
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
            return (
              <div key={o.id} className="rounded-2xl overflow-hidden flex flex-col group cursor-pointer transition-all hover:scale-[1.01]"
                style={{ background: 'rgba(10,14,26,0.95)', border: '1px solid rgba(255,255,255,0.07)' }}>

                {/* Photo */}
                <div className="relative overflow-hidden bg-[#0D1117]" style={{ height: 150 }}>
                  {o.photo_url ? (
                    <img
                      src={o.photo_url}
                      alt={o.object_name}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                      onError={e => { (e.currentTarget as HTMLImageElement).style.display = 'none' }}
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <ImageIcon size={32} className="text-[#1E2235]" />
                    </div>
                  )}
                  {/* Gradient overlay */}
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
                    <div className="absolute bottom-2.5 right-2.5 text-[10px] font-bold"
                      style={{ color: '#F59E0B' }}>
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
                    <span className="text-[10px] text-[#475569] font-medium">
                      {o.profiles?.display_name ?? lang === 'ka' ? 'ანონიმი' : 'Anonymous'}
                    </span>
                    <span className="text-[10px] text-[#334155]">
                      {formatDate(o.created_at, lang)}
                    </span>
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
  )
}
