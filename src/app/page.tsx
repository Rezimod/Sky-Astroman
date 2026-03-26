'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Telescope, Cloud, Moon, MapPin, Target, Trophy, ArrowRight, Star } from 'lucide-react'
import { useLanguage } from '@/contexts/LanguageContext'
import type { SkyConditions, GeneratedMission } from '@/lib/types'

const MOON_PHASE_LABEL = (phase: number): { en: string; ka: string } => {
  if (phase < 0.1) return { en: 'New Moon',  ka: 'ახალმთვარე'   }
  if (phase < 0.4) return { en: 'Crescent',  ka: 'ნამგლისებური' }
  if (phase < 0.6) return { en: 'Full Moon', ka: 'სავსემთვარე'  }
  if (phase < 0.9) return { en: 'Gibbous',   ka: 'ოვალური'      }
  return              { en: 'New Moon',  ka: 'ახალმთვარე'   }
}

const DIFF_BADGE: Record<string, { label: string; labelGe: string; classes: string }> = {
  easy:   { label: 'Easy',   labelGe: 'მარტივი', classes: 'bg-green-500/10 text-green-400 border-green-500/20' },
  medium: { label: 'Medium', labelGe: 'საშუალო', classes: 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20' },
  hard:   { label: 'Hard',   labelGe: 'რთული',   classes: 'bg-red-500/10 text-red-400 border-red-500/20' },
  expert: { label: 'Expert', labelGe: 'ექსპერტი', classes: 'bg-purple-500/10 text-purple-400 border-purple-500/20' },
}

const mockLeaderboard = [
  { display_name: 'გიორგი მაისურაძე', title: 'ვარსკვლავთმრიცხველი', points: 8450, initials: 'გ.მ' },
  { display_name: 'ნინო დოლიძე',       title: 'ასტროფოტოგრაფი',    points: 7200, initials: 'ნ.დ' },
  { display_name: 'ლევან ჭანტურია',    title: 'დამწყები',           points: 6800, initials: 'ლ.ჭ' },
  { display_name: 'ანა გიორგაძე',      title: 'დამწყები',           points: 5100, initials: 'ა.გ' },
  { display_name: 'თორნიკე კაპანაძე',  title: 'დამწყები',           points: 4950, initials: 'თ.კ' },
]

const OPEN_METEO = 'https://api.open-meteo.com/v1/forecast?latitude=41.7151&longitude=44.8271&hourly=cloud_cover,visibility,temperature_2m&daily=sunrise,sunset,moon_phase&current=cloud_cover,temperature_2m&timezone=Asia%2FTbilisi&forecast_days=1'

interface ApodData {
  title: string
  url: string
  hdurl?: string
  explanation: string
  date: string
  media_type: string
}

const howSteps = [
  { Icon: Telescope, titleKey: 'landing.step1t', descKey: 'landing.step1d' },
  { Icon: Cloud,     titleKey: 'landing.step2t', descKey: 'landing.step2d' },
  { Icon: Target,    titleKey: 'landing.step3t', descKey: 'landing.step3d' },
  { Icon: Trophy,    titleKey: 'landing.step4t', descKey: 'landing.step4d' },
]

export default function LandingPage() {
  const { t, lang, setLang } = useLanguage()
  const [sky, setSky] = useState<SkyConditions | null>(null)
  const [missions, setMissions] = useState<GeneratedMission[]>([])
  const [apod, setApod] = useState<ApodData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([
      fetch('/api/sky/conditions').then(r => r.json()).catch(() => null),
      fetch('/api/missions').then(r => r.json()).catch(() => []),
      fetch(OPEN_METEO).then(r => r.json()).catch(() => null),
      fetch('/api/apod').then(r => r.json()).catch(() => null),
    ]).then(([skyData, missionData, meteo, apodData]) => {
      if (skyData && !skyData.error) {
        if (meteo && !meteo.error) {
          const hour = new Date().getHours()
          skyData.cloudCover  = meteo.current?.cloud_cover    ?? meteo.hourly?.cloud_cover?.[hour]    ?? skyData.cloudCover
          skyData.temperature = meteo.current?.temperature_2m ?? meteo.hourly?.temperature_2m?.[hour] ?? skyData.temperature
          const mp = meteo.daily?.moon_phase?.[0]
          if (mp !== undefined) { skyData.moonPhase = mp; skyData.moonIllumination = Math.sin(mp * Math.PI) }
        }
        setSky(skyData)
      }
      if (Array.isArray(missionData)) setMissions(missionData)
      if (apodData && !apodData.error && apodData.media_type === 'image') setApod(apodData)
      setLoading(false)
    })
  }, [])

  const moonLabel = sky ? MOON_PHASE_LABEL(sky.moonPhase) : null
  const skyScore = sky ? Math.max(0, Math.round(100 - (sky.cloudCover ?? 50) * 0.6 - (sky.moonIllumination ?? 0) * 15)) : null
  const visibleCount = sky?.planets?.filter(p => p.isVisible).length ?? 0
  const topMissions = missions.slice(0, 4)

  return (
    <div className="min-h-screen flex flex-col overflow-x-hidden">

      {/* Top bar */}
      <header className="relative z-50 border-b border-white/10 bg-space-900/50 backdrop-blur-xl sticky top-0">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 sm:h-20 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Telescope size={20} className="text-space-accent" />
            <span className="text-base sm:text-xl font-bold tracking-widest text-white uppercase">
              Sky<span className="text-space-accent">watcher</span>
            </span>
          </div>
          <nav className="hidden md:flex items-center gap-8">
            <Link href="/missions" className="text-sm font-medium text-slate-400 hover:text-white transition-colors">{t('nav.missions')}</Link>
            <Link href="/leaderboard" className="text-sm font-medium text-slate-400 hover:text-white transition-colors">{t('nav.ranks')}</Link>
          </nav>
          <div className="flex items-center gap-2 sm:gap-3">
            <button
              onClick={() => setLang(lang === 'ka' ? 'en' : 'ka')}
              className="text-xs font-bold px-3 py-1.5 rounded-full border border-white/10 bg-white/5 text-slate-400 hover:text-white hover:bg-white/10 transition-all tracking-wider"
            >
              {lang === 'ka' ? 'EN' : 'ქარ'}
            </button>
            <Link href="/login" className="hidden sm:block text-sm font-medium text-slate-400 hover:text-white transition-colors px-4 py-2">
              {lang === 'ka' ? 'შესვლა' : 'Sign in'}
            </Link>
            <Link
              href="/login"
              className="bg-space-accent hover:bg-indigo-500 text-white text-sm font-semibold px-4 sm:px-6 py-2 sm:py-2.5 rounded-full transition-all shadow-[0_0_20px_rgba(99,102,241,0.4)]"
            >
              {t('landing.startBtn')}
            </Link>
          </div>
        </div>
      </header>

      <main className="relative z-10 w-full">

        {/* Hero */}
        <section className="max-w-7xl mx-auto px-4 sm:px-6 pt-16 sm:pt-24 pb-20 sm:pb-32">
          <div className="grid lg:grid-cols-2 gap-10 lg:gap-16 items-center">

            {/* Left */}
            <div className="space-y-6 sm:space-y-8">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/5 border border-white/10 text-xs font-medium text-space-accent">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-space-accent opacity-75" />
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-space-accent" />
                </span>
                {lang === 'ka' ? 'რეალურ დროში მონაცემები' : 'Real-time data'}
              </div>

              <h1 className="text-5xl sm:text-6xl lg:text-7xl font-bold text-white leading-[1.1] tracking-tight">
                {lang === 'ka'
                  ? <><span className="text-transparent bg-clip-text bg-gradient-to-r from-space-accent to-space-glow">ღამის ცა</span><br />ახლა</>
                  : <>{t('landing.heroLine1')}<br /><span className="text-transparent bg-clip-text bg-gradient-to-r from-space-accent to-space-glow">{t('landing.heroLine2')}</span></>
                }
              </h1>

              <p className="text-base sm:text-lg text-slate-400 max-w-lg leading-relaxed">
                {t('landing.heroSub')}
              </p>

              <div className="flex flex-wrap items-center gap-3 sm:gap-4 pt-2 sm:pt-4">
                <Link
                  href="/login"
                  className="bg-space-accent hover:bg-indigo-500 text-white text-base font-bold px-7 sm:px-8 py-3.5 sm:py-4 rounded-full transition-all flex items-center gap-2 shadow-[0_0_20px_rgba(99,102,241,0.4)] hover:shadow-[0_0_30px_rgba(99,102,241,0.6)]"
                >
                  {lang === 'ka' ? 'დაწყება ახლავე' : 'Get started'}
                  <ArrowRight size={18} />
                </Link>
                <Link
                  href="/leaderboard"
                  className="bg-white/5 hover:bg-white/10 text-white border border-white/20 text-base font-medium px-7 sm:px-8 py-3.5 sm:py-4 rounded-full transition-all flex items-center gap-2"
                >
                  <Trophy size={16} className="text-space-accent" />
                  {t('nav.ranks')}
                </Link>
              </div>
            </div>

            {/* Right — sky conditions card */}
            <div className="relative mt-4 lg:mt-0">
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[110%] h-[110%] rounded-full border border-white/5 pointer-events-none" />
              <div className="relative z-10 bg-[#12122b]/80 backdrop-blur-2xl border border-white/10 rounded-[2rem] p-6 sm:p-8 shadow-2xl shadow-space-accent/10">
                <div className="flex items-center justify-between mb-6 sm:mb-8">
                  <div>
                    <h3 className="text-white font-semibold text-base sm:text-lg">{lang === 'ka' ? 'ცის მდგომარეობა' : 'Sky conditions'}</h3>
                    <p className="text-sm text-slate-400 flex items-center gap-1 mt-1">
                      <MapPin size={12} className="text-space-accent" /> {lang === 'ka' ? 'თბილისი, საქართველო' : 'Tbilisi, Georgia'}
                    </p>
                  </div>
                  {!loading && visibleCount > 0 && (
                    <div className="flex items-center gap-2 text-xs text-green-400 bg-green-500/10 border border-green-500/20 px-3 py-1.5 rounded-full">
                      <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
                      {visibleCount} {lang === 'ka' ? 'ხილული' : 'visible'}
                    </div>
                  )}
                </div>

                {/* Gauge */}
                <div className="flex flex-col items-center mb-6 sm:mb-8">
                  <div className="relative w-36 sm:w-44 h-36 sm:h-44 flex items-center justify-center">
                    <svg className="w-full h-full transform -rotate-90 absolute" viewBox="0 0 100 100">
                      <circle cx="50" cy="50" r="45" fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="6" strokeLinecap="round" />
                      <circle
                        cx="50" cy="50" r="45" fill="none"
                        stroke="url(#skyGradient)" strokeWidth="6" strokeLinecap="round"
                        strokeDasharray="282.7"
                        strokeDashoffset={loading || skyScore === null ? 282.7 : 282.7 * (1 - skyScore / 100)}
                        className="transition-all duration-1000"
                      />
                      <defs>
                        <linearGradient id="skyGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                          <stop offset="0%" stopColor="#6366F1" />
                          <stop offset="100%" stopColor="#A855F7" />
                        </linearGradient>
                      </defs>
                    </svg>
                    <div className="text-center">
                      <span className="text-4xl sm:text-5xl font-bold text-white block">{loading ? '—' : (skyScore ?? '—')}</span>
                      <span className="text-xs uppercase tracking-widest text-slate-400 mt-1 block">{lang === 'ka' ? 'ცის შეფასება' : 'Sky score'}</span>
                    </div>
                  </div>
                  {!loading && skyScore !== null && (
                    <div className={`mt-4 px-4 py-1.5 rounded-full text-sm font-medium flex items-center gap-1.5 border ${
                      skyScore >= 70 ? 'bg-green-500/10 text-green-400 border-green-500/20' :
                      skyScore >= 40 ? 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20' :
                      'bg-red-500/10 text-red-400 border-red-500/20'
                    }`}>
                      {skyScore >= 70
                        ? (lang === 'ka' ? 'იდეალური პირობები' : 'Excellent conditions')
                        : skyScore >= 40
                        ? (lang === 'ka' ? 'საშუალო პირობები' : 'Fair conditions')
                        : (lang === 'ka' ? 'ცუდი პირობები' : 'Poor conditions')}
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-3 sm:gap-4">
                  <div className="bg-white/5 rounded-2xl p-3 sm:p-4 border border-white/5 flex items-start gap-3">
                    <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-blue-500/10 text-blue-400 flex items-center justify-center shrink-0">
                      <Cloud size={16} />
                    </div>
                    <div>
                      <span className="text-xl sm:text-2xl font-bold text-white block">
                        {loading ? '—' : `${sky?.cloudCover ?? '—'}%`}
                      </span>
                      <span className="text-xs text-slate-400">{lang === 'ka' ? 'ღრუბლიანობა' : 'Cloud cover'}</span>
                    </div>
                  </div>
                  <div className="bg-white/5 rounded-2xl p-3 sm:p-4 border border-white/5 flex items-start gap-3">
                    <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-yellow-500/10 text-yellow-400 flex items-center justify-center shrink-0">
                      <Moon size={16} />
                    </div>
                    <div>
                      <span className="text-base sm:text-lg font-bold text-white block leading-tight pt-1">
                        {loading ? '—' : (moonLabel?.[lang] ?? '—')}
                      </span>
                      <span className="text-xs text-slate-400">{lang === 'ka' ? 'მთვარის ფაზა' : 'Moon phase'}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* NASA APOD */}
        {apod && (
          <section className="max-w-7xl mx-auto px-4 sm:px-6 py-12 sm:py-20 border-t border-white/5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <Star size={14} className="text-space-accent" />
                  <span className="text-xs font-bold uppercase tracking-widest text-space-accent">NASA</span>
                </div>
                <h2 className="text-2xl sm:text-3xl font-bold text-white">
                  {lang === 'ka' ? 'დღის სურათი' : 'Picture of the Day'}
                </h2>
              </div>
              <span className="text-xs text-slate-500 font-medium">{apod.date}</span>
            </div>
            <div className="grid lg:grid-cols-5 gap-6 lg:gap-8 items-start">
              <div className="lg:col-span-3 relative rounded-[1.5rem] sm:rounded-[2rem] overflow-hidden border border-white/10 group">
                <img
                  src={apod.url}
                  alt={apod.title}
                  className="w-full object-cover aspect-video group-hover:scale-105 transition-transform duration-700"
                  loading="lazy"
                />
                <div className="absolute bottom-0 left-0 right-0 p-4 sm:p-6 bg-gradient-to-t from-space-900/90 to-transparent">
                  <h3 className="text-white font-bold text-base sm:text-lg">{apod.title}</h3>
                </div>
              </div>
              <div className="lg:col-span-2 space-y-4 sm:space-y-6">
                <p className="text-sm sm:text-base text-slate-400 leading-relaxed line-clamp-6 sm:line-clamp-none">
                  {apod.explanation}
                </p>
                {apod.hdurl && (
                  <a
                    href={apod.hdurl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 text-sm font-semibold text-space-accent hover:text-indigo-400 transition-colors"
                  >
                    {lang === 'ka' ? 'HD ვერსია' : 'View HD image'}
                    <ArrowRight size={14} />
                  </a>
                )}
              </div>
            </div>
          </section>
        )}

        {/* How it works */}
        <section className="max-w-7xl mx-auto px-4 sm:px-6 py-16 sm:py-24 border-t border-white/5 relative">
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-3/4 h-px bg-gradient-to-r from-transparent via-white/10 to-transparent" />
          <div className="text-center max-w-2xl mx-auto mb-10 sm:mb-16">
            <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-white mb-4">{t('landing.howTitle')}</h2>
            <p className="text-slate-400">{lang === 'ka' ? 'დაიწყე ვარსკვლავებზე დაკვირვება ოთხი მარტივი ნაბიჯით.' : 'Start observing the stars in four simple steps.'}</p>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5 sm:gap-8">
            {howSteps.map((step, i) => (
              <div key={i} className="relative group">
                <div className="absolute inset-0 bg-gradient-to-b from-space-accent/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity rounded-3xl -z-10 blur-xl" />
                <div className="bg-white/5 border border-white/10 rounded-2xl sm:rounded-3xl p-6 sm:p-8 h-full hover:-translate-y-2 transition-transform duration-300">
                  <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-xl sm:rounded-2xl bg-space-800 border border-white/10 flex items-center justify-center text-space-accent mb-5 sm:mb-6 shadow-lg">
                    <step.Icon size={22} />
                  </div>
                  <h3 className="text-lg sm:text-xl font-bold text-white mb-3">{i + 1}. {t(step.titleKey)}</h3>
                  <p className="text-sm text-slate-400 leading-relaxed">{t(step.descKey)}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Missions + Leaderboard */}
        <section className="max-w-7xl mx-auto px-4 sm:px-6 py-16 sm:py-24">
          <div className="grid lg:grid-cols-3 gap-6 sm:gap-8">

            {/* Missions (2/3) */}
            <div className="lg:col-span-2 space-y-6">
              <div className="flex items-center justify-between mb-6 sm:mb-8">
                <div>
                  <h2 className="text-xl sm:text-2xl font-bold text-white flex items-center gap-2">
                    <Target size={20} className="text-space-accent" />
                    {t('landing.missionsTitle')}
                  </h2>
                  <p className="text-sm text-slate-400 mt-1">{t('landing.missionsSub')}</p>
                </div>
                <Link href="/missions" className="text-sm font-medium text-space-accent hover:text-white transition-colors">
                  {t('landing.seeAll')}
                </Link>
              </div>

              <div className="space-y-3 sm:space-y-4">
                {loading ? (
                  [...Array(3)].map((_, i) => (
                    <div key={i} className="bg-white/5 border border-white/10 rounded-2xl h-24 animate-pulse" />
                  ))
                ) : topMissions.map(m => {
                  const badge = DIFF_BADGE[m.difficulty]
                  return (
                    <div key={m.id} className="bg-white/5 border border-white/10 rounded-2xl p-4 sm:p-6 flex flex-col sm:flex-row gap-4 sm:gap-6 items-start sm:items-center hover:bg-white/10 transition-colors group">
                      <div className="w-12 h-12 sm:w-16 sm:h-16 rounded-xl sm:rounded-2xl bg-space-900 border border-white/5 flex items-center justify-center text-2xl sm:text-3xl shrink-0">
                        {m.objectEmoji}
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold tracking-wider uppercase border ${badge?.classes}`}>
                            {lang === 'ka' ? badge?.labelGe : badge?.label}
                          </span>
                          <span className="text-sm text-slate-400">+{m.points} XP</span>
                        </div>
                        <h3 className="text-base sm:text-lg font-bold text-white group-hover:text-space-accent transition-colors">
                          {lang === 'ka' ? m.titleGe : m.title}
                        </h3>
                        <p className="text-sm text-slate-400 mt-1 line-clamp-1">
                          {lang === 'ka' ? m.descriptionGe : m.description}
                        </p>
                      </div>
                      <Link
                        href="/missions"
                        className="w-full sm:w-auto px-5 sm:px-6 py-2.5 bg-space-accent/20 hover:bg-space-accent border border-space-accent/30 hover:border-space-accent text-white rounded-xl text-sm font-semibold transition-all text-center"
                      >
                        {lang === 'ka' ? 'მიღება' : 'Accept'}
                      </Link>
                    </div>
                  )
                })}
              </div>
            </div>

            {/* Leaderboard top 5 (1/3) */}
            <div className="relative">
              <div className="bg-[#15152F]/60 backdrop-blur-md border border-white/10 rounded-[2rem] p-5 sm:p-6 h-full flex flex-col">
                <div className="flex items-center justify-between mb-5 sm:mb-6 pb-5 sm:pb-6 border-b border-white/5">
                  <h2 className="text-lg sm:text-xl font-bold text-white flex items-center gap-2">
                    <Trophy size={18} className="text-space-accent" />
                    {lang === 'ka' ? 'ტოპ 5' : 'Top 5'}
                  </h2>
                  <Link href="/leaderboard" className="text-xs font-medium bg-white/5 hover:bg-white/10 px-3 py-1.5 rounded-lg border border-white/5 transition-colors text-slate-400 hover:text-white">
                    {lang === 'ka' ? 'სრული სია' : 'Full list'}
                  </Link>
                </div>

                <div className="space-y-1 flex-1">
                  {mockLeaderboard.map((user, idx) => (
                    <div
                      key={idx}
                      className={`flex items-center gap-3 sm:gap-4 p-3 rounded-xl transition-colors ${idx === 0 ? 'bg-space-accent/10 border border-space-accent/20 relative overflow-hidden' : 'hover:bg-white/5'}`}
                    >
                      {idx === 0 && <div className="absolute left-0 top-0 bottom-0 w-1 bg-space-accent" />}
                      <div className={`w-7 sm:w-8 text-center font-bold text-sm ${idx === 0 ? 'text-space-accent' : 'text-slate-500'}`}>{idx + 1}</div>
                      <div className={`w-9 h-9 sm:w-10 sm:h-10 rounded-full flex items-center justify-center text-white font-bold text-xs sm:text-sm shrink-0 ${idx === 0 ? 'bg-gradient-to-br from-space-accent to-space-glow border-2 border-space-800' : 'bg-slate-700'}`}>
                        {user.initials}
                      </div>
                      <div className="flex-1 min-w-0">
                        <h4 className={`text-sm font-bold truncate ${idx === 0 ? 'text-white' : 'text-slate-300'}`}>{user.display_name}</h4>
                        <p className="text-xs text-slate-500">{user.title}</p>
                      </div>
                      <div className="text-right shrink-0">
                        <div className={`text-sm font-bold ${idx === 0 ? 'text-white' : 'text-slate-300'}`}>{user.points.toLocaleString()}</div>
                        <div className={`text-[10px] font-medium ${idx === 0 ? 'text-space-accent' : 'text-slate-500'}`}>XP</div>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="mt-5 sm:mt-6 pt-5 sm:pt-6 border-t border-white/5 text-center">
                  <p className="text-sm text-slate-400">
                    {lang === 'ka' ? 'შენი პოზიცია: ' : 'Your position: '}
                    <Link href="/login" className="font-bold text-white hover:text-space-accent transition-colors">
                      {lang === 'ka' ? 'შედი' : 'Sign in'}
                    </Link>
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>
    </div>
  )
}
