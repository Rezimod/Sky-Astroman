'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import AstroLogo from '@/components/shared/AstroLogo'
import { useLanguage } from '@/contexts/LanguageContext'
import type { SkyConditions, GeneratedMission } from '@/lib/types'
import { Telescope, CheckCircle, Star, Cloud, Trophy, Camera, ArrowRight, Eye } from 'lucide-react'

interface ApodData {
  title: string
  url: string
  explanation: string
  date: string
  media_type: string
}

const DIFF_COLOR: Record<string, string> = {
  easy:   '#34d399',
  medium: '#FFD166',
  hard:   '#f87171',
  expert: '#c084fc',
}

const MOON_PHASE_LABEL = (phase: number): { en: string; ka: string } => {
  // phase 0–1 from Open-Meteo (0=new, 0.5=full)
  if (phase < 0.1) return { en: 'New Moon', ka: 'ახალმთვარე' }
  if (phase < 0.4) return { en: 'Crescent', ka: 'ნამგლისებური' }
  if (phase < 0.6) return { en: 'Full Moon', ka: 'სავსემთვარე' }
  if (phase < 0.9) return { en: 'Gibbous', ka: 'ოვალური' }
  return { en: 'New Moon', ka: 'ახალმთვარე' }
}

export default function LandingPage() {
  const { t, lang, setLang } = useLanguage()
  const [sky, setSky] = useState<SkyConditions | null>(null)
  const [missions, setMissions] = useState<GeneratedMission[]>([])
  const [apod, setApod] = useState<ApodData | null>(null)
  const [apodError, setApodError] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([
      fetch('/api/sky/conditions').then(r => r.json()).catch(() => null),
      fetch('/api/missions').then(r => r.json()).catch(() => []),
      fetch('/api/apod').then(r => r.json()).catch(() => null),
    ]).then(([skyData, missionData, apodData]) => {
      if (skyData && !skyData.error) setSky(skyData)
      if (Array.isArray(missionData)) setMissions(missionData)
      if (apodData && !apodData.error) setApod(apodData)
      else setApodError(true)
      setLoading(false)
    })
  }, [])

  const visibleObjects = sky?.planets?.filter(p => p.isVisible) ?? []
  const easyMissions = missions.filter(m => m.difficulty === 'easy' || m.difficulty === 'medium').slice(0, 4)
  const moonLabel = sky ? MOON_PHASE_LABEL(sky.moonPhase) : null

  return (
    <div className="min-h-screen flex flex-col">

      {/* ── Top bar ───────────────────────────────────────────── */}
      <header className="glass-nav sticky top-0 z-50">
        <div className="max-w-5xl mx-auto px-4 h-14 flex items-center justify-between">
          <AstroLogo heightClass="h-7" />
          <div className="flex items-center gap-2">
            {/* Language toggle */}
            <button
              onClick={() => setLang(lang === 'ka' ? 'en' : 'ka')}
              className="text-[11px] font-bold px-2.5 py-1 rounded-md border border-[var(--border-glass)] text-[var(--text-secondary)] hover:text-white hover:bg-white/5 transition-all tracking-wider"
            >
              {lang === 'ka' ? 'EN' : 'ქარ'}
            </button>
            <Link
              href="/missions"
              className="btn-primary text-xs font-bold px-4 py-2 rounded-lg"
            >
              {t('landing.startBtn')}
            </Link>
          </div>
        </div>
      </header>

      <div className="max-w-3xl mx-auto w-full px-4 flex flex-col gap-14 py-12 sm:py-20">

        {/* ── Hero ──────────────────────────────────────────────── */}
        <section className="flex flex-col items-center text-center gap-5">
          <span className="text-[10px] tracking-[0.3em] text-[var(--text-dim)] uppercase font-mono">
            {t('landing.tagline')}
          </span>
          <h1 className="text-4xl sm:text-5xl md:text-6xl font-bold leading-tight">
            <span className="text-[var(--text-secondary)]">{t('landing.heroLine1')}</span>
            <br />
            <span className="text-[#FFD166]">{t('landing.heroLine2')}</span>
          </h1>
          <p className="text-[var(--text-secondary)] max-w-md text-sm sm:text-base leading-relaxed">
            {t('landing.heroSub')}
          </p>

          {/* Live count pill */}
          {!loading && visibleObjects.length > 0 && (
            <div className="flex items-center gap-2 px-4 py-2 rounded-full border border-[rgba(52,211,153,0.2)] bg-[rgba(52,211,153,0.05)]">
              <span className="w-1.5 h-1.5 rounded-full bg-[#34d399] animate-pulse" />
              <span className="text-[#34d399] text-xs font-semibold">
                {visibleObjects.length} {t('landing.visibleCount')}
              </span>
            </div>
          )}

          <div className="flex flex-col sm:flex-row items-center gap-3">
            <Link href="/missions" className="btn-primary px-8 py-3.5 rounded-xl font-bold text-sm flex items-center gap-2 animate-pulse-glow">
              {t('landing.startBtn')} <ArrowRight size={15} />
            </Link>
            <Link href="/leaderboard" className="btn-ghost px-6 py-3.5 rounded-xl font-medium text-sm">
              {t('landing.leaderBtn')}
            </Link>
          </div>

          <div className="flex items-center gap-5 text-[11px] text-[var(--text-dim)] flex-wrap justify-center">
            <span className="flex items-center gap-1.5"><span className="w-1.5 h-1.5 rounded-full bg-[#34d399]" />{t('landing.free')}</span>
            <span className="flex items-center gap-1.5"><span className="w-1.5 h-1.5 rounded-full bg-[#FFD166]" />{t('landing.location')}</span>
            <span className="flex items-center gap-1.5"><span className="w-1.5 h-1.5 rounded-full bg-[#38F0FF]" />{t('landing.noCrypto')}</span>
          </div>
        </section>

        <div className="ornament-line w-full" />

        {/* ── Tonight's Sky ────────────────────────────────────── */}
        <section className="w-full">
          <div className="flex items-end justify-between mb-5">
            <div>
              <h2 className="text-xl font-bold text-white">{t('landing.tonightTitle')}</h2>
              <p className="text-xs text-[var(--text-dim)] mt-0.5">{t('landing.tonightSub')}</p>
            </div>
            {sky && (
              <div className="text-right text-xs text-[var(--text-secondary)]">
                <p>{sky.cloudCover}% {lang === 'ka' ? 'ღრუბლიანობა' : 'clouds'}</p>
                <p>{sky.temperature}°C · {moonLabel?.[lang]}</p>
              </div>
            )}
          </div>

          {loading ? (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="glass-card h-28 animate-pulse" />
              ))}
            </div>
          ) : visibleObjects.length === 0 ? (
            <div className="glass-card p-6 text-center text-sm text-[var(--text-secondary)]">
              {lang === 'ka' ? 'მონაცემები იტვირთება...' : 'Loading sky data...'}
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {visibleObjects.slice(0, 8).map(obj => (
                <div key={obj.id} className="glass-card p-4 flex flex-col items-center text-center gap-2">
                  <span className="text-2xl">{obj.emoji}</span>
                  <p className="text-white text-xs font-semibold leading-tight">
                    {lang === 'ka' ? obj.nameGe : obj.name}
                  </p>
                  <p className="text-[10px] text-[var(--text-dim)]">
                    {obj.maxAltitude}° · {obj.bestTime}
                  </p>
                  <span
                    className="text-[9px] font-bold px-2 py-0.5 rounded-full"
                    style={{ color: DIFF_COLOR[obj.difficulty], background: `${DIFF_COLOR[obj.difficulty]}15` }}
                  >
                    {t(`landing.${obj.difficulty}`)}
                  </span>
                </div>
              ))}
            </div>
          )}

          <div className="mt-3 text-right">
            <Link href="/sky-tools/conditions" className="text-xs text-[var(--accent-cyan)] hover:text-[#FFD166] transition-colors">
              {lang === 'ka' ? 'სრული ცის ინფო →' : 'Full sky conditions →'}
            </Link>
          </div>
        </section>

        <div className="ornament-line w-full" />

        {/* ── Tonight's Missions ───────────────────────────────── */}
        <section className="w-full">
          <div className="flex items-end justify-between mb-5">
            <div>
              <h2 className="text-xl font-bold text-white">{t('landing.missionsTitle')}</h2>
              <p className="text-xs text-[var(--text-dim)] mt-0.5">{t('landing.missionsSub')}</p>
            </div>
            <Link href="/missions" className="text-xs text-[var(--accent-cyan)] hover:text-[#FFD166] transition-colors">
              {t('landing.seeAll')}
            </Link>
          </div>

          {loading ? (
            <div className="grid grid-cols-2 gap-3">
              {[...Array(4)].map((_, i) => <div key={i} className="glass-card h-32 animate-pulse" />)}
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3">
              {easyMissions.map(m => (
                <div key={m.id} className="glass-card p-4 flex flex-col gap-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xl">{m.objectEmoji}</span>
                    <span
                      className="text-[9px] font-bold px-2 py-0.5 rounded-full"
                      style={{ color: DIFF_COLOR[m.difficulty], background: `${DIFF_COLOR[m.difficulty]}15` }}
                    >
                      {t(`landing.${m.difficulty}`)}
                    </span>
                  </div>
                  <p className="text-white text-xs font-semibold leading-tight">
                    {lang === 'ka' ? m.titleGe : m.title}
                  </p>
                  <p className="text-[10px] text-[var(--text-dim)]">
                    {m.bestTime} · {m.maxAltitude}°
                  </p>
                  <p className="text-[#FFD166] text-[11px] font-bold mt-auto">+{m.points} pts</p>
                </div>
              ))}
            </div>
          )}
        </section>

        <div className="ornament-line w-full" />

        {/* ── NASA APOD ────────────────────────────────────────── */}
        <section className="w-full">
          <h2 className="text-xl font-bold text-white mb-1">{t('landing.apodTitle')}</h2>
          <p className="text-xs text-[var(--text-dim)] mb-5">
            {apod?.date ?? (loading ? t('landing.apodLoading') : '')}
          </p>

          {loading ? (
            <div className="glass-card h-72 animate-pulse" />
          ) : apodError || !apod ? (
            <div className="glass-card p-8 text-center text-sm text-[var(--text-secondary)]">
              {t('landing.apodError')}
            </div>
          ) : apod.media_type === 'video' ? (
            <div className="glass-card overflow-hidden rounded-2xl">
              <div className="aspect-video">
                <iframe
                  src={apod.url}
                  className="w-full h-full"
                  allowFullScreen
                  title={apod.title}
                />
              </div>
              <div className="p-4">
                <p className="text-white font-semibold text-sm mb-2">{apod.title}</p>
                <p className="text-[var(--text-secondary)] text-xs leading-relaxed line-clamp-3">
                  {apod.explanation}
                </p>
              </div>
            </div>
          ) : (
            <div className="glass-card overflow-hidden rounded-2xl">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={apod.url}
                alt={apod.title}
                className="w-full object-cover max-h-96"
                loading="lazy"
              />
              <div className="p-4">
                <p className="text-white font-semibold text-sm mb-2">{apod.title}</p>
                <p className="text-[var(--text-secondary)] text-xs leading-relaxed line-clamp-4">
                  {apod.explanation}
                </p>
              </div>
            </div>
          )}
        </section>

        <div className="ornament-line w-full" />

        {/* ── How it works ─────────────────────────────────────── */}
        <section className="w-full">
          <h2 className="text-xl font-bold text-white text-center mb-6">{t('landing.howTitle')}</h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {[
              { icon: Cloud,     titleKey: 'landing.step1t', descKey: 'landing.step1d', color: '#38F0FF' },
              { icon: Telescope, titleKey: 'landing.step2t', descKey: 'landing.step2d', color: '#FFD166' },
              { icon: Camera,    titleKey: 'landing.step3t', descKey: 'landing.step3d', color: '#34d399' },
            ].map(({ icon: Icon, titleKey, descKey, color }, i) => (
              <div key={i} className="glass-card p-5 flex flex-col gap-3">
                <div
                  className="w-9 h-9 rounded-xl flex items-center justify-center"
                  style={{ background: `${color}12`, border: `1px solid ${color}25` }}
                >
                  <Icon size={18} style={{ color }} />
                </div>
                <p className="font-semibold text-sm text-white">{t(titleKey)}</p>
                <p className="text-xs text-[var(--text-secondary)] leading-relaxed">{t(descKey)}</p>
              </div>
            ))}
          </div>
        </section>

        <div className="ornament-line w-full" />

        {/* ── Final CTA ────────────────────────────────────────── */}
        <section className="flex flex-col items-center gap-4 text-center pb-4">
          <h2 className="text-xl font-bold text-white">{t('landing.ctaTitle')}</h2>
          <Link
            href="/missions"
            className="btn-primary px-12 py-4 rounded-xl font-bold text-sm animate-pulse-glow flex items-center gap-2"
          >
            {t('landing.ctaBtn')} <ArrowRight size={15} />
          </Link>
          <p className="text-[11px] text-[var(--text-dim)]">
            {lang === 'ka' ? 'Astroman · თბილისი · საქართველო' : 'Astroman · Tbilisi · Georgia'}
          </p>
        </section>

      </div>
    </div>
  )
}
