'use client'
import { useState, useEffect } from 'react'
import { CheckCircle2, Clock, Search, Plus, ArrowRight, ChevronLeft, LayoutDashboard } from 'lucide-react'
import Link from 'next/link'
import { DIFFICULTY_CONFIG } from '@/lib/missions'
import ObservationModal from '@/components/observations/ObservationModal'
import { useLanguage } from '@/contexts/LanguageContext'
import { useRouter } from 'next/navigation'
import type { GeneratedMission } from '@/lib/types'

// Real astronomy images by object ID (NASA/ESA/Hubble public domain via Wikimedia)
const OBJECT_IMAGES: Record<string, string> = {
  moon:          'https://upload.wikimedia.org/wikipedia/commons/thumb/e/e1/FullMoon2010.jpg/480px-FullMoon2010.jpg',
  venus:         'https://upload.wikimedia.org/wikipedia/commons/thumb/e/e5/Venus-real_color.jpg/480px-Venus-real_color.jpg',
  jupiter:       'https://upload.wikimedia.org/wikipedia/commons/thumb/2/2b/Jupiter_and_its_shrunken_Great_Red_Spot.jpg/480px-Jupiter_and_its_shrunken_Great_Red_Spot.jpg',
  mars:          'https://upload.wikimedia.org/wikipedia/commons/thumb/0/02/OSIRIS_Mars_true_color.jpg/480px-OSIRIS_Mars_true_color.jpg',
  saturn:        'https://upload.wikimedia.org/wikipedia/commons/thumb/c/c7/Saturn_during_Equinox.jpg/480px-Saturn_during_Equinox.jpg',
  mercury:       'https://upload.wikimedia.org/wikipedia/commons/thumb/4/4a/Mercury_in_true_color.jpg/480px-Mercury_in_true_color.jpg',
  uranus:        'https://upload.wikimedia.org/wikipedia/commons/thumb/3/3d/Uranus2.jpg/480px-Uranus2.jpg',
  neptune:       'https://upload.wikimedia.org/wikipedia/commons/thumb/6/63/Neptune_-_Voyager_2_%2829347980845%29_flatten_crop.jpg/480px-Neptune_-_Voyager_2_%2829347980845%29_flatten_crop.jpg',
  pleiades:      'https://upload.wikimedia.org/wikipedia/commons/thumb/4/4e/Pleiades_large.jpg/480px-Pleiades_large.jpg',
  double_cluster:'https://upload.wikimedia.org/wikipedia/commons/thumb/b/b2/NGC_869_%26_884.jpg/480px-NGC_869_%26_884.jpg',
  andromeda:     'https://upload.wikimedia.org/wikipedia/commons/thumb/9/98/Andromeda_Galaxy_%28with_h-alpha%29.jpg/480px-Andromeda_Galaxy_%28with_h-alpha%29.jpg',
  orion_nebula:  'https://upload.wikimedia.org/wikipedia/commons/thumb/f/f3/Orion_Nebula_-_Hubble_2006_mosaic_18000.jpg/480px-Orion_Nebula_-_Hubble_2006_mosaic_18000.jpg',
  beehive:       'https://upload.wikimedia.org/wikipedia/commons/thumb/4/47/M44.jpg/480px-M44.jpg',
  hercules:      'https://upload.wikimedia.org/wikipedia/commons/thumb/9/9b/Messier_13_Hubble_WikiSky.jpg/480px-Messier_13_Hubble_WikiSky.jpg',
  ring_nebula:   'https://upload.wikimedia.org/wikipedia/commons/thumb/1/1e/M57_The_Ring_Nebula.JPG/480px-M57_The_Ring_Nebula.JPG',
  dumbbell:      'https://upload.wikimedia.org/wikipedia/commons/thumb/3/30/Messier27.jpg/480px-Messier27.jpg',
  crab_nebula:   'https://upload.wikimedia.org/wikipedia/commons/thumb/0/00/Crab_Nebula.jpg/480px-Crab_Nebula.jpg',
  whirlpool:     'https://upload.wikimedia.org/wikipedia/commons/thumb/3/3f/Hubble_Interacting_Galaxy_NGC_2623_%282008-04-24%29.jpg/480px-Hubble_Interacting_Galaxy_NGC_2623_%282008-04-24%29.jpg',
}

const DIFF_MAP: Record<string, keyof typeof DIFFICULTY_CONFIG> = {
  easy: 'Beginner', medium: 'Intermediate', hard: 'Hard', expert: 'Expert',
}

const DIFF_STYLE: Record<string, { label: string; labelGe: string; bg: string; text: string; border: string }> = {
  easy:   { label: 'EASY',   labelGe: 'მარტივი', bg: 'rgba(52,211,153,0.15)',  text: '#34D399',  border: 'rgba(52,211,153,0.3)'  },
  medium: { label: 'MEDIUM', labelGe: 'საშუალო', bg: 'rgba(255,209,102,0.15)', text: '#FFD166',  border: 'rgba(255,209,102,0.3)' },
  hard:   { label: 'HARD',   labelGe: 'რთული',   bg: 'rgba(248,113,113,0.15)', text: '#F87171',  border: 'rgba(248,113,113,0.3)' },
  expert: { label: 'EXPERT', labelGe: 'ექსპერტი',bg: 'rgba(192,132,252,0.15)', text: '#C084FC',  border: 'rgba(192,132,252,0.3)' },
}

type FilterKey = 'all' | 'easy' | 'medium' | 'hard'

export default function MissionsPage() {
  const { lang } = useLanguage()
  const router = useRouter()
  const [missions, setMissions] = useState<GeneratedMission[]>([])
  const [loading, setLoading] = useState(true)
  const [activeMission, setActiveMission] = useState<GeneratedMission | null>(null)
  const [completedIds, setCompletedIds] = useState<Set<string>>(new Set())
  const [pendingIds, setPendingIds] = useState<Set<string>>(new Set())
  const [filter, setFilter] = useState<FilterKey>('all')
  const [search, setSearch] = useState('')

  useEffect(() => {
    try {
      const saved = localStorage.getItem('sky_pending_missions')
      if (saved) setPendingIds(new Set(JSON.parse(saved)))
      const done = localStorage.getItem('sky_completed_missions')
      if (done) setCompletedIds(new Set(JSON.parse(done)))
    } catch {}
  }, [])

  useEffect(() => {
    fetch('/api/missions')
      .then(r => r.json())
      .then(data => { if (Array.isArray(data)) setMissions(data); setLoading(false) })
      .catch(() => setLoading(false))
  }, [])

  function handleSuccess(missionId: string) {
    setPendingIds(prev => {
      const next = new Set(prev).add(missionId)
      localStorage.setItem('sky_pending_missions', JSON.stringify([...next]))
      return next
    })
    setActiveMission(null)
  }

  const featured = missions[0] ?? null
  const filtered = missions.filter(m => {
    if (filter !== 'all' && m.difficulty !== filter) return false
    if (search) {
      const q = search.toLowerCase()
      const name = lang === 'ka' ? m.titleGe : m.objectName
      if (!name.toLowerCase().includes(q)) return false
    }
    return true
  })

  const filterTabs: { key: FilterKey; label: string; labelGe: string }[] = [
    { key: 'all',    label: 'ALL',    labelGe: 'ყველა'   },
    { key: 'easy',   label: 'EASY',   labelGe: 'მარტივი' },
    { key: 'medium', label: 'MEDIUM', labelGe: 'საშუალო' },
    { key: 'hard',   label: 'HARD',   labelGe: 'რთული'   },
  ]

  return (
    <>
      {activeMission && (
        <ObservationModal
          mission={{
            id: activeMission.id,
            name: lang === 'ka' ? activeMission.titleGe : activeMission.objectName,
            emoji: activeMission.objectEmoji,
            difficulty: DIFF_MAP[activeMission.difficulty] ?? 'Beginner',
            points: activeMission.points,
            type: activeMission.equipment === 'naked_eye' ? 'naked_eye' : 'telescope',
            desc: lang === 'ka' ? activeMission.descriptionGe : activeMission.description,
            hint: lang === 'ka'
              ? `საუკეთესო დრო: ${activeMission.bestTime} · მაქს. სიმაღლე: ${activeMission.maxAltitude}°`
              : `Best viewing: ${activeMission.bestTime} · Peak altitude: ${activeMission.maxAltitude}°`,
          }}
          onClose={() => setActiveMission(null)}
          onSuccess={() => handleSuccess(activeMission.id)}
        />
      )}

      <div className="max-w-7xl mx-auto px-3 sm:px-4 lg:px-6 py-4 sm:py-6 animate-page-enter">

        {/* Header */}
        <div className="relative flex items-center justify-center mb-5 sm:mb-6">
          <button
            onClick={() => router.back()}
            className="absolute left-0 w-9 h-9 rounded-full flex items-center justify-center transition-all hover:bg-white/[0.08]"
            style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}
          >
            <ChevronLeft size={16} className="text-[#94A3B8]" />
          </button>
          <h1
            className="text-base sm:text-lg font-bold text-white px-6 py-2 rounded-full"
            style={{ background: 'linear-gradient(135deg, rgba(99,102,241,0.18), rgba(168,85,247,0.12))', border: '1px solid rgba(99,102,241,0.28)' }}
          >
            {lang === 'ka' ? 'აქტიური მისიები' : 'Active Missions'}
          </h1>
          <Link
            href="/dashboard"
            className="absolute right-0 w-9 h-9 rounded-full flex items-center justify-center transition-all hover:bg-white/[0.08]"
            style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}
          >
            <LayoutDashboard size={15} className="text-[#94A3B8]" />
          </Link>
        </div>

        {/* Featured banner */}
        {!loading && featured && (
          <div
            className="relative overflow-hidden rounded-xl border mb-4 sm:mb-5"
            style={{ background: 'linear-gradient(135deg, #0D1117 60%, rgba(99,102,241,0.08))', borderColor: 'rgba(99,102,241,0.2)' }}
          >
            {/* Background image */}
            {OBJECT_IMAGES[featured.id] && (
              <div className="absolute inset-0 opacity-[0.12]">
                <img
                  src={OBJECT_IMAGES[featured.id]}
                  alt={featured.objectName}
                  className="w-full h-full object-cover"
                  onError={e => { (e.currentTarget as HTMLImageElement).style.display = 'none' }}
                />
              </div>
            )}
            <div className="absolute top-0 right-0 w-48 h-48 bg-[#6366F1]/10 rounded-full blur-3xl pointer-events-none -translate-y-1/2 translate-x-1/4" />
            <div className="relative p-5 sm:p-6">
              <div className="flex items-center gap-2 mb-3">
                <span className="w-1.5 h-1.5 rounded-full bg-[#6366F1] animate-pulse" />
                <span className="text-[10px] font-bold tracking-[0.15em] text-[#6366F1] uppercase">
                  {lang === 'ka' ? 'კვირის მისია' : 'Mission of the Week'}
                </span>
              </div>
              <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
                <div>
                  <h2 className="text-lg sm:text-xl font-bold text-white mb-1.5">
                    {lang === 'ka' ? featured.titleGe : featured.title}
                  </h2>
                  <p className="text-xs text-[#64748B] max-w-xl leading-relaxed line-clamp-2">
                    {lang === 'ka' ? featured.descriptionGe : featured.description}
                  </p>
                </div>
                <div className="flex items-center gap-3 flex-shrink-0">
                  <div className="text-right">
                    <div className="text-[10px] text-[#64748B] uppercase tracking-wider">{lang === 'ka' ? 'ჯილდო' : 'Reward'}</div>
                    <div className="text-lg font-bold text-white">+{featured.points} XP</div>
                  </div>
                  <button
                    onClick={() => !completedIds.has(featured.id) && !pendingIds.has(featured.id) && setActiveMission(featured)}
                    disabled={completedIds.has(featured.id) || pendingIds.has(featured.id)}
                    className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                    style={{ background: '#6366F1', color: 'white' }}
                  >
                    {completedIds.has(featured.id)
                      ? (lang === 'ka' ? 'შესრულდა' : 'Done')
                      : pendingIds.has(featured.id)
                      ? (lang === 'ka' ? 'განხილვაში' : 'In Review')
                      : (lang === 'ka' ? 'დაწყება' : 'Begin')}
                    <ArrowRight size={14} />
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Filters + search */}
        <div className="flex flex-col sm:flex-row gap-3 mb-4">
          <div className="flex items-center gap-1 p-1 bg-white/[0.03] border border-white/[0.06] rounded-lg">
            {filterTabs.map(tab => (
              <button
                key={tab.key}
                onClick={() => setFilter(tab.key)}
                className={`px-3 py-1.5 rounded text-[11px] font-bold tracking-wider transition-all ${
                  filter === tab.key ? 'bg-[#6366F1] text-white' : 'text-[#64748B] hover:text-white'
                }`}
              >
                {lang === 'ka' ? tab.labelGe : tab.label}
              </button>
            ))}
          </div>
          <div className="relative flex-1 sm:max-w-64">
            <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#475569]" />
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder={lang === 'ka' ? 'მოძებნე...' : 'Search...'}
              className="w-full bg-white/[0.03] border border-white/[0.06] rounded-lg py-2 pl-8 pr-4 text-sm text-white placeholder:text-[#475569] focus:outline-none focus:border-[#6366F1]/50 transition-all"
            />
          </div>
        </div>

        {/* Mission grid */}
        {loading ? (
          <div className="grid grid-cols-2 gap-3">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="card h-52 animate-pulse" />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3">
            {filtered.map(mission => {
              const done    = completedIds.has(mission.id)
              const pending = pendingIds.has(mission.id)
              const style   = DIFF_STYLE[mission.difficulty]
              const imgSrc  = OBJECT_IMAGES[mission.id]

              return (
                <div
                  key={mission.id}
                  className="card overflow-hidden flex flex-col cursor-pointer group transition-all hover:border-white/10 hover:scale-[1.01]"
                  style={{ opacity: done ? 0.6 : 1 }}
                  onClick={() => !done && !pending && setActiveMission(mission)}
                >
                  {/* Image */}
                  <div className="relative h-24 bg-[#0D1117] overflow-hidden flex-shrink-0">
                    {imgSrc ? (
                      <img
                        src={imgSrc}
                        alt={mission.objectName}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                        onError={e => { (e.currentTarget as HTMLImageElement).style.display = 'none' }}
                      />
                    ) : (
                      <div className="w-full h-full bg-gradient-to-br from-[#1a1a3e] to-[#0D1117]" />
                    )}
                    {/* Gradient overlay */}
                    <div className="absolute inset-0 bg-gradient-to-t from-[#0D1117] via-[#0D1117]/30 to-transparent" />

                    {/* Difficulty badge */}
                    <div className="absolute top-2 left-2">
                      <span
                        className="text-[8px] font-bold tracking-wider px-1.5 py-0.5 rounded-full uppercase backdrop-blur-sm"
                        style={{ background: style?.bg, color: style?.text, border: `1px solid ${style?.border}` }}
                      >
                        {lang === 'ka' ? style?.labelGe : style?.label}
                      </span>
                    </div>

                    {/* Status */}
                    <div className="absolute top-2 right-2">
                      {done && <CheckCircle2 size={14} className="text-[#34D399]" />}
                      {pending && <Clock size={14} className="text-[#FFD166]" />}
                    </div>
                  </div>

                  {/* Content */}
                  <div className="p-3 flex flex-col flex-1">
                    <h3 className="text-sm font-bold text-white leading-snug line-clamp-1 mb-1">
                      {lang === 'ka'
                        ? mission.titleGe?.replace(/^[^ ]+ /, '') ?? mission.objectName
                        : mission.objectName}
                    </h3>
                    <p className="text-[11px] text-[#64748B] leading-relaxed line-clamp-2 flex-1">
                      {lang === 'ka' ? mission.descriptionGe : mission.description}
                    </p>

                    <div className="flex items-center justify-between mt-2.5 pt-2 border-t border-white/[0.06]">
                      <span className="text-xs font-bold text-white">+{mission.points} XP</span>
                      {done ? (
                        <span className="text-[10px] font-bold text-[#34D399]">
                          {lang === 'ka' ? 'შესრულდა' : 'Done'}
                        </span>
                      ) : pending ? (
                        <span className="text-[10px] font-bold text-[#FFD166]">
                          {lang === 'ka' ? 'განხილვაში' : 'In Review'}
                        </span>
                      ) : (
                        <span
                          className="text-[10px] font-bold px-2.5 py-1 rounded transition-all"
                          style={{ background: 'rgba(99,102,241,0.15)', color: '#818CF8', border: '1px solid rgba(99,102,241,0.25)' }}
                        >
                          {lang === 'ka' ? 'დაწყება' : 'Begin'}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              )
            })}

            {/* Suggest card */}
            <div className="card p-4 flex flex-col items-center justify-center text-center group cursor-pointer hover:border-white/10 transition-all min-h-52">
              <div className="w-9 h-9 rounded-full bg-white/[0.04] border border-white/[0.06] flex items-center justify-center mb-2.5 group-hover:border-[#6366F1]/40 transition-all">
                <Plus size={16} className="text-[#475569] group-hover:text-[#6366F1] transition-colors" />
              </div>
              <h3 className="text-xs font-bold text-[#475569] group-hover:text-white transition-colors">
                {lang === 'ka' ? 'მისია შემოგვთავაზე' : 'Suggest a Mission'}
              </h3>
            </div>
          </div>
        )}
      </div>
    </>
  )
}
