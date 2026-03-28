'use client'
import { useState, useEffect } from 'react'
import Link from 'next/link'
import { ChevronLeft, LayoutDashboard, Clock, CheckCircle2 } from 'lucide-react'
import { DIFFICULTY_CONFIG } from '@/lib/missions'
import ObservationModal from '@/components/observations/ObservationModal'
import { useLanguage } from '@/contexts/LanguageContext'
import { useRouter } from 'next/navigation'
import { getPointsToNextLevel } from '@/lib/constants'
import type { Mission, MissionProgress } from '@/lib/types'

const DIFF_MAP: Record<string, keyof typeof DIFFICULTY_CONFIG> = {
  easy: 'Beginner', medium: 'Intermediate', hard: 'Hard', expert: 'Expert',
}

const DIFF_DOTS: Record<string, number> = { easy: 2, medium: 3, hard: 4, expert: 5 }

const DIFF_COLOR: Record<string, string> = {
  easy: '#34D399', medium: '#FFD166', hard: '#F87171', expert: '#C084FC',
}

const DIFF_LABEL_KA: Record<string, string> = {
  easy: 'მარტივი', medium: 'საშუალო', hard: 'რთული', expert: 'ექსპერტი',
}

const DIFF_LABEL_EN: Record<string, string> = {
  easy: 'EASY', medium: 'MEDIUM', hard: 'HARD', expert: 'EXPERT',
}

// Map object_name → visual sphere id
const VISUAL_ID: Record<string, string> = {
  'Moon': 'moon', 'Jupiter': 'jupiter', 'Venus': 'venus', 'Mars': 'mars',
  'Saturn': 'saturn', 'Mercury': 'mercury', 'Uranus': 'uranus', 'Neptune': 'neptune',
  'Orion Nebula': 'orion_nebula', 'Andromeda': 'andromeda', 'Pleiades': 'pleiades',
  'Milky Way': 'andromeda',
}

const EMOJI: Record<string, string> = {
  'Moon': '🌕', 'Jupiter': '🪐', 'Venus': '⭐', 'Mars': '🔴', 'Saturn': '🪐',
  'Orion Nebula': '✨', 'Orion': '✨', 'ISS': '🛸', 'Milky Way': '🌌',
  'Meteor': '☄️', 'Sunset': '🌅',
}

const TELESCOPE_OBJECTS = new Set(['Saturn', 'Orion Nebula', 'Milky Way', 'Andromeda'])

function getVisualId(objectName: string | null): string {
  return VISUAL_ID[objectName ?? ''] ?? 'star'
}

function getEmoji(objectName: string | null): string {
  return EMOJI[objectName ?? ''] ?? '⭐'
}

const MOCK_PROFILE = { level: 3, points: 720, missions_completed: 5 }

function PlanetVisual({ id, emoji }: { id: string; emoji: string }) {
  const SPHERES: Record<string, { bg: string; glow: string }> = {
    moon:     { bg: 'radial-gradient(circle at 38% 32%, #e2e8f0, #94a3b8 55%, #475569)', glow: 'rgba(148,163,184,0.25)' },
    jupiter:  { bg: 'radial-gradient(circle at 38% 32%, #fed7aa, #f97316 55%, #92400e)', glow: 'rgba(249,115,22,0.30)' },
    mars:     { bg: 'radial-gradient(circle at 38% 32%, #fca5a5, #ef4444 55%, #7f1d1d)', glow: 'rgba(239,68,68,0.28)' },
    venus:    { bg: 'radial-gradient(circle at 38% 32%, #fef9c3, #fbbf24 55%, #d97706)', glow: 'rgba(251,191,36,0.28)' },
    mercury:  { bg: 'radial-gradient(circle at 38% 32%, #d1d5db, #9ca3af 55%, #4b5563)', glow: 'rgba(156,163,175,0.20)' },
    neptune:  { bg: 'radial-gradient(circle at 38% 32%, #bfdbfe, #3b82f6 55%, #1e3a8a)', glow: 'rgba(59,130,246,0.28)' },
    uranus:   { bg: 'radial-gradient(circle at 38% 32%, #a5f3fc, #06b6d4 55%, #0e7490)', glow: 'rgba(6,182,212,0.28)' },
    saturn:   { bg: 'radial-gradient(circle at 38% 32%, #e2e8f0, #b0bec5 55%, #607d8b)', glow: 'rgba(176,190,197,0.20)' },
  }

  if (id === 'saturn') {
    return (
      <div className="relative flex items-center justify-center" style={{ width: 88, height: 88 }}>
        <div className="absolute" style={{ width: 108, height: 26, borderRadius: '50%', border: '2px solid rgba(176,190,197,0.35)', transform: 'rotateX(72deg)', top: '50%', marginTop: -13 }} />
        <div className="rounded-full relative z-10" style={{ width: 64, height: 64, background: SPHERES.saturn.bg, boxShadow: `0 0 24px ${SPHERES.saturn.glow}` }} />
      </div>
    )
  }

  if (SPHERES[id]) {
    return (
      <div className="rounded-full" style={{
        width: 80, height: 80,
        background: SPHERES[id].bg,
        boxShadow: `0 0 28px ${SPHERES[id].glow}, inset -8px -8px 20px rgba(0,0,0,0.4)`,
      }} />
    )
  }

  const GLOW: Record<string, string> = {
    orion_nebula: 'rgba(168,85,247,0.35)', andromeda: 'rgba(245,158,11,0.35)',
    pleiades: 'rgba(99,102,241,0.30)', double_cluster: 'rgba(99,102,241,0.25)',
    hercules: 'rgba(99,102,241,0.25)', ring_nebula: 'rgba(56,189,248,0.30)',
    dumbbell: 'rgba(34,197,94,0.25)', crab_nebula: 'rgba(239,68,68,0.30)',
    whirlpool: 'rgba(168,85,247,0.30)', beehive: 'rgba(251,191,36,0.25)',
  }
  return (
    <div className="rounded-full flex items-center justify-center text-4xl"
      style={{
        width: 80, height: 80,
        background: 'rgba(99,102,241,0.08)',
        boxShadow: `0 0 28px ${GLOW[id] ?? 'rgba(99,102,241,0.25)'}`,
        border: '1px solid rgba(255,255,255,0.06)',
      }}>
      {emoji}
    </div>
  )
}

function DifficultyDots({ difficulty }: { difficulty: string }) {
  const filled = DIFF_DOTS[difficulty] ?? 2
  const color = DIFF_COLOR[difficulty] ?? '#34D399'
  return (
    <div className="flex items-center gap-1 justify-center my-1.5">
      {[1, 2, 3, 4, 5].map(i => (
        <span key={i} className="rounded-full"
          style={{ width: 5, height: 5, background: i <= filled ? color : 'rgba(255,255,255,0.12)' }} />
      ))}
    </div>
  )
}

export default function MissionsPage() {
  const { lang } = useLanguage()
  const router = useRouter()
  const [missions, setMissions] = useState<Mission[]>([])
  const [loading, setLoading] = useState(true)
  const [activeMission, setActiveMission] = useState<Mission | null>(null)
  const [progress, setProgress] = useState<MissionProgress[]>([])
  const [pendingIds, setPendingIds] = useState<Set<string>>(new Set())

  const levelProgress = getPointsToNextLevel(MOCK_PROFILE.points)

  useEffect(() => {
    try {
      const saved = localStorage.getItem('sky_pending_missions')
      if (saved) setPendingIds(new Set(JSON.parse(saved)))
    } catch {}
  }, [])

  useEffect(() => {
    fetch('/api/missions')
      .then(r => r.json())
      .then(data => { if (Array.isArray(data)) setMissions(data); setLoading(false) })
      .catch(() => setLoading(false))

    fetch('/api/missions/progress')
      .then(r => r.ok ? r.json() : [])
      .then(data => { if (Array.isArray(data)) setProgress(data) })
      .catch(() => {})
  }, [])

  function handleSuccess(missionId: string) {
    setPendingIds(prev => {
      const next = new Set(prev).add(missionId)
      localStorage.setItem('sky_pending_missions', JSON.stringify([...next]))
      return next
    })
    setActiveMission(null)
  }

  const completedIds = new Set(
    progress.filter(p => p.status === 'completed').map(p => p.mission_id)
  )

  const completedCount = completedIds.size + pendingIds.size
  const regular = missions.filter(m => !m.is_daily)
  const daily   = missions.filter(m => m.is_daily)
  const totalCount = regular.length || 5
  const toNextRank = Math.max(0, 5 - completedCount)
  const progressPct = Math.min(100, (completedCount / 5) * 100)
  const nakedEyeCount = regular.filter(m => !TELESCOPE_OBJECTS.has(m.object_name ?? '')).length
  const telescopeCount = regular.filter(m => TELESCOPE_OBJECTS.has(m.object_name ?? '')).length

  const isDay = (() => {
    const h = new Date().getHours(); return h >= 7 && h < 20
  })()

  function MissionCard({ mission }: { mission: Mission }) {
    const done    = completedIds.has(mission.id)
    const pending = pendingIds.has(mission.id)
    const visualId  = getVisualId(mission.object_name)
    const emoji     = getEmoji(mission.object_name)
    const diffColor = DIFF_COLOR[mission.difficulty] ?? '#34D399'

    return (
      <div
        className="rounded-2xl flex flex-col items-center p-4 sm:p-5 transition-all relative overflow-hidden"
        style={{
          background: done ? 'rgba(255,255,255,0.02)' : 'rgba(10,14,26,0.95)',
          border: `1px solid ${pending ? 'rgba(245,158,11,0.25)' : done ? 'rgba(255,255,255,0.05)' : 'rgba(255,255,255,0.08)'}`,
          opacity: done ? 0.6 : 1,
        }}
      >
        <div className="absolute top-3 right-3">
          {done && <CheckCircle2 size={14} className="text-[#34D399]" />}
          {pending && <Clock size={14} className="text-[#F59E0B]" />}
        </div>

        <div className="mb-4 mt-2 flex items-center justify-center" style={{ height: 88 }}>
          <PlanetVisual id={visualId} emoji={emoji} />
        </div>

        <h3 className="text-sm sm:text-base font-bold text-white text-center leading-snug mb-1 line-clamp-2">
          {mission.title}
        </h3>

        <DifficultyDots difficulty={mission.difficulty} />

        <span className="text-[9px] font-bold tracking-[0.15em] uppercase mb-2" style={{ color: diffColor }}>
          {lang === 'ka' ? DIFF_LABEL_KA[mission.difficulty] : DIFF_LABEL_EN[mission.difficulty]}
        </span>

        {mission.description && (
          <p className="text-[10px] text-[#475569] text-center leading-relaxed mb-2 line-clamp-2 px-1">
            {mission.description}
          </p>
        )}

        <div className="text-base font-bold mb-4" style={{ color: '#F59E0B' }}>
          +{mission.reward_points} <span className="text-sm">✦</span>
        </div>

        {done ? (
          <span className="text-xs font-bold text-[#475569] pb-1">
            {lang === 'ka' ? 'შესრულდა' : 'Complete'}
          </span>
        ) : pending ? (
          <span className="text-xs font-bold pb-1" style={{ color: '#F59E0B' }}>
            {lang === 'ka' ? 'განხილვაში' : 'Pending'}
          </span>
        ) : (
          <button
            onClick={() => setActiveMission(mission)}
            className="w-full py-2.5 rounded-xl text-sm font-bold tracking-wide transition-all hover:brightness-110 active:scale-95"
            style={{ background: 'linear-gradient(135deg, #F59E0B, #FFD166)', color: '#0A0A0A' }}
          >
            {lang === 'ka' ? 'დაწყება →' : 'Begin →'}
          </button>
        )}
      </div>
    )
  }

  return (
    <>
      {activeMission && (
        <ObservationModal
          mission={{
            id: activeMission.id,
            name: activeMission.title,
            emoji: getEmoji(activeMission.object_name),
            difficulty: DIFF_MAP[activeMission.difficulty] ?? 'Beginner',
            points: activeMission.reward_points,
            type: TELESCOPE_OBJECTS.has(activeMission.object_name ?? '') ? 'telescope' : 'naked_eye',
            desc: activeMission.description ?? '',
            hint: '',
          }}
          onClose={() => setActiveMission(null)}
          onSuccess={() => handleSuccess(activeMission.id)}
        />
      )}

      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-5 animate-page-enter">

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
            {lang === 'ka' ? 'მისიები' : 'Missions'}
          </h1>
          <Link
            href="/dashboard"
            className="absolute right-0 w-9 h-9 rounded-full flex items-center justify-center transition-all hover:bg-white/[0.08]"
            style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}
          >
            <LayoutDashboard size={15} className="text-[#94A3B8]" />
          </Link>
        </div>

        {/* Sky status + counts */}
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: isDay ? '#FFD166' : '#34D399' }} />
            <span className="text-xs text-[#64748B]">
              {isDay
                ? (lang === 'ka' ? 'დღეა — მისიები ღამეს' : 'Daytime — missions available tonight')
                : (lang === 'ka' ? 'ღამის ცა ხელმისაწვდომია' : 'Night sky available now')}
            </span>
          </div>
          {!loading && (
            <div className="flex items-center gap-3 text-[10px] text-[#475569]">
              <span>👁 {nakedEyeCount}</span>
              <span>🔭 {telescopeCount}</span>
            </div>
          )}
        </div>

        {/* Observer rank card */}
        <div className="rounded-2xl p-5 mb-6"
          style={{ background: 'rgba(245,158,11,0.04)', border: '1px solid rgba(245,158,11,0.20)' }}>
          <div className="flex items-center justify-between mb-4">
            <span className="text-[10px] font-bold tracking-[0.15em] text-[#64748B] uppercase">
              {lang === 'ka' ? 'ობზერვატორის რანგი' : 'Observer Rank'}
            </span>
            <span className="text-xs font-bold px-3 py-1 rounded-full"
              style={{ background: 'rgba(245,158,11,0.12)', color: '#F59E0B', border: '1px solid rgba(245,158,11,0.30)' }}>
              {lang === 'ka' ? 'ობზერვატორი' : 'Observer'}
            </span>
          </div>

          <div className="grid grid-cols-3 gap-4 mb-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-white">{completedCount}/{totalCount}</div>
              <div className="text-[9px] font-bold tracking-widest text-[#64748B] uppercase mt-0.5">
                {lang === 'ka' ? 'დაკვირვება' : 'Observations'}
              </div>
            </div>
            <div className="text-center border-x border-white/[0.06]">
              <div className="text-2xl font-bold text-white">
                {MOCK_PROFILE.points} <span className="text-[#F59E0B] text-base">✦</span>
              </div>
              <div className="text-[9px] font-bold tracking-widest text-[#64748B] uppercase mt-0.5">
                {lang === 'ka' ? 'ვარსკვლავი' : 'Stars'}
              </div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-white">{toNextRank}</div>
              <div className="text-[9px] font-bold tracking-widest text-[#64748B] uppercase mt-0.5">
                {lang === 'ka' ? 'შემდეგ რანგამდე' : 'Next Rank'}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-1.5 mb-2">
            {[1, 2, 3, 4, 5].map(i => (
              <div key={i} className="w-3 h-3 rounded-full transition-all"
                style={{ background: i <= completedCount ? '#F59E0B' : 'rgba(255,255,255,0.08)' }} />
            ))}
            <span className="text-[10px] text-[#64748B] ml-auto">
              {toNextRank} {lang === 'ka' ? 'დარჩა' : 'remaining'}
            </span>
          </div>
          <div className="h-1.5 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.06)' }}>
            <div className="h-full rounded-full transition-all duration-700"
              style={{ width: `${progressPct}%`, background: 'linear-gradient(90deg, #F59E0B, #FFD166)' }} />
          </div>
        </div>

        {/* Mission grid */}
        {loading ? (
          <div className="grid grid-cols-2 gap-3">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="rounded-2xl h-64 animate-pulse" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }} />
            ))}
          </div>
        ) : (
          <>
            <div className="grid grid-cols-2 gap-3 mb-8">
              {regular.map(mission => <MissionCard key={mission.id} mission={mission} />)}
            </div>

            {daily.length > 0 && (
              <>
                <div className="flex items-center gap-3 mb-4">
                  <div className="h-px flex-1" style={{ background: 'rgba(255,255,255,0.06)' }} />
                  <span className="text-[10px] font-bold tracking-[0.18em] text-[#64748B] uppercase">
                    {lang === 'ka' ? 'ყოველდღიური გამოწვევა' : 'Daily Challenges'}
                  </span>
                  <div className="h-px flex-1" style={{ background: 'rgba(255,255,255,0.06)' }} />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  {daily.map(mission => <MissionCard key={mission.id} mission={mission} />)}
                </div>
              </>
            )}
          </>
        )}
      </div>
    </>
  )
}
