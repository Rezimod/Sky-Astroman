'use client'
import { useEffect, useState, useRef } from 'react'
import Link from 'next/link'
import { ArrowRight, Telescope, User } from 'lucide-react'
import { useLanguage } from '@/contexts/LanguageContext'
import { getPointsToNextLevel } from '@/lib/constants'
import type { SkyConditions, GeneratedMission } from '@/lib/types'

const OPEN_METEO = 'https://api.open-meteo.com/v1/forecast?latitude=41.7151&longitude=44.8271&hourly=cloud_cover,visibility,temperature_2m&daily=sunrise,sunset&current=cloud_cover,temperature_2m&timezone=Asia%2FTbilisi&forecast_days=1'

const mockProfile = {
  initials: 'SG',
  display_name: 'Stargazer',
  title_en: 'NOVICE STARGAZER',
  title_ka: 'დამწყები ვარსკვლავთმეტყველი',
  level: 3,
  points: 720,
  observations_count: 12,
  missions_completed: 5,
}

const mockLeaderboard = [
  { rank: 1,  initials: 'გ.მ', name: 'გიორგი მ.',   points: 8450 },
  { rank: 2,  initials: 'ნ.დ', name: 'ნინო დ.',     points: 7200 },
  { rank: 3,  initials: 'ლ.ჭ', name: 'ლევანი ჭ.',   points: 6800 },
  { rank: 4,  initials: 'ა.გ', name: 'ანა გ.',       points: 5100 },
  { rank: 12, initials: 'SG',  name: 'Stargazer',    points: 720,  isMe: true },
]

const CATEGORY_COLORS: Record<string, { bg: string; text: string; border: string }> = {
  meteor:   { bg: 'rgba(56,240,255,0.08)',  text: '#38F0FF',  border: 'rgba(56,240,255,0.25)'  },
  planetary:{ bg: 'rgba(99,102,241,0.08)',  text: '#818CF8',  border: 'rgba(99,102,241,0.25)'  },
  galaxy:   { bg: 'rgba(168,85,247,0.08)', text: '#C084FC',  border: 'rgba(168,85,247,0.25)'  },
  easy:     { bg: 'rgba(52,211,153,0.08)', text: '#34D399',  border: 'rgba(52,211,153,0.25)'  },
  medium:   { bg: 'rgba(255,209,102,0.08)',text: '#FFD166',  border: 'rgba(255,209,102,0.25)' },
  hard:     { bg: 'rgba(248,113,113,0.08)',text: '#F87171',  border: 'rgba(248,113,113,0.25)' },
}

function getCategoryStyle(difficulty: string) {
  return CATEGORY_COLORS[difficulty] ?? CATEGORY_COLORS.planetary
}

function getCountdown(bestTime: string): string {
  const now = new Date()
  const rawStart = bestTime.split('–')[0].split('-')[0].trim()
  const parts = rawStart.split(':').map(Number)
  if (parts.length < 2 || isNaN(parts[0])) return '—'
  const target = new Date(now)
  target.setHours(parts[0], parts[1] ?? 0, 0, 0)
  if (target <= now) target.setDate(target.getDate() + 1)
  const diff = target.getTime() - now.getTime()
  const h = Math.floor(diff / 3600000)
  const m = Math.floor((diff % 3600000) / 60000)
  const s = Math.floor((diff % 60000) / 1000)
  return `${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`
}

function CircleProgress({ pct, color = '#38F0FF', size = 40 }: { pct: number; color?: string; size?: number }) {
  const r = (size / 2) - 4
  const circ = 2 * Math.PI * r
  const dash = (pct / 100) * circ
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="flex-shrink-0">
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="3" />
      <circle
        cx={size/2} cy={size/2} r={r} fill="none"
        stroke={color} strokeWidth="3" strokeLinecap="round"
        strokeDasharray={`${dash} ${circ}`}
        transform={`rotate(-90 ${size/2} ${size/2})`}
        style={{ transition: 'stroke-dasharray 1s ease' }}
      />
      <text x={size/2} y={size/2+4} textAnchor="middle" fill="white" fontSize={size * 0.28} fontWeight="700">
        {pct}
      </text>
    </svg>
  )
}

function SkyGauge({ score }: { score: number }) {
  const color = score >= 70 ? '#34D399' : score >= 40 ? '#FFD166' : '#F87171'
  const label_en = score >= 70 ? 'EXCELLENT' : score >= 40 ? 'FAIR' : 'POOR'
  const label_ka = score >= 70 ? 'იდეალური' : score >= 40 ? 'საშუალო' : 'ცუდი'
  const { lang } = useLanguage()
  const circ = 2 * Math.PI * 52
  const dash = (score / 100) * circ
  return (
    <div className="flex flex-col items-center">
      <div className="relative flex items-center justify-center" style={{ width: 140, height: 140 }}>
        <svg width="140" height="140" viewBox="0 0 140 140">
          <circle cx="70" cy="70" r="52" fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="7" />
          <circle
            cx="70" cy="70" r="52" fill="none"
            stroke={color} strokeWidth="7" strokeLinecap="round"
            strokeDasharray={`${dash} ${circ}`}
            transform="rotate(-90 70 70)"
            style={{ transition: 'stroke-dasharray 1.2s ease' }}
          />
        </svg>
        <div className="absolute text-center">
          <div className="text-4xl font-bold text-white leading-none">{score}</div>
          <div className="text-[10px] font-bold tracking-widest mt-1" style={{ color }}>
            {lang === 'ka' ? label_ka : label_en}
          </div>
        </div>
      </div>
    </div>
  )
}

function CountdownTick({ bestTime }: { bestTime: string }) {
  const [tick, setTick] = useState(getCountdown(bestTime))
  const ref = useRef<ReturnType<typeof setInterval> | null>(null)
  useEffect(() => {
    ref.current = setInterval(() => setTick(getCountdown(bestTime)), 1000)
    return () => { if (ref.current) clearInterval(ref.current) }
  }, [bestTime])
  return <>{tick}</>
}

export default function DashboardPage() {
  const { lang } = useLanguage()
  const [sky, setSky] = useState<SkyConditions | null>(null)
  const [missions, setMissions] = useState<GeneratedMission[]>([])
  const [skyLoading, setSkyLoading] = useState(true)
  const levelProgress = getPointsToNextLevel(mockProfile.points)
  const nextLevel = mockProfile.level + 1

  useEffect(() => {
    Promise.all([
      fetch('/api/sky/conditions').then(r => r.json()).catch(() => null),
      fetch(OPEN_METEO).then(r => r.json()).catch(() => null),
    ]).then(([skyData, meteo]) => {
      if (skyData && !skyData.error) {
        if (meteo && !meteo.error) {
          const hour = new Date().getHours()
          skyData.cloudCover  = meteo.current?.cloud_cover    ?? meteo.hourly?.cloud_cover?.[hour]    ?? skyData.cloudCover
          skyData.temperature = meteo.current?.temperature_2m ?? meteo.hourly?.temperature_2m?.[hour] ?? skyData.temperature
          const mp = meteo.daily?.moon_phase?.[0]
          if (mp !== undefined) {
            skyData.moonPhase        = mp
            skyData.moonIllumination = Math.sin(mp * Math.PI)
          }
        }
        setSky(skyData)
      }
      setSkyLoading(false)
    })

    fetch('/api/missions')
      .then(r => r.json())
      .then(data => { if (Array.isArray(data)) setMissions(data) })
      .catch(() => {})
  }, [])

  const skyScore = sky
    ? Math.max(0, Math.round(100 - (sky.cloudCover ?? 50) * 0.6 - (sky.moonIllumination ?? 0) * 15))
    : null

  const activeMissions = missions.slice(0, 3)
  const anomalyMission = missions.find(m => m.difficulty === 'hard') ?? missions[0] ?? null

  const needsXP = levelProgress.needed - levelProgress.current

  return (
    <div className="max-w-7xl mx-auto px-3 sm:px-4 lg:px-6 py-4 sm:py-6 animate-page-enter">

      {/* 3-column grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-3 sm:gap-4 items-start">

        {/* ── LEFT COLUMN ── */}
        <div className="lg:col-span-3 space-y-3">

          {/* Profile card */}
          <div className="card p-5">
            <div className="flex flex-col items-center text-center mb-5">
              {/* Avatar with ring */}
              <div className="relative mb-4" style={{ width: 80, height: 80 }}>
                <svg width="80" height="80" viewBox="0 0 80 80" className="absolute inset-0">
                  <circle cx="40" cy="40" r="36" fill="none" stroke="rgba(99,102,241,0.2)" strokeWidth="1.5" strokeDasharray="4 3" />
                </svg>
                <svg width="80" height="80" viewBox="0 0 80 80" className="absolute inset-0 orbit-ring">
                  <circle cx="40" cy="4" r="3.5" fill="#6366F1" />
                </svg>
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="w-14 h-14 rounded-full flex items-center justify-center" style={{ background: 'linear-gradient(135deg, rgba(99,102,241,0.25), rgba(168,85,247,0.15))', border: '1px solid rgba(99,102,241,0.3)' }}>
                    <Telescope size={22} className="text-[#818CF8]" />
                  </div>
                </div>
              </div>
              <h2 className="text-base font-bold text-white">{mockProfile.display_name}</h2>
              <p className="text-[10px] font-bold tracking-widest mt-0.5" style={{ color: '#6366F1' }}>
                LVL {mockProfile.level} · {lang === 'ka' ? mockProfile.title_ka : mockProfile.title_en}
              </p>
            </div>

            <div className="grid grid-cols-2 gap-2 mb-4">
              <div className="bg-white/[0.03] border border-white/[0.06] rounded-lg p-3 text-center">
                <div className="text-xs text-[#64748B] uppercase tracking-wider mb-1">{lang === 'ka' ? 'ქულა' : 'Total Pts'}</div>
                <div className="text-xl font-bold text-white">{mockProfile.points.toLocaleString()}</div>
              </div>
              <div className="bg-white/[0.03] border border-white/[0.06] rounded-lg p-3 text-center">
                <div className="text-xs text-[#64748B] uppercase tracking-wider mb-1">{lang === 'ka' ? 'დაკვირვ.' : 'Obs.'}</div>
                <div className="text-xl font-bold text-white">{mockProfile.observations_count}</div>
              </div>
            </div>

            <div>
              <div className="flex justify-between items-center mb-1.5">
                <span className="text-[10px] font-bold tracking-wider text-[#64748B] uppercase">
                  {lang === 'ka' ? 'პროგრესი' : 'Progress'}
                </span>
                <span className="text-[10px] text-[#64748B]">
                  {mockProfile.points} / {levelProgress.needed} XP
                </span>
              </div>
              <div className="progress-track">
                <div
                  className="progress-fill bg-[#6366F1]"
                  style={{ width: `${levelProgress.progress}%` }}
                />
              </div>
              <p className="text-[10px] text-[#475569] mt-1.5">
                {needsXP} XP {lang === 'ka' ? `დარჩა LVL ${nextLevel}-მდე` : `to Level ${nextLevel}`}
              </p>
            </div>
          </div>

        </div>

        {/* ── CENTER COLUMN ── */}
        <div className="lg:col-span-6 space-y-3">

          {/* Orbital progression */}
          <div className="card p-5">
            <div className="flex items-center justify-between mb-3">
              <span className="text-[10px] font-bold tracking-[0.15em] text-[#64748B] uppercase">
                {lang === 'ka' ? 'ორბიტალური პროგრესი' : 'Orbital Progression'}
              </span>
              <span className="text-[11px] font-bold text-white">
                {mockProfile.points.toLocaleString()} <span className="text-[#6366F1]">/</span>{' '}
                <span className="text-[#475569]">{levelProgress.needed.toLocaleString()} XP</span>
              </span>
            </div>
            <div className="progress-track" style={{ height: 4 }}>
              <div
                className="progress-fill"
                style={{
                  width: `${levelProgress.progress}%`,
                  background: 'linear-gradient(90deg, #6366F1, #38F0FF)',
                }}
              />
            </div>
          </div>

          {/* Active trajectories / missions */}
          <div className="card p-5">
            <div className="flex items-center justify-between mb-4">
              <span className="text-[10px] font-bold tracking-[0.15em] text-[#64748B] uppercase">
                {lang === 'ka' ? 'აქტიური ტრაექტორიები' : 'Active Trajectories'}
              </span>
              <Link
                href="/missions"
                className="text-[10px] font-bold text-[#6366F1] hover:text-[#818CF8] tracking-wide transition-colors"
              >
                {lang === 'ka' ? 'ყველა →' : 'All →'}
              </Link>
            </div>

            {activeMissions.length === 0 ? (
              <div className="space-y-2">
                {[1,2,3].map(i => (
                  <div key={i} className="h-[88px] rounded-lg bg-white/[0.02] animate-pulse" />
                ))}
              </div>
            ) : (
              <div className="space-y-2.5">
                {activeMissions.map((mission, i) => {
                  const catStyle = getCategoryStyle(mission.difficulty)
                  const progress = Math.max(5, Math.min(95, (i + 1) * 28))
                  const isNaked = mission.equipment === 'naked_eye'
                  const isPending = !isNaked && (sky?.cloudCover ?? 0) > 60

                  return (
                    <div
                      key={mission.id}
                      className="rounded-lg p-4 border transition-colors hover:border-white/10"
                      style={{ background: 'rgba(255,255,255,0.02)', borderColor: 'rgba(255,255,255,0.06)' }}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1.5">
                            <h3 className="text-sm font-bold text-white truncate">
                              {lang === 'ka' ? mission.titleGe?.replace(/^[^ ]+ /, '') ?? mission.objectName : mission.objectName}
                            </h3>
                            <span
                              className="text-[9px] font-bold tracking-wider px-2 py-0.5 rounded-full flex-shrink-0 uppercase"
                              style={{ background: catStyle.bg, color: catStyle.text, border: `1px solid ${catStyle.border}` }}
                            >
                              {lang === 'ka'
                                ? { easy:'მარტივი', medium:'საშუალო', hard:'რთული', expert:'ექსპერტი' }[mission.difficulty] ?? mission.difficulty
                                : mission.difficulty.toUpperCase()
                              }
                            </span>
                          </div>
                          <p className="text-xs text-[#64748B] leading-relaxed line-clamp-1">
                            {lang === 'ka' ? mission.descriptionGe : mission.description}
                          </p>
                          <div className="mt-2 flex items-center gap-3">
                            <span className="text-[10px] font-bold tracking-wider text-[#475569] uppercase font-mono">
                              {isPending
                                ? (lang === 'ka' ? 'ლოდინი: ნათელი ცა' : 'Pending Clear Skies')
                                : <>{lang === 'ka' ? 'დარჩა: ' : 'Remaining: '}<CountdownTick bestTime={mission.bestTime} /></>
                              }
                            </span>
                            <span className="text-[10px] text-[#6366F1] font-bold">+{mission.points} XP</span>
                          </div>
                        </div>
                        <CircleProgress pct={isPending ? 0 : progress} color={catStyle.text} size={42} />
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </div>

        {/* ── RIGHT COLUMN ── */}
        <div className="lg:col-span-3 space-y-3">

          {/* Current sky score */}
          <div className="card p-5">
            <span className="text-[10px] font-bold tracking-[0.15em] text-[#64748B] uppercase block mb-4">
              {lang === 'ka' ? 'ცის ქულა' : 'Current Sky Score'}
            </span>

            {skyLoading || skyScore === null ? (
              <div className="flex items-center justify-center h-36">
                <div className="w-24 h-24 rounded-full bg-white/[0.03] animate-pulse" />
              </div>
            ) : (
              <SkyGauge score={skyScore} />
            )}

            {sky && !skyLoading && (
              <div className="mt-4 space-y-2">
                <div
                  className="flex items-center gap-2 px-3 py-2 rounded-lg text-[11px] font-bold"
                  style={{ background: 'rgba(52,211,153,0.08)', border: '1px solid rgba(52,211,153,0.2)', color: '#34D399' }}
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-[#34D399] animate-pulse flex-shrink-0" />
                  {lang === 'ka' ? 'მხილვადობა ოპტიმ.' : 'Visibility Optimal'}
                </div>
                <div className="grid grid-cols-2 gap-2 text-center">
                  <div className="bg-white/[0.03] border border-white/[0.05] rounded-lg p-2">
                    <div className="text-[10px] text-[#64748B] uppercase tracking-wide">{lang === 'ka' ? 'ღრუბ.' : 'Clouds'}</div>
                    <div className="text-sm font-bold text-white mt-0.5">{sky.cloudCover}%</div>
                  </div>
                  <div className="bg-white/[0.03] border border-white/[0.05] rounded-lg p-2">
                    <div className="text-[10px] text-[#64748B] uppercase tracking-wide">{lang === 'ka' ? 'ტემპ.' : 'Temp'}</div>
                    <div className="text-sm font-bold text-white mt-0.5">{sky.temperature ?? '—'}°</div>
                  </div>
                </div>
                <Link
                  href="/sky-tools/conditions"
                  className="flex items-center justify-center gap-1.5 w-full text-[11px] font-bold text-[#6366F1] hover:text-[#818CF8] transition-colors py-1.5"
                >
                  {lang === 'ka' ? 'დეტალები' : 'Full details'} <ArrowRight size={12} />
                </Link>
              </div>
            )}
          </div>

          {/* Tonight's anomaly */}
          {anomalyMission && (
            <div
              className="card p-5 relative overflow-hidden"
              style={{ borderColor: 'rgba(249,115,22,0.3)', background: 'rgba(249,115,22,0.04)' }}
            >
              <div className="absolute top-0 right-0 w-24 h-24 opacity-[0.04] rounded-full blur-2xl bg-orange-500 pointer-events-none" />
              <span className="text-[10px] font-bold tracking-[0.15em] uppercase block mb-3" style={{ color: '#F97316' }}>
                {lang === 'ka' ? 'ღამის ანომალია' : "Tonight's Anomaly"}
              </span>
              <h3 className="text-sm font-bold text-white mb-2 leading-snug">
                {lang === 'ka' ? anomalyMission.titleGe : anomalyMission.title}
              </h3>
              <p className="text-xs text-[#64748B] leading-relaxed mb-4 line-clamp-3">
                {lang === 'ka' ? anomalyMission.descriptionGe : anomalyMission.description}
              </p>
              <div
                className="text-[11px] font-bold px-3 py-1.5 rounded mb-3 text-center tracking-wider"
                style={{ background: 'rgba(249,115,22,0.15)', color: '#F97316', border: '1px solid rgba(249,115,22,0.3)' }}
              >
                +{anomalyMission.points} XP {lang === 'ka' ? 'ბონუსი' : 'Bonus'}
              </div>
              <Link
                href="/missions"
                className="block w-full text-center text-[11px] font-bold tracking-[0.1em] uppercase py-2.5 rounded transition-all"
                style={{ background: 'rgba(249,115,22,0.12)', color: '#FB923C', border: '1px solid rgba(249,115,22,0.3)' }}
              >
                {lang === 'ka' ? 'ოპტიკა ჩართე' : 'Engage Optics'}
              </Link>
            </div>
          )}
        </div>
      </div>

      {/* Leaderboard — bottom strip */}
      <div className="card p-5 mt-3 sm:mt-4">
        <div className="flex items-center justify-between mb-4">
          <span className="text-[10px] font-bold tracking-[0.15em] text-[#64748B] uppercase">
            {lang === 'ka' ? 'ლოკალური ტოპი' : 'Local Cluster Top'}
          </span>
          <Link href="/leaderboard" className="text-[10px] text-[#6366F1] hover:text-[#818CF8] transition-colors font-bold tracking-wide">
            {lang === 'ka' ? 'სრული →' : 'Full →'}
          </Link>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
          {mockLeaderboard.map(u => (
            <div
              key={u.rank}
              className={`flex items-center gap-3 rounded-lg px-3 py-2 transition-colors ${u.isMe ? 'bg-[#6366F1]/10 border border-[#6366F1]/20' : 'bg-white/[0.02] border border-white/[0.04] hover:bg-white/[0.04]'}`}
            >
              <span className={`text-[11px] font-bold w-5 text-center font-mono flex-shrink-0 ${u.isMe ? 'text-[#6366F1]' : 'text-[#475569]'}`}>
                {String(u.rank).padStart(2, '0')}
              </span>
              <div className={`w-7 h-7 rounded-full flex items-center justify-center border flex-shrink-0 ${u.isMe ? 'bg-[#6366F1] border-[#6366F1]/50' : 'bg-[#1E2235] border-white/[0.08]'}`}>
                {u.isMe
                  ? <Telescope size={12} className="text-white" />
                  : <User size={11} className="text-[#64748B]" />}
              </div>
              <span className={`flex-1 text-xs font-medium truncate ${u.isMe ? 'text-[#818CF8]' : 'text-[#94A3B8]'}`}>
                {u.name}
              </span>
              <span className="text-xs font-bold text-white flex-shrink-0">{u.points.toLocaleString()}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
