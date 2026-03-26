'use client'
import { useState, useEffect } from 'react'
import { CheckCircle2, Clock, Search, Plus, ArrowRight, Moon, Star, Globe, Circle, Sparkles, Aperture, Hexagon, Gem, Telescope, Zap, RefreshCw, ChevronLeft } from 'lucide-react'
import { DIFFICULTY_CONFIG } from '@/lib/missions'
import ObservationModal from '@/components/observations/ObservationModal'
import { useLanguage } from '@/contexts/LanguageContext'
import { useRouter } from 'next/navigation'
import type { GeneratedMission } from '@/lib/types'

const DIFF_MAP: Record<string, keyof typeof DIFFICULTY_CONFIG> = {
  easy: 'Beginner', medium: 'Intermediate', hard: 'Hard', expert: 'Expert',
}

const DIFF_STYLE: Record<string, { label: string; labelGe: string; bg: string; text: string; border: string }> = {
  easy:   { label: 'EASY',   labelGe: 'მარტივი', bg: 'rgba(52,211,153,0.08)',  text: '#34D399',  border: 'rgba(52,211,153,0.25)'  },
  medium: { label: 'MEDIUM', labelGe: 'საშუალო', bg: 'rgba(255,209,102,0.08)', text: '#FFD166',  border: 'rgba(255,209,102,0.25)' },
  hard:   { label: 'HARD',   labelGe: 'რთული',   bg: 'rgba(248,113,113,0.08)', text: '#F87171',  border: 'rgba(248,113,113,0.25)' },
  expert: { label: 'EXPERT', labelGe: 'ექსპერტი',bg: 'rgba(192,132,252,0.08)', text: '#C084FC',  border: 'rgba(192,132,252,0.25)' },
}

const EMOJI_ICON: Record<string, React.ElementType> = {
  '🌕': Moon, '🌙': Moon,
  '⭐': Star,
  '🪐': Globe,
  '🔴': Circle,
  '⚫': Circle,
  '🔵': Circle,
  '💫': Sparkles,
  '✨': Star,
  '🌌': Aperture,
  '🐝': Hexagon,
  '🔮': Gem,
  '🔭': Telescope,
  '🦀': Zap,
  '🌀': RefreshCw,
}

function MissionIcon({ emoji }: { emoji: string }) {
  const Icon = EMOJI_ICON[emoji] ?? Star
  return (
    <div className="w-10 h-10 rounded-xl flex items-center justify-center mb-4 flex-shrink-0" style={{ background: 'rgba(99,102,241,0.08)', border: '1px solid rgba(99,102,241,0.15)' }}>
      <Icon size={18} className="text-[#818CF8]" />
    </div>
  )
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
        </div>

        {/* Featured banner */}
        {!loading && featured && (
          <div
            className="relative overflow-hidden rounded-xl border mb-4 sm:mb-5 p-5 sm:p-8"
            style={{ background: 'linear-gradient(135deg, #0D1117 60%, rgba(99,102,241,0.08))', borderColor: 'rgba(99,102,241,0.2)' }}
          >
            <div className="absolute top-0 right-0 w-48 h-48 bg-[#6366F1]/10 rounded-full blur-3xl pointer-events-none -translate-y-1/2 translate-x-1/4" />
            <div className="relative">
              <div className="flex items-center gap-2 mb-3">
                <span className="w-1.5 h-1.5 rounded-full bg-[#6366F1] animate-pulse" />
                <span className="text-[10px] font-bold tracking-[0.15em] text-[#6366F1] uppercase">
                  {lang === 'ka' ? 'კვირის მისია' : 'Mission of the Week'}
                </span>
              </div>
              <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
                <div>
                  <h2 className="text-lg sm:text-2xl font-bold text-white mb-2">
                    {lang === 'ka' ? featured.titleGe : featured.title}
                  </h2>
                  <p className="text-sm text-[#64748B] max-w-xl leading-relaxed">
                    {lang === 'ka' ? featured.descriptionGe : featured.description}
                  </p>
                </div>
                <div className="flex items-center gap-4 flex-shrink-0">
                  <div className="text-right">
                    <div className="text-[10px] text-[#64748B] uppercase tracking-wider">{lang === 'ka' ? 'ჯილდო' : 'Reward'}</div>
                    <div className="text-xl font-bold text-white">+{featured.points} XP</div>
                  </div>
                  <button
                    onClick={() => !completedIds.has(featured.id) && !pendingIds.has(featured.id) && setActiveMission(featured)}
                    disabled={completedIds.has(featured.id) || pendingIds.has(featured.id)}
                    className="flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-bold transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                    style={{ background: '#6366F1', color: 'white', boxShadow: '0 0 20px rgba(99,102,241,0.3)' }}
                  >
                    {completedIds.has(featured.id)
                      ? (lang === 'ka' ? 'შესრულდა' : 'Done')
                      : pendingIds.has(featured.id)
                      ? (lang === 'ka' ? 'განხილვაში' : 'In Review')
                      : (lang === 'ka' ? 'მისიის დაწყება' : 'Begin')}
                    <ArrowRight size={14} />
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Filters + search */}
        <div className="flex flex-col sm:flex-row gap-3 mb-4 sm:mb-5">
          <div className="flex items-center gap-1 p-1 bg-white/[0.03] border border-white/[0.06] rounded-lg">
            {filterTabs.map(tab => (
              <button
                key={tab.key}
                onClick={() => setFilter(tab.key)}
                className={`px-3 sm:px-4 py-1.5 rounded text-[11px] font-bold tracking-wider transition-all ${
                  filter === tab.key
                    ? 'bg-[#6366F1] text-white'
                    : 'text-[#64748B] hover:text-white'
                }`}
              >
                {lang === 'ka' ? tab.labelGe : tab.label}
              </button>
            ))}
          </div>
          <div className="relative flex-1 sm:max-w-72">
            <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#475569]" />
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder={lang === 'ka' ? 'მოძებნე...' : 'Search missions...'}
              className="w-full bg-white/[0.03] border border-white/[0.06] rounded-lg py-2 pl-8 pr-4 text-sm text-white placeholder:text-[#475569] focus:outline-none focus:border-[#6366F1]/50 focus:bg-white/[0.05] transition-all"
            />
          </div>
        </div>

        {/* Mission grid */}
        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="card h-44 animate-pulse" />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {filtered.map(mission => {
              const done    = completedIds.has(mission.id)
              const pending = pendingIds.has(mission.id)
              const style   = DIFF_STYLE[mission.difficulty]

              return (
                <div
                  key={mission.id}
                  className="card p-5 flex flex-col relative overflow-hidden transition-all hover:border-white/10"
                  style={{ opacity: done ? 0.5 : 1 }}
                >
                  {/* Status icon */}
                  {(done || pending) && (
                    <div className="absolute top-4 right-4">
                      {done
                        ? <CheckCircle2 size={16} className="text-[#34D399]" />
                        : <Clock size={16} className="text-[#FFD166]" />
                      }
                    </div>
                  )}

                  {/* Icon */}
                  <MissionIcon emoji={mission.objectEmoji} />

                  {/* Badge + time */}
                  <div className="flex items-center gap-2 mb-2">
                    <span
                      className="text-[9px] font-bold tracking-wider px-2 py-0.5 rounded-full uppercase"
                      style={{ background: style?.bg, color: style?.text, border: `1px solid ${style?.border}` }}
                    >
                      {lang === 'ka' ? style?.labelGe : style?.label}
                    </span>
                    <span className="text-[10px] text-[#475569]">{mission.bestTime}</span>
                  </div>

                  {/* Title + desc */}
                  <h3 className="text-sm font-bold text-white mb-1.5">
                    {lang === 'ka' ? mission.titleGe?.replace(/^[^ ]+ /, '') ?? mission.objectName : mission.objectName}
                  </h3>
                  <p className="text-xs text-[#64748B] leading-relaxed line-clamp-2 flex-1">
                    {lang === 'ka' ? mission.descriptionGe : mission.description}
                  </p>

                  {/* Footer */}
                  <div className="flex items-center justify-between mt-4 pt-3 border-t border-white/[0.06]">
                    <div>
                      <div className="text-[10px] text-[#475569] uppercase tracking-wider">{lang === 'ka' ? 'ჯილდო' : 'Reward'}</div>
                      <div className="text-sm font-bold text-white">+{mission.points} XP</div>
                    </div>
                    {done ? (
                      <span className="text-[11px] font-bold text-[#475569]">{lang === 'ka' ? 'შესრულდა' : 'Completed'}</span>
                    ) : pending ? (
                      <span className="text-[11px] font-bold text-[#FFD166]">{lang === 'ka' ? 'განხილვაში' : 'In Review'}</span>
                    ) : (
                      <button
                        onClick={() => setActiveMission(mission)}
                        className="text-[11px] font-bold px-4 py-1.5 rounded transition-all"
                        style={{ background: 'rgba(99,102,241,0.15)', color: '#818CF8', border: '1px solid rgba(99,102,241,0.3)' }}
                        onMouseOver={e => { (e.currentTarget as HTMLButtonElement).style.background = '#6366F1'; (e.currentTarget as HTMLButtonElement).style.color = 'white' }}
                        onMouseOut={e => { (e.currentTarget as HTMLButtonElement).style.background = 'rgba(99,102,241,0.15)'; (e.currentTarget as HTMLButtonElement).style.color = '#818CF8' }}
                      >
                        {lang === 'ka' ? 'დაწყება' : 'Begin'}
                      </button>
                    )}
                  </div>
                </div>
              )
            })}

            {/* Suggest card */}
            <div className="card p-5 flex flex-col items-center justify-center text-center group cursor-pointer hover:border-white/10 transition-all min-h-44">
              <div className="w-10 h-10 rounded-full bg-white/[0.04] border border-white/[0.06] flex items-center justify-center mb-3 group-hover:border-[#6366F1]/40 transition-all">
                <Plus size={18} className="text-[#475569] group-hover:text-[#6366F1] transition-colors" />
              </div>
              <h3 className="text-sm font-bold text-[#475569] group-hover:text-white transition-colors">
                {lang === 'ka' ? 'მისია შემოგვთავაზე' : 'Suggest a Mission'}
              </h3>
              <p className="text-[11px] text-[#334155] mt-1">{lang === 'ka' ? 'შენი იდეა' : 'Share your idea'}</p>
            </div>
          </div>
        )}
      </div>
    </>
  )
}
