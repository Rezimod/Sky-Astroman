'use client'
import { useState, useEffect } from 'react'
import { CheckCircle2, Clock, Search, Sparkles, Plus } from 'lucide-react'
import { DIFFICULTY_CONFIG } from '@/lib/missions'
import ObservationModal from '@/components/observations/ObservationModal'
import { useLanguage } from '@/contexts/LanguageContext'
import type { GeneratedMission } from '@/lib/types'

const DIFF_MAP: Record<string, keyof typeof DIFFICULTY_CONFIG> = {
  easy: 'Beginner',
  medium: 'Intermediate',
  hard: 'Hard',
  expert: 'Expert',
}

const DIFF_BADGE: Record<string, { label: string; labelGe: string; classes: string }> = {
  easy:   { label: 'Easy',   labelGe: 'მარტივი', classes: 'bg-green-500/10 text-green-400 border-green-500/20' },
  medium: { label: 'Medium', labelGe: 'საშუალო', classes: 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20' },
  hard:   { label: 'Hard',   labelGe: 'რთული',   classes: 'bg-red-500/10 text-red-400 border-red-500/20' },
  expert: { label: 'Expert', labelGe: 'ექსპერტი', classes: 'bg-purple-500/10 text-purple-400 border-purple-500/20' },
}

type FilterKey = 'all' | 'easy' | 'medium' | 'hard'

export default function MissionsPage() {
  const { t, lang } = useLanguage()
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
    { key: 'all',    label: 'All',    labelGe: 'ყველა'   },
    { key: 'easy',   label: 'Easy',   labelGe: 'მარტივი' },
    { key: 'medium', label: 'Medium', labelGe: 'საშუალო' },
    { key: 'hard',   label: 'Hard',   labelGe: 'რთული'   },
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

      <div className="w-full animate-page-enter">

        {/* Hero banner — featured mission */}
        {!loading && featured && (
          <section className="max-w-7xl mx-auto px-6 pt-10">
            <div className="relative overflow-hidden rounded-[2.5rem] border border-white/10 bg-space-800">
              <div className="absolute inset-0 bg-gradient-to-r from-space-900 via-space-900/60 to-transparent z-10" />
              <div
                className="absolute inset-0 opacity-20"
                style={{ background: 'radial-gradient(ellipse at 70% 50%, rgba(99,102,241,0.4), transparent 70%)' }}
              />
              <div className="relative z-20 p-10 lg:p-16 max-w-2xl">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-space-glow/20 border border-space-glow/30 text-[10px] font-bold text-white uppercase tracking-wider mb-6">
                  <Sparkles size={12} className="animate-pulse" />
                  {lang === 'ka' ? 'კვირის მისია' : 'Mission of the week'}
                </div>
                <h1 className="text-4xl md:text-5xl font-extrabold text-white mb-4 leading-tight">
                  {lang === 'ka' ? featured.titleGe : featured.title}
                </h1>
                <p className="text-slate-300 text-lg mb-8 leading-relaxed">
                  {lang === 'ka' ? featured.descriptionGe : featured.description}
                </p>
                <div className="flex items-center gap-8">
                  <button
                    onClick={() => !completedIds.has(featured.id) && !pendingIds.has(featured.id) && setActiveMission(featured)}
                    className="bg-white text-space-900 font-bold px-8 py-3.5 rounded-full hover:bg-slate-100 transition-all flex items-center gap-2 disabled:opacity-50"
                    disabled={completedIds.has(featured.id) || pendingIds.has(featured.id)}
                  >
                    {completedIds.has(featured.id)
                      ? (lang === 'ka' ? 'შესრულებულია' : 'Completed')
                      : pendingIds.has(featured.id)
                      ? (lang === 'ka' ? 'მიმოხილვაშია' : 'Under review')
                      : (lang === 'ka' ? 'დაიწყე მისია' : 'Start mission')}
                    <span>›</span>
                  </button>
                  <div className="flex items-center gap-4 text-white">
                    <div className="flex flex-col">
                      <span className="text-[10px] uppercase text-slate-400 font-bold tracking-widest">{lang === 'ka' ? 'ჯილდო' : 'Reward'}</span>
                      <span className="font-bold text-xl">+{featured.points} XP</span>
                    </div>
                    <div className="w-px h-8 bg-white/20" />
                    <div className="flex flex-col">
                      <span className="text-[10px] uppercase text-slate-400 font-bold tracking-widest">{lang === 'ka' ? 'სირთულე' : 'Difficulty'}</span>
                      <span className={`font-bold text-xl ${DIFF_BADGE[featured.difficulty]?.classes.split(' ')[1] ?? 'text-white'}`}>
                        {lang === 'ka' ? DIFF_BADGE[featured.difficulty]?.labelGe : DIFF_BADGE[featured.difficulty]?.label}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </section>
        )}

        {/* Filter + grid */}
        <section className="max-w-7xl mx-auto px-6 py-12">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-10">
            <div className="flex items-center p-1 bg-white/5 border border-white/10 rounded-2xl w-fit">
              {filterTabs.map(tab => (
                <button
                  key={tab.key}
                  onClick={() => setFilter(tab.key)}
                  className={`px-5 py-2.5 rounded-xl text-sm font-bold transition-all ${
                    filter === tab.key
                      ? 'bg-space-accent text-white shadow-lg'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  {lang === 'ka' ? tab.labelGe : tab.label}
                </button>
              ))}
            </div>
            <div className="relative group">
              <Search size={14} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder={lang === 'ka' ? 'მოძებნე მისია...' : 'Search missions...'}
                className="bg-white/5 border border-white/10 rounded-2xl py-3.5 pl-10 pr-6 text-sm text-white w-full md:w-72 focus:outline-none focus:ring-2 focus:ring-space-accent/50 focus:bg-white/10 transition-all placeholder:text-slate-600"
              />
            </div>
          </div>

          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[...Array(6)].map((_, i) => (
                <div key={i} className="bg-white/5 border border-white/10 rounded-[2rem] h-52 animate-pulse" />
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filtered.map(mission => {
                const done = completedIds.has(mission.id)
                const pending = pendingIds.has(mission.id)
                const badge = DIFF_BADGE[mission.difficulty]

                return (
                  <div
                    key={mission.id}
                    className="bg-white/5 border border-white/10 rounded-[2rem] p-6 hover:bg-white/10 transition-all group relative overflow-hidden"
                    style={{ opacity: done ? 0.5 : 1 }}
                  >
                    {done && (
                      <div className="absolute top-0 right-0 p-6">
                        <div className="w-10 h-10 rounded-full bg-green-500/20 flex items-center justify-center text-green-400 border border-green-500/20">
                          <CheckCircle2 size={18} />
                        </div>
                      </div>
                    )}
                    {pending && !done && (
                      <div className="absolute top-0 right-0 p-6">
                        <div className="w-10 h-10 rounded-full bg-yellow-500/20 flex items-center justify-center text-yellow-400 border border-yellow-500/20">
                          <Clock size={18} />
                        </div>
                      </div>
                    )}

                    <div className="w-14 h-14 rounded-2xl bg-space-800 border border-white/10 flex items-center justify-center text-3xl mb-6 group-hover:scale-110 transition-transform">
                      {mission.objectEmoji}
                    </div>

                    <div className="space-y-2 mb-6">
                      <div className="flex items-center gap-2">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase border ${badge?.classes}`}>
                          {lang === 'ka' ? badge?.labelGe : badge?.label}
                        </span>
                        <span className="text-xs text-slate-400">{mission.bestTime}</span>
                      </div>
                      <h3 className="text-xl font-bold text-white">
                        {lang === 'ka' ? mission.titleGe.replace(/^[^ ]+ /, '') : mission.objectName}
                      </h3>
                      <p className="text-sm text-slate-400 leading-relaxed line-clamp-2">
                        {lang === 'ka' ? mission.descriptionGe : mission.description}
                      </p>
                    </div>

                    <div className="flex items-center justify-between pt-6 border-t border-white/5">
                      <div className="flex flex-col">
                        <span className="text-[10px] text-slate-500 font-bold uppercase">{lang === 'ka' ? 'ჯილდო' : 'Reward'}</span>
                        <span className="font-bold text-white">+{mission.points} XP</span>
                      </div>
                      {done ? (
                        <div className="bg-white/10 text-white px-5 py-2 rounded-xl text-sm font-bold opacity-50 cursor-not-allowed">
                          {lang === 'ka' ? 'შესრულებულია' : 'Completed'}
                        </div>
                      ) : pending ? (
                        <div className="bg-yellow-500/10 text-yellow-400 border border-yellow-500/20 px-5 py-2 rounded-xl text-sm font-bold">
                          {t('missions.pendingReview')}
                        </div>
                      ) : (
                        <button
                          onClick={() => setActiveMission(mission)}
                          className="bg-space-accent hover:bg-indigo-500 text-white px-5 py-2 rounded-xl text-sm font-bold transition-colors shadow-lg shadow-space-accent/20"
                        >
                          {t('missions.begin')}
                        </button>
                      )}
                    </div>
                  </div>
                )
              })}

              {/* Suggest mission placeholder */}
              <div className="bg-white/5 border border-white/10 border-dashed rounded-[2rem] p-6 flex flex-col items-center justify-center text-center group cursor-pointer hover:bg-white/5 transition-all">
                <div className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform text-slate-400">
                  <Plus size={28} />
                </div>
                <h3 className="text-lg font-bold text-slate-400 group-hover:text-white transition-colors">
                  {lang === 'ka' ? 'შემოგვთავაზე მისია' : 'Suggest a mission'}
                </h3>
                <p className="text-xs text-slate-500 mt-2">{lang === 'ka' ? 'გაქვს საინტერესო იდეა?' : 'Have an interesting idea?'}</p>
              </div>
            </div>
          )}
        </section>
      </div>
    </>
  )
}
