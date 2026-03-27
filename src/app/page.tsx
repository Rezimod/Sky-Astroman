'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Cloud, Moon, MapPin, Target, Trophy, ArrowRight, Star, Sparkles, Globe, Circle, User } from 'lucide-react'
import { SaturnLogo } from '@/components/shared/SaturnLogo'
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
  { display_name: 'გიორგი მაისურაძე', title: 'ვარსკვლავთმრიცხველი', points: 8450 },
  { display_name: 'ნინო დოლიძე',       title: 'ასტროფოტოგრაფი',    points: 7200 },
  { display_name: 'ლევან ჭანტურია',    title: 'დამწყები',           points: 6800 },
  { display_name: 'ანა გიორგაძე',      title: 'დამწყები',           points: 5100 },
  { display_name: 'თორნიკე კაპანაძე',  title: 'დამწყები',           points: 4950 },
]

const OPEN_METEO = 'https://api.open-meteo.com/v1/forecast?latitude=41.7151&longitude=44.8271&hourly=cloud_cover,visibility,temperature_2m&daily=sunrise,sunset&current=cloud_cover,temperature_2m&timezone=Asia%2FTbilisi&forecast_days=1'

function getMoonPhase(): number {
  const knownNew = new Date('2024-01-11').getTime()
  const cycle = 29.53058867 * 24 * 60 * 60 * 1000
  return ((Date.now() - knownNew) % cycle) / cycle
}

const EMOJI_ICON: Record<string, React.ElementType> = {
  '🌕': Moon, '🌙': Moon, '⭐': Star, '🪐': Globe, '🔴': Circle, '⚫': Circle,
  '🔵': Circle, '💫': Sparkles, '✨': Star, '🌌': Target, '🔮': Star, '🔭': Target,
}

const howSteps = [
  { Icon: Star,   titleKey: 'landing.step1t', descKey: 'landing.step1d' },
  { Icon: Cloud,  titleKey: 'landing.step2t', descKey: 'landing.step2d' },
  { Icon: Target, titleKey: 'landing.step3t', descKey: 'landing.step3d' },
  { Icon: Trophy, titleKey: 'landing.step4t', descKey: 'landing.step4d' },
]

export default function LandingPage() {
  const { t, lang, setLang } = useLanguage()
  const [sky, setSky] = useState<SkyConditions | null>(null)
  const [missions, setMissions] = useState<GeneratedMission[]>([])
  const [apod, setApod] = useState<{ title: string; url: string; hdurl?: string; explanation: string; date: string; media_type: string } | null>(null)
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
        }
        const phase = getMoonPhase()
        skyData.moonPhase = phase
        skyData.moonIllumination = Math.sin(phase * Math.PI)
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
    <div className="min-h-screen flex flex-col overflow-x-hidden relative">

      {/* Fixed background glow blobs */}
      <div className="fixed top-[-20%] left-[-10%] w-[50vw] h-[50vw] rounded-full bg-[#6366F1]/20 blur-[120px] mix-blend-screen z-0 pointer-events-none" />
      <div className="fixed bottom-[-20%] right-[-10%] w-[60vw] h-[60vw] rounded-full bg-[#A855F7]/10 blur-[150px] mix-blend-screen z-0 pointer-events-none" />

      {/* Header */}
      <header className="relative z-50 border-b border-white/10 bg-space-900/50 backdrop-blur-xl sticky top-0">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2 shrink-0">
            <SaturnLogo width={34} height={26} />
            <span className="text-xs font-bold tracking-[0.18em] text-white uppercase">
              Sky<span className="text-[#6366F1]">watcher</span>
            </span>
          </Link>
          <nav className="hidden md:flex items-center gap-6">
            <Link href="/missions" className="text-xs font-medium text-slate-400 hover:text-white transition-colors tracking-wide">
              {lang === 'ka' ? 'მისიები' : 'Missions'}
            </Link>
            <Link href="/leaderboard" className="text-xs font-medium text-slate-400 hover:text-white transition-colors tracking-wide">
              {lang === 'ka' ? 'რეიტინგი' : 'Ranks'}
            </Link>
          </nav>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setLang(lang === 'ka' ? 'en' : 'ka')}
              className="text-[10px] font-bold px-2.5 py-1 rounded-full border border-white/10 bg-white/5 text-slate-400 hover:text-white hover:bg-white/10 transition-all tracking-widest"
            >
              {lang === 'ka' ? 'EN' : 'ქარ'}
            </button>
            <Link href="/login" className="hidden sm:block text-xs font-medium text-slate-400 hover:text-white transition-colors px-3 py-1.5">
              {lang === 'ka' ? 'შესვლა' : 'Sign in'}
            </Link>
            <Link
              href="/login"
              className="bg-space-accent hover:bg-indigo-500 text-white text-xs font-bold px-4 py-2 rounded-full transition-all shadow-[0_0_16px_rgba(99,102,241,0.4)]"
            >
              {lang === 'ka' ? 'დაწყება' : 'Start'}
            </Link>
          </div>
        </div>
      </header>

      <main className="relative z-10 w-full">

        {/* Hero */}
        <section className="max-w-7xl mx-auto px-4 sm:px-6 pt-12 pb-16">
          <div className="grid lg:grid-cols-2 gap-10 lg:gap-16 items-center">

            {/* Left */}
            <div className="space-y-5">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/5 border border-white/10 text-[11px] font-medium text-space-accent">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-space-accent opacity-75" />
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-space-accent" />
                </span>
                {lang === 'ka' ? 'რეალურ დროში მონაცემები' : 'Real-time data'}
              </div>

              <h1 className="text-4xl sm:text-5xl font-bold text-white leading-[1.1] tracking-tight">
                {lang === 'ka'
                  ? <><span className="text-transparent bg-clip-text bg-gradient-to-r from-space-accent to-space-glow">ღამის ცა</span><br />ახლა</>
                  : <>{t('landing.heroLine1')}<br /><span className="text-transparent bg-clip-text bg-gradient-to-r from-space-accent to-space-glow">{t('landing.heroLine2')}</span></>
                }
              </h1>

              <p className="text-sm text-slate-400 max-w-md leading-relaxed">
                {t('landing.heroSub')}
              </p>

              <div className="flex flex-wrap items-center gap-3 pt-2">
                <Link
                  href="/register"
                  className="bg-white hover:bg-slate-100 text-[#0B0B1A] text-sm font-bold px-6 py-3 rounded-full transition-all flex items-center gap-2"
                >
                  {lang === 'ka' ? 'რეგისტრაცია' : 'Get started'}
                  <ArrowRight size={15} />
                </Link>
                <Link
                  href="/leaderboard"
                  className="bg-white/5 hover:bg-white/10 text-white border border-white/10 text-sm font-medium px-6 py-3 rounded-full transition-all flex items-center gap-2"
                >
                  <Trophy size={14} className="text-space-accent" />
                  {lang === 'ka' ? 'რეიტინგი' : 'Ranks'}
                </Link>
              </div>
            </div>

            {/* Right — sky conditions card */}
            <div className="relative mt-2 lg:mt-0">
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[110%] h-[110%] rounded-full border border-white/5 pointer-events-none" />
              <div className="relative z-10 bg-[#12122b]/80 backdrop-blur-2xl border border-white/10 rounded-[2rem] p-6 shadow-2xl shadow-space-accent/10">
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <h3 className="text-white font-semibold text-base">{lang === 'ka' ? 'ცის მდგომარეობა' : 'Sky conditions'}</h3>
                    <p className="text-xs text-slate-400 flex items-center gap-1 mt-0.5">
                      <MapPin size={11} className="text-space-accent" /> {lang === 'ka' ? 'თბილისი, საქართველო' : 'Tbilisi, Georgia'}
                    </p>
                  </div>
                  {!loading && visibleCount > 0 && (
                    <div className="flex items-center gap-1.5 text-[11px] text-green-400 bg-green-500/10 border border-green-500/20 px-3 py-1 rounded-full">
                      <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
                      {visibleCount} {lang === 'ka' ? 'ხილული' : 'visible'}
                    </div>
                  )}
                </div>

                {/* Gauge */}
                <div className="flex flex-col items-center mb-6">
                  <div className="relative w-40 h-40 flex items-center justify-center">
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
                      <span className="text-4xl font-bold text-white block">{loading ? '—' : (skyScore ?? '—')}</span>
                      <span className="text-[10px] uppercase tracking-widest text-slate-400 mt-1 block">{lang === 'ka' ? 'ცის შეფასება' : 'Sky score'}</span>
                    </div>
                  </div>
                  {!loading && skyScore !== null && (
                    <div className={`mt-3 px-4 py-1 rounded-full text-xs font-medium flex items-center gap-1.5 border ${
                      skyScore >= 70 ? 'bg-green-500/10 text-green-400 border-green-500/20' :
                      skyScore >= 40 ? 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20' :
                      'bg-red-500/10 text-red-400 border-red-500/20'
                    }`}>
                      {skyScore >= 70
                        ? (lang === 'ka' ? 'იდეალური პირობები' : 'Excellent')
                        : skyScore >= 40
                        ? (lang === 'ka' ? 'საშუალო' : 'Fair')
                        : (lang === 'ka' ? 'ცუდი პირობები' : 'Poor')}
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-white/5 rounded-xl p-3 border border-white/5 flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-full bg-blue-500/10 text-blue-400 flex items-center justify-center shrink-0">
                      <Cloud size={15} />
                    </div>
                    <div>
                      <span className="text-lg font-bold text-white block leading-tight">
                        {loading ? '—' : `${sky?.cloudCover ?? '—'}%`}
                      </span>
                      <span className="text-[10px] text-slate-400">{lang === 'ka' ? 'ღრუბლიანობა' : 'Cloud cover'}</span>
                    </div>
                  </div>
                  <div className="bg-white/5 rounded-xl p-3 border border-white/5 flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-full bg-yellow-500/10 text-yellow-400 flex items-center justify-center shrink-0">
                      <Moon size={15} />
                    </div>
                    <div className="min-w-0">
                      <span className="text-sm font-bold text-white block leading-tight truncate">
                        {loading ? '—' : (moonLabel?.[lang] ?? '—')}
                      </span>
                      <span className="text-[10px] text-slate-400">{lang === 'ka' ? 'მთვარის ფაზა' : 'Moon phase'}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* NASA APOD */}
        {apod && (
          <section className="max-w-7xl mx-auto px-4 sm:px-6 py-10 border-t border-white/5">
            <div className="flex items-center justify-between gap-4 mb-5">
              <div className="flex items-center gap-2">
                <Star size={13} className="text-space-accent" />
                <span className="text-xs font-bold uppercase tracking-widest text-space-accent">NASA</span>
                <span className="text-sm font-bold text-white">{lang === 'ka' ? 'დღის სურათი' : 'Picture of the Day'}</span>
              </div>
              <span className="text-xs text-slate-500">{apod.date}</span>
            </div>
            <div className="grid lg:grid-cols-5 gap-5 items-start">
              <div className="lg:col-span-3 relative rounded-2xl overflow-hidden border border-white/10 group">
                <img src={apod.url} alt={apod.title} className="w-full object-cover aspect-video group-hover:scale-105 transition-transform duration-700" loading="lazy" />
                <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-space-900/90 to-transparent">
                  <h3 className="text-white font-bold text-sm">{apod.title}</h3>
                </div>
              </div>
              <div className="lg:col-span-2 space-y-3">
                <p className="text-xs text-slate-400 leading-relaxed line-clamp-5">{apod.explanation}</p>
                {apod.hdurl && (
                  <a href={apod.hdurl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 text-xs font-semibold text-space-accent hover:text-indigo-400 transition-colors">
                    {lang === 'ka' ? 'HD ვერსია' : 'View HD'} <ArrowRight size={12} />
                  </a>
                )}
              </div>
            </div>
          </section>
        )}

        {/* How it works */}
        <section className="max-w-7xl mx-auto px-4 sm:px-6 py-10 border-t border-white/5">
          <div className="text-center mb-8">
            <h2 className="text-xl font-bold text-white mb-1">{t('landing.howTitle')}</h2>
            <p className="text-xs text-slate-500">{lang === 'ka' ? 'ოთხი მარტივი ნაბიჯი' : 'Four simple steps'}</p>
          </div>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            {howSteps.map((step, i) => (
              <div key={i} className="relative group">
                <div className="absolute inset-0 bg-gradient-to-b from-space-accent/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity rounded-2xl -z-10 blur-xl" />
                <div className="bg-white/5 border border-white/10 rounded-2xl p-4 h-full hover:-translate-y-1 transition-transform duration-300">
                  <div className="w-9 h-9 rounded-xl bg-space-800 border border-white/10 flex items-center justify-center text-space-accent mb-3 shadow-lg">
                    <step.Icon size={17} />
                  </div>
                  <h3 className="text-sm font-bold text-white mb-1.5">{i + 1}. {t(step.titleKey)}</h3>
                  <p className="text-[11px] text-slate-400 leading-relaxed line-clamp-3">{t(step.descKey)}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Missions + Leaderboard */}
        <section className="max-w-7xl mx-auto px-4 sm:px-6 py-10 border-t border-white/5">
          <div className="grid lg:grid-cols-3 gap-6">

            {/* Missions (2/3) */}
            <div className="lg:col-span-2">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h2 className="text-base font-bold text-white flex items-center gap-1.5">
                    <Target size={16} className="text-space-accent" />
                    {t('landing.missionsTitle')}
                  </h2>
                  <p className="text-[11px] text-slate-500 mt-0.5">{t('landing.missionsSub')}</p>
                </div>
                <Link href="/missions" className="text-[11px] font-medium text-space-accent hover:text-white transition-colors">
                  {t('landing.seeAll')} →
                </Link>
              </div>

              <div className="grid grid-cols-2 gap-3">
                {loading ? (
                  [...Array(4)].map((_, i) => (
                    <div key={i} className="bg-white/5 border border-white/10 rounded-xl h-44 animate-pulse" />
                  ))
                ) : topMissions.map(m => {
                  const badge = DIFF_BADGE[m.difficulty]
                  const Icon = EMOJI_ICON[m.objectEmoji] ?? Star
                  return (
                    <div key={m.id} className="bg-white/5 border border-white/10 rounded-xl p-4 flex flex-col gap-2.5 hover:bg-white/10 transition-colors group">
                      <div className="w-10 h-10 rounded-xl bg-[#6366F1]/10 border border-[#6366F1]/20 flex items-center justify-center shrink-0">
                        <Icon size={17} className="text-[#818CF8]" />
                      </div>
                      <div>
                        <div className="flex items-center gap-1.5 mb-1">
                          <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold uppercase border ${badge?.classes}`}>
                            {lang === 'ka' ? badge?.labelGe : badge?.label}
                          </span>
                          <span className="text-[10px] text-slate-400">+{m.points} XP</span>
                        </div>
                        <h3 className="text-sm font-bold text-white line-clamp-1 group-hover:text-space-accent transition-colors">
                          {lang === 'ka' ? m.titleGe : m.title}
                        </h3>
                        <p className="text-[11px] text-slate-400 line-clamp-2 mt-1 leading-relaxed">
                          {lang === 'ka' ? m.descriptionGe : m.description}
                        </p>
                      </div>
                      <Link
                        href="/missions"
                        className="text-[11px] font-bold py-2 bg-white/10 hover:bg-space-accent rounded-lg text-white text-center transition-all mt-auto"
                      >
                        {lang === 'ka' ? 'მიღება' : 'Accept'}
                      </Link>
                    </div>
                  )
                })}
              </div>
            </div>

            {/* Leaderboard top 5 */}
            <div className="relative">
              <div className="bg-[#15152F]/60 backdrop-blur-md border border-white/10 rounded-[1.5rem] p-5 h-full flex flex-col">
                <div className="flex items-center justify-between mb-4 pb-4 border-b border-white/5">
                  <h2 className="text-sm font-bold text-white flex items-center gap-1.5">
                    <Trophy size={15} className="text-space-accent" />
                    {lang === 'ka' ? 'ტოპ 5' : 'Top 5'}
                  </h2>
                  <Link href="/leaderboard" className="text-[10px] font-medium bg-white/5 hover:bg-white/10 px-2.5 py-1 rounded-lg border border-white/5 transition-colors text-slate-400 hover:text-white">
                    {lang === 'ka' ? 'სრული სია' : 'Full list'}
                  </Link>
                </div>

                <div className="space-y-0.5 flex-1">
                  {mockLeaderboard.map((user, idx) => (
                    <div
                      key={idx}
                      className={`flex items-center gap-3 p-2.5 rounded-xl transition-colors ${idx === 0 ? 'bg-space-accent/10 border border-space-accent/20 relative overflow-hidden' : 'hover:bg-white/5'}`}
                    >
                      {idx === 0 && <div className="absolute left-0 top-0 bottom-0 w-1 bg-space-accent" />}
                      <div className={`w-6 text-center font-bold text-xs ${idx === 0 ? 'text-space-accent' : 'text-slate-500'}`}>{idx + 1}</div>
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${idx === 0 ? 'bg-gradient-to-br from-space-accent to-space-glow border-2 border-space-800' : 'bg-slate-700/50 border border-white/10'}`}>
                        <User size={12} className={idx === 0 ? 'text-white' : 'text-slate-400'} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h4 className={`text-xs font-bold truncate ${idx === 0 ? 'text-white' : 'text-slate-300'}`}>{user.display_name}</h4>
                        <p className="text-[10px] text-slate-500 truncate">{user.title}</p>
                      </div>
                      <div className="text-right shrink-0">
                        <div className={`text-xs font-bold ${idx === 0 ? 'text-white' : 'text-slate-300'}`}>{user.points.toLocaleString()}</div>
                        <div className={`text-[9px] font-medium ${idx === 0 ? 'text-space-accent' : 'text-slate-500'}`}>XP</div>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="mt-4 pt-4 border-t border-white/5 text-center">
                  <p className="text-xs text-slate-400">
                    {lang === 'ka' ? 'შენი პოზიცია: ' : 'Your rank: '}
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

      {/* Footer */}
      <footer className="border-t border-white/10 bg-space-900 relative z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-10">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-8 mb-8">

            {/* Brand */}
            <div>
              <div className="flex items-center gap-2 mb-3">
                <SaturnLogo width={32} height={24} />
                <span className="text-sm font-bold tracking-widest text-white uppercase">Skywatcher</span>
              </div>
              <p className="text-xs text-slate-500 leading-relaxed max-w-[220px]">
                {lang === 'ka'
                  ? 'საქართველოს ასტრონომიული საზოგადოების პლატფორმა'
                  : "Georgia's astronomy community platform"}
              </p>
            </div>

            {/* Links */}
            <div>
              <h4 className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-3">
                {lang === 'ka' ? 'ბმულები' : 'Links'}
              </h4>
              <div className="space-y-2">
                <a href="https://astroman.ge" target="_blank" rel="noopener noreferrer" className="block text-xs text-slate-500 hover:text-white transition-colors">
                  astroman.ge
                </a>
                <Link href="/terms" className="block text-xs text-slate-500 hover:text-white transition-colors">
                  {lang === 'ka' ? 'წესები და პირობები' : 'Terms & Conditions'}
                </Link>
              </div>
            </div>

            {/* Social */}
            <div>
              <h4 className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-3">
                {lang === 'ka' ? 'სოციალური' : 'Social'}
              </h4>
              <div className="flex gap-2">
                <a
                  href="https://facebook.com/astroman.ge"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-9 h-9 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-slate-400 hover:text-white hover:bg-white/10 transition-all"
                  aria-label="Facebook"
                >
                  <svg width="15" height="15" fill="currentColor" viewBox="0 0 24 24"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/></svg>
                </a>
                <a
                  href="https://instagram.com/astroman.ge"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-9 h-9 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-slate-400 hover:text-white hover:bg-white/10 transition-all"
                  aria-label="Instagram"
                >
                  <svg width="15" height="15" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/></svg>
                </a>
              </div>
            </div>
          </div>

          <div className="border-t border-white/5 pt-6 flex flex-col sm:flex-row items-center justify-between gap-3">
            <p className="text-[11px] text-slate-500">
              © {new Date().getFullYear()} Skywatcher · {lang === 'ka' ? 'ყველა უფლება დაცულია' : 'All rights reserved'}
            </p>
            <Link href="/terms" className="text-[11px] text-slate-500 hover:text-white transition-colors">
              {lang === 'ka' ? 'წესები და პირობები' : 'Terms & Conditions'}
            </Link>
          </div>
        </div>
      </footer>
    </div>
  )
}
