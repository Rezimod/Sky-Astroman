'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Cloud, Moon, Target, Trophy, ArrowRight, Star, User } from 'lucide-react'
import { SaturnLogo } from '@/components/shared/SaturnLogo'
import { useLanguage } from '@/contexts/LanguageContext'
import type { SkyConditions, GeneratedMission } from '@/lib/types'

const MOON_PHASE_LABEL = (phase: number, lang: string): string => {
  if (phase < 0.1 || phase > 0.9) return lang === 'ka' ? 'ახალმთვარე' : 'New Moon'
  if (phase < 0.4) return lang === 'ka' ? 'ნამგლისებური' : 'Crescent'
  if (phase < 0.6) return lang === 'ka' ? 'სავსემთვარე' : 'Full Moon'
  return lang === 'ka' ? 'ოვალური' : 'Gibbous'
}

const DIFF_STYLE: Record<string, { label: string; ka: string; cls: string }> = {
  easy:   { label: 'Easy',   ka: 'მარტივი', cls: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' },
  medium: { label: 'Medium', ka: 'საშუალო', cls: 'bg-amber-500/10 text-amber-400 border-amber-500/20' },
  hard:   { label: 'Hard',   ka: 'რთული',   cls: 'bg-rose-500/10 text-rose-400 border-rose-500/20' },
  expert: { label: 'Expert', ka: 'ექსპ.',   cls: 'bg-violet-500/10 text-violet-400 border-violet-500/20' },
}

const mockLeaderboard = [
  { name: 'გიორგი მ.',  title: 'ვარსკვლავთმრ.', pts: 8450 },
  { name: 'ნინო დ.',    title: 'ასტრო-ფოტო',     pts: 7200 },
  { name: 'ლევანი ჭ.', title: 'დამწყები',       pts: 6800 },
  { name: 'ანა გ.',     title: 'დამწყები',       pts: 5100 },
  { name: 'თ. კ.',      title: 'დამწყები',       pts: 4950 },
]

const OPEN_METEO = 'https://api.open-meteo.com/v1/forecast?latitude=41.7151&longitude=44.8271&current=cloud_cover,temperature_2m&daily=sunrise,sunset&timezone=Asia%2FTbilisi&forecast_days=1'

function getMoonPhase(): number {
  const knownNew = new Date('2024-01-11').getTime()
  const cycle = 29.53058867 * 24 * 60 * 60 * 1000
  return ((Date.now() - knownNew) % cycle) / cycle
}

export default function LandingPage() {
  const { lang, setLang } = useLanguage()
  const [sky, setSky] = useState<SkyConditions | null>(null)
  const [missions, setMissions] = useState<GeneratedMission[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([
      fetch('/api/sky/conditions').then(r => r.json()).catch(() => null),
      fetch('/api/missions').then(r => r.json()).catch(() => []),
      fetch(OPEN_METEO).then(r => r.json()).catch(() => null),
    ]).then(([skyData, missionData, meteo]) => {
      if (skyData && !skyData.error) {
        if (meteo && !meteo.error) {
          skyData.cloudCover  = meteo.current?.cloud_cover    ?? skyData.cloudCover
          skyData.temperature = meteo.current?.temperature_2m ?? skyData.temperature
        }
        const phase = getMoonPhase()
        skyData.moonPhase = phase
        skyData.moonIllumination = Math.sin(phase * Math.PI)
        setSky(skyData)
      }
      if (Array.isArray(missionData)) setMissions(missionData)
      setLoading(false)
    })
  }, [])

  const skyScore = sky
    ? Math.max(0, Math.round(100 - (sky.cloudCover ?? 50) * 0.6 - (sky.moonIllumination ?? 0) * 15))
    : null
  const topMissions = missions.slice(0, 4)
  const scoreColor = skyScore !== null ? (skyScore >= 70 ? '#10B981' : skyScore >= 40 ? '#F59E0B' : '#F43F5E') : '#6366F1'

  return (
    <div className="min-h-screen flex flex-col relative overflow-x-hidden">

      {/* Background glows */}
      <div className="fixed top-[-15%] left-[-8%] w-[50vw] h-[50vw] rounded-full bg-[#6366F1]/14 blur-[130px] pointer-events-none z-0" />
      <div className="fixed bottom-[-15%] right-[-8%] w-[55vw] h-[55vw] rounded-full bg-[#8B5CF6]/9 blur-[150px] pointer-events-none z-0" />

      {/* Header */}
      <header className="glass-nav sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between gap-4">

          <Link href="/" className="flex items-center gap-2 shrink-0">
            <SaturnLogo width={22} height={22} />
            <span className="text-sm font-bold tracking-[0.14em] text-white uppercase">
              Ste<span className="text-[#6366F1]">llar</span>
            </span>
          </Link>

          <nav className="hidden md:flex items-center gap-4">
            <Link href="/missions" className="text-[12px] font-medium text-[#64748B] hover:text-white transition-colors">
              {lang === 'ka' ? 'მისიები' : 'Missions'}
            </Link>
            <Link href="/leaderboard" className="text-[12px] font-medium text-[#64748B] hover:text-white transition-colors">
              {lang === 'ka' ? 'რეიტინგი' : 'Ranks'}
            </Link>
          </nav>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setLang(lang === 'ka' ? 'en' : 'ka')}
              className="text-[10px] font-bold px-2 py-1 rounded-lg border border-white/[0.08] bg-white/[0.03] text-[#64748B] hover:text-white transition-all tracking-widest"
            >
              {lang === 'ka' ? 'EN' : 'ქარ'}
            </button>
            <Link href="/login" className="hidden sm:block text-[12px] font-medium text-[#64748B] hover:text-white transition-colors px-2 py-1">
              {lang === 'ka' ? 'შესვლა' : 'Sign in'}
            </Link>
            <Link
              href="/register"
              className="bg-[#6366F1] hover:bg-[#4F46E5] text-white text-[12px] font-bold px-4 py-2 rounded-lg transition-all shadow-lg shadow-indigo-500/20"
            >
              {lang === 'ka' ? 'დაწყება' : 'Start'}
            </Link>
          </div>
        </div>
      </header>

      <main className="relative z-10 flex-1 w-full">

        {/* ── HERO ── */}
        <section className="max-w-7xl mx-auto px-4 sm:px-6 pt-10 pb-10">
          <div className="grid lg:grid-cols-2 gap-8 lg:gap-12 items-center">

            {/* Left — text */}
            <div className="space-y-5 animate-slide-up-1">
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/[0.04] border border-white/[0.08] text-[11px] font-bold text-[#6366F1] tracking-widest uppercase">
                <span className="w-1.5 h-1.5 rounded-full bg-[#6366F1] animate-pulse" />
                {lang === 'ka' ? 'საქართველო · თბილისი' : 'Georgia · Tbilisi'}
              </div>

              <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-white leading-[1.1] tracking-tight">
                {lang === 'ka'
                  ? <><span className="text-gradient">ვარსკვლავები</span><br />შენ ხელთ</>
                  : <><span className="text-gradient">The stars</span><br />in your hands</>
                }
              </h1>

              <p className="text-[13px] text-[#64748B] max-w-md leading-relaxed">
                {lang === 'ka'
                  ? 'საქართველოს ვარსკვლავმოყვარეთა პლატფორმა — ჩაწერე დაკვირვებები, შეასრულე ღამის მისიები, გახდი ლიდერი.'
                  : "Georgia's astronomy community — track observations, complete nightly missions, and rise through the ranks."}
              </p>

              <div className="flex flex-wrap items-center gap-3">
                <Link
                  href="/register"
                  className="flex items-center gap-2 bg-[#6366F1] hover:bg-[#4F46E5] text-white text-[13px] font-bold px-5 py-2.5 rounded-lg transition-all shadow-lg shadow-indigo-500/20"
                >
                  {lang === 'ka' ? 'დარეგისტრირდი' : 'Get started'}
                  <ArrowRight size={14} />
                </Link>
                <Link
                  href="/leaderboard"
                  className="flex items-center gap-2 bg-white/[0.04] hover:bg-white/[0.08] text-white border border-white/[0.09] text-[13px] font-medium px-5 py-2.5 rounded-lg transition-all"
                >
                  <Trophy size={13} className="text-[#F59E0B]" />
                  {lang === 'ka' ? 'რეიტინგი' : 'Ranks'}
                </Link>
              </div>

              {/* Stats row */}
              <div className="flex items-center gap-4 pt-1">
                {[
                  { n: '200+', label: lang === 'ka' ? 'მომხმარებელი' : 'Users' },
                  { n: '1K+',  label: lang === 'ka' ? 'დაკვირვება'  : 'Observations' },
                  { n: '50+',  label: lang === 'ka' ? 'მისია'       : 'Missions' },
                ].map(s => (
                  <div key={s.label}>
                    <div className="text-base font-bold text-white">{s.n}</div>
                    <div className="text-[10px] text-[#475569] uppercase tracking-wide">{s.label}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Right — sky card */}
            <div className="relative animate-slide-up-2">
              <div className="bg-[#0A0E1A]/85 backdrop-blur-2xl border border-white/[0.09] rounded-2xl p-5 shadow-2xl">

                {/* Header row */}
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 className="text-[13px] font-bold text-white">{lang === 'ka' ? 'ცის მდგომარეობა' : 'Sky conditions'}</h3>
                    <p className="text-[10px] text-[#475569] mt-0.5">
                      📍 {lang === 'ka' ? 'თბილისი, საქართველო' : 'Tbilisi, Georgia'}
                    </p>
                  </div>
                  {!loading && (sky?.planets?.filter(p => p.isVisible).length ?? 0) > 0 && (
                    <div className="flex items-center gap-1.5 text-[10px] text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-1 rounded-full font-bold">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                      {sky?.planets?.filter(p => p.isVisible).length} {lang === 'ka' ? 'ხილული' : 'visible'}
                    </div>
                  )}
                </div>

                {/* Score gauge */}
                <div className="flex items-center gap-5 mb-4">
                  <div className="relative flex-shrink-0" style={{ width: 96, height: 96 }}>
                    <svg width="96" height="96" viewBox="0 0 96 96">
                      <circle cx="48" cy="48" r="40" fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="6" />
                      <circle
                        cx="48" cy="48" r="40" fill="none"
                        stroke={scoreColor} strokeWidth="6" strokeLinecap="round"
                        strokeDasharray="251.3"
                        strokeDashoffset={loading || skyScore === null ? 251.3 : 251.3 * (1 - skyScore / 100)}
                        transform="rotate(-90 48 48)"
                        style={{ transition: 'stroke-dashoffset 1.2s ease' }}
                      />
                    </svg>
                    <div className="absolute inset-0 flex flex-col items-center justify-center">
                      <span className="text-2xl font-bold text-white leading-none">
                        {loading ? '—' : (skyScore ?? '—')}
                      </span>
                      <span className="text-[9px] text-[#64748B] uppercase tracking-wider mt-0.5">
                        {lang === 'ka' ? 'ქულა' : 'Score'}
                      </span>
                    </div>
                  </div>

                  <div className="flex-1 space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Cloud size={12} className="text-[#64748B]" />
                        <span className="text-[11px] text-[#64748B]">{lang === 'ka' ? 'ღრუბ.' : 'Clouds'}</span>
                      </div>
                      <span className="text-[12px] font-bold text-white">{loading ? '—' : `${sky?.cloudCover ?? '—'}%`}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Moon size={12} className="text-[#64748B]" />
                        <span className="text-[11px] text-[#64748B]">{lang === 'ka' ? 'მთვარე' : 'Moon'}</span>
                      </div>
                      <span className="text-[12px] font-bold text-white">
                        {loading ? '—' : MOON_PHASE_LABEL(sky?.moonPhase ?? 0, lang)}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="text-[12px]">🌡</span>
                        <span className="text-[11px] text-[#64748B]">{lang === 'ka' ? 'ტემპ.' : 'Temp'}</span>
                      </div>
                      <span className="text-[12px] font-bold text-white">
                        {loading ? '—' : `${sky?.temperature ?? '—'}°C`}
                      </span>
                    </div>
                    {!loading && skyScore !== null && (
                      <div className={`text-[10px] font-bold px-2 py-1 rounded text-center ${
                        skyScore >= 70 ? 'bg-emerald-500/10 text-emerald-400' :
                        skyScore >= 40 ? 'bg-amber-500/10 text-amber-400' :
                        'bg-rose-500/10 text-rose-400'
                      }`}>
                        {skyScore >= 70
                          ? (lang === 'ka' ? '✓ იდეალური' : '✓ Excellent')
                          : skyScore >= 40
                          ? (lang === 'ka' ? '~ საშუალო' : '~ Fair')
                          : (lang === 'ka' ? '✗ ცუდი' : '✗ Poor')}
                      </div>
                    )}
                  </div>
                </div>

                <Link
                  href="/register"
                  className="flex items-center justify-center gap-2 w-full py-2.5 bg-[#6366F1]/15 hover:bg-[#6366F1]/25 border border-[#6366F1]/25 text-[#818CF8] text-[12px] font-bold rounded-xl transition-all"
                >
                  {lang === 'ka' ? 'სრული ვიდეო →' : 'View full sky →'}
                  <ArrowRight size={13} />
                </Link>
              </div>
            </div>
          </div>
        </section>

        {/* ── HOW IT WORKS ── */}
        <section className="max-w-7xl mx-auto px-4 sm:px-6 py-8 border-t border-white/[0.05]">
          <div className="flex items-center justify-between mb-5">
            <h2 className="text-base font-bold text-white">{lang === 'ka' ? 'როგორ მუშაობს' : 'How it works'}</h2>
            <span className="text-[11px] text-[#475569]">{lang === 'ka' ? '4 ნაბიჯი' : '4 steps'}</span>
          </div>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            {[
              { n:'01', icon:'🔭', t_en:'Check the Sky',   t_ka:'შეამოწმე ცა',   d_en:'See planets visible from Tbilisi tonight', d_ka:'ნახე დღევანდელი ხილული ობიექტები' },
              { n:'02', icon:'🎯', t_en:'Pick a Mission',  t_ka:'აირჩიე მისია',  d_en:'Nightly targets based on real sky data',   d_ka:'ყოველ ღამე ახალი სამიზნეები' },
              { n:'03', icon:'📸', t_en:'Shoot & Submit',  t_ka:'გადაიღე',       d_en:'Photograph the object and submit',         d_ka:'გადაიღე და გაგზავნე ფოტო' },
              { n:'04', icon:'⭐', t_en:'Earn Points',     t_ka:'დააგროვე ქულა', d_en:'Admin verifies and points go to your account', d_ka:'ადმინი ამოწმებს, ქულები ემატება' },
            ].map((s, i) => (
              <div key={i} className="card p-4 hover:-translate-y-0.5 transition-transform duration-200">
                <div className="flex items-center gap-2 mb-3">
                  <span className="text-xl">{s.icon}</span>
                  <span className="text-[10px] font-black text-[#6366F1] tracking-widest">{s.n}</span>
                </div>
                <h3 className="text-[12px] font-bold text-white mb-1">{lang === 'ka' ? s.t_ka : s.t_en}</h3>
                <p className="text-[11px] text-[#64748B] leading-relaxed">{lang === 'ka' ? s.d_ka : s.d_en}</p>
              </div>
            ))}
          </div>
        </section>

        {/* ── MISSIONS + LEADERBOARD ── */}
        <section className="max-w-7xl mx-auto px-4 sm:px-6 py-8 border-t border-white/[0.05]">
          <div className="grid lg:grid-cols-3 gap-5">

            {/* Missions */}
            <div className="lg:col-span-2">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-[13px] font-bold text-white flex items-center gap-2">
                  <Target size={14} className="text-[#6366F1]" />
                  {lang === 'ka' ? 'ღამის მისიები' : "Tonight's Missions"}
                </h2>
                <Link href="/register" className="text-[11px] font-bold text-[#6366F1] hover:text-[#818CF8] transition-colors">
                  {lang === 'ka' ? 'ყველა →' : 'See all →'}
                </Link>
              </div>

              <div className="grid grid-cols-2 gap-3">
                {loading ? (
                  [...Array(4)].map((_, i) => (
                    <div key={i} className="card h-36 animate-pulse" />
                  ))
                ) : topMissions.length > 0 ? topMissions.map(m => {
                  const d = DIFF_STYLE[m.difficulty]
                  return (
                    <div key={m.id} className="card p-3.5 flex flex-col gap-2 hover:border-white/10 transition-all group">
                      <div className="flex items-start justify-between gap-2">
                        <span className="text-xl">{m.objectEmoji}</span>
                        <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded border uppercase ${d?.cls}`}>
                          {lang === 'ka' ? d?.ka : d?.label}
                        </span>
                      </div>
                      <div>
                        <h3 className="text-[12px] font-bold text-white line-clamp-1 group-hover:text-[#818CF8] transition-colors">
                          {lang === 'ka' ? (m.titleGe?.replace(/^[^ ]+ /, '') ?? m.objectName) : m.objectName}
                        </h3>
                        <p className="text-[10px] text-[#64748B] line-clamp-2 mt-0.5 leading-relaxed">
                          {lang === 'ka' ? m.descriptionGe : m.description}
                        </p>
                      </div>
                      <div className="flex items-center justify-between mt-auto pt-1.5 border-t border-white/[0.05]">
                        <span className="text-[11px] font-bold text-white">+{m.points} XP</span>
                        <Link href="/register"
                          className="text-[10px] font-bold text-[#6366F1] hover:text-white transition-colors"
                          onClick={e => e.stopPropagation()}>
                          {lang === 'ka' ? 'მიღება →' : 'Accept →'}
                        </Link>
                      </div>
                    </div>
                  )
                }) : (
                  <div className="col-span-2 card p-6 text-center">
                    <p className="text-[#475569] text-sm">{lang === 'ka' ? 'მისიები იტვირთება...' : 'Loading missions...'}</p>
                  </div>
                )}
              </div>
            </div>

            {/* Leaderboard */}
            <div className="card p-5 flex flex-col">
              <div className="flex items-center justify-between mb-4 pb-3 border-b border-white/[0.06]">
                <h2 className="text-[13px] font-bold text-white flex items-center gap-2">
                  <Trophy size={14} className="text-[#F59E0B]" />
                  {lang === 'ka' ? 'ტოპ 5' : 'Top 5'}
                </h2>
                <Link href="/leaderboard" className="text-[10px] text-[#64748B] hover:text-white transition-colors font-bold">
                  {lang === 'ka' ? 'სრული' : 'Full list'} →
                </Link>
              </div>

              <div className="space-y-1 flex-1">
                {mockLeaderboard.map((u, i) => (
                  <div key={i} className={`flex items-center gap-2.5 px-2.5 py-2 rounded-lg transition-colors ${i === 0 ? 'bg-[#6366F1]/8 border border-[#6366F1]/15' : 'hover:bg-white/[0.03]'}`}>
                    <span className={`text-[11px] font-bold w-4 text-center font-mono ${i === 0 ? 'text-[#F59E0B]' : 'text-[#475569]'}`}>
                      {i + 1}
                    </span>
                    <div className={`w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 ${i === 0 ? 'bg-[#6366F1]' : 'bg-white/[0.05] border border-white/[0.07]'}`}>
                      <User size={11} className={i === 0 ? 'text-white' : 'text-[#64748B]'} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-[11px] font-bold text-white truncate">{u.name}</div>
                      <div className="text-[9px] text-[#475569] truncate">{u.title}</div>
                    </div>
                    <span className="text-[11px] font-bold text-white flex-shrink-0">{u.pts.toLocaleString()}</span>
                  </div>
                ))}
              </div>

              <div className="mt-4 pt-3 border-t border-white/[0.06] text-center">
                <Link
                  href="/register"
                  className="inline-flex items-center gap-1.5 text-[11px] font-bold text-[#6366F1] hover:text-[#818CF8] transition-colors"
                >
                  {lang === 'ka' ? 'შედი და იმეტყველე' : 'Join & compete'} <ArrowRight size={11} />
                </Link>
              </div>
            </div>
          </div>
        </section>

        {/* ── CTA ── */}
        <section className="max-w-7xl mx-auto px-4 sm:px-6 py-10 border-t border-white/[0.05]">
          <div className="relative rounded-2xl overflow-hidden p-8 text-center"
            style={{ background: 'linear-gradient(135deg, rgba(99,102,241,0.12) 0%, rgba(139,92,246,0.08) 100%)', border: '1px solid rgba(99,102,241,0.2)' }}>
            <div className="absolute inset-0 pointer-events-none">
              {[...Array(8)].map((_, i) => (
                <div key={i} className="star" style={{
                  top: `${10 + i * 11}%`, left: `${5 + i * 12}%`,
                  width: 2, height: 2,
                  '--duration': `${3 + i}s`, '--delay': `${i * 0.5}s`,
                } as React.CSSProperties} />
              ))}
            </div>
            <div className="relative z-10">
              <Star size={28} className="text-[#6366F1] mx-auto mb-4 opacity-80" />
              <h2 className="text-xl sm:text-2xl font-bold text-white mb-2">
                {lang === 'ka' ? 'მზად ხარ?' : 'Ready to explore?'}
              </h2>
              <p className="text-[#64748B] text-sm mb-6 max-w-sm mx-auto">
                {lang === 'ka'
                  ? 'შემოგვიერთდი საქართველოს ვარსკვლავმოყვარეთა საზოგადოებაში'
                  : 'Join Georgia\'s astronomy community for free'}
              </p>
              <Link
                href="/register"
                className="inline-flex items-center gap-2 bg-[#6366F1] hover:bg-[#4F46E5] text-white font-bold px-6 py-3 rounded-xl transition-all shadow-lg shadow-indigo-500/25 text-sm"
              >
                {lang === 'ka' ? 'Stellar-ში გაწევრება →' : 'Join Stellar →'}
              </Link>
            </div>
          </div>
        </section>

      </main>

      {/* Footer */}
      <footer className="border-t border-white/[0.06] relative z-10" style={{ background: 'rgba(6,8,15,0.8)' }}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <SaturnLogo width={18} height={18} />
            <span className="text-[11px] font-bold tracking-[0.14em] text-white/40 uppercase">Stellar</span>
          </div>
          <p className="text-[11px] text-[#334155]">
            © 2026 Stellar · astroman.ge
          </p>
          <nav className="flex items-center gap-4">
            <Link href="/login"    className="text-[11px] text-[#475569] hover:text-white transition-colors">{lang === 'ka' ? 'შესვლა' : 'Sign in'}</Link>
            <Link href="/register" className="text-[11px] text-[#475569] hover:text-white transition-colors">{lang === 'ka' ? 'რეგისტრაცია' : 'Register'}</Link>
            <a href="https://astroman.ge" target="_blank" rel="noopener noreferrer" className="text-[11px] text-[#475569] hover:text-white transition-colors">astroman.ge</a>
          </nav>
        </div>
      </footer>
    </div>
  )
}
