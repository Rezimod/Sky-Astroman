'use client'
import { useEffect, useState, useCallback } from 'react'
import { Cloud, Wind, Droplets, Eye, Thermometer, Moon, RefreshCw, ArrowRight, Circle, ChevronLeft, LayoutDashboard } from 'lucide-react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useLanguage } from '@/contexts/LanguageContext'
import { computeSkyScore } from '@/lib/skyScore'
import type { VisibleObject } from '@/lib/astronomy'

// moon_phase is NOT a valid Open-Meteo daily param → removed to avoid 400 errors
const METEO_URL =
  'https://api.open-meteo.com/v1/forecast' +
  '?latitude=41.7151&longitude=44.8271' +
  '&current=temperature_2m,relative_humidity_2m,wind_speed_10m,cloud_cover' +
  '&hourly=cloud_cover,visibility,temperature_2m' +
  '&daily=sunrise,sunset' +
  '&timezone=Asia%2FTbilisi&forecast_days=2'

// Simple moon phase: days since known new moon / lunar cycle length
function getMoonPhase(): number {
  const knownNew = new Date('2024-01-11').getTime()
  const cycle    = 29.53058867 * 24 * 60 * 60 * 1000
  return ((Date.now() - knownNew) % cycle) / cycle
}

interface WeatherData {
  cloudCover: number
  humidity: number
  windSpeed: number
  temperature: number
  visibility: number
  moonPhase: number
  sunrise: string
  sunset: string
  hourly: { hour: number; label: string; cloudCover: number; temp: number }[]
}

function parseMeteo(d: any): WeatherData {
  const hour = new Date().getHours()
  const cloudCover  = d.current?.cloud_cover          ?? d.hourly?.cloud_cover?.[hour]    ?? 50
  const humidity    = d.current?.relative_humidity_2m ?? 60
  const windSpeed   = Math.round(d.current?.wind_speed_10m ?? 0)
  const temperature = Math.round(d.current?.temperature_2m ?? d.hourly?.temperature_2m?.[hour] ?? 15)
  const visRaw      = d.hourly?.visibility?.[hour] ?? 10000
  const visibility  = Math.round(visRaw / 1000)
  const moonPhase   = getMoonPhase()
  const sunrise     = d.daily?.sunrise?.[0]?.slice(11, 16) ?? '06:30'
  const sunset      = d.daily?.sunset?.[0]?.slice(11, 16)  ?? '20:00'

  // Tonight's hours: 20→05 across the 48h forecast
  const times: string[] = d.hourly?.time ?? []
  const clouds: number[] = d.hourly?.cloud_cover ?? []
  const temps: number[]  = d.hourly?.temperature_2m ?? []
  const targetHours = [20, 21, 22, 23, 0, 1, 2, 3, 4, 5]

  // For post-midnight hours (0-5), look in day 2 (indices 24-47)
  const now = new Date()
  const isPastMidnight = now.getHours() < 6
  const hourly = targetHours.flatMap(h => {
    // Post-midnight hours (0-5): look in day 2 portion if we're in the evening,
    // or day 1 portion if we're already past midnight
    const dayOffset = (!isPastMidnight && h < 12) ? 24 : 0
    const idx = times.findIndex((t, i) => i >= dayOffset && t.endsWith(`T${String(h).padStart(2,'0')}:00`))
    if (idx === -1) return []
    return [{ hour: h, label: `${String(h).padStart(2,'0')}:00`, cloudCover: clouds[idx] ?? 50, temp: Math.round(temps[idx] ?? temperature) }]
  })

  return { cloudCover, humidity, windSpeed, temperature, visibility, moonPhase, sunrise, sunset, hourly }
}

function moonPhaseName(phase: number, lang: string): string {
  const phases: Record<string, { en: string; ka: string }> = {
    new:      { en: 'New Moon',       ka: 'ახალმთვარე'    },
    waxCres:  { en: 'Wax. Crescent',  ka: 'ნამგლისებური'  },
    firstQ:   { en: 'First Quarter',  ka: 'პირველი კვარტ.' },
    waxGibb:  { en: 'Wax. Gibbous',   ka: 'ოვალური'       },
    full:     { en: 'Full Moon',      ka: 'სავსემთვარე'   },
    wanGibb:  { en: 'Wan. Gibbous',   ka: 'ოვალური'       },
    lastQ:    { en: 'Last Quarter',   ka: 'ბოლო კვარტ.'   },
    wanCres:  { en: 'Wan. Crescent',  ka: 'ნამგლისებური'  },
  }
  let key = 'new'
  if (phase < 0.05 || phase > 0.95) key = 'new'
  else if (phase < 0.25) key = 'waxCres'
  else if (phase < 0.30) key = 'firstQ'
  else if (phase < 0.45) key = 'waxGibb'
  else if (phase < 0.55) key = 'full'
  else if (phase < 0.70) key = 'wanGibb'
  else if (phase < 0.75) key = 'lastQ'
  else key = 'wanCres'
  return lang === 'ka' ? phases[key].ka : phases[key].en
}

function MoonSVG({ phase }: { phase: number }) {
  // Draw a crescent/gibbous/full moon using SVG clip paths
  const illum = Math.sin(phase * Math.PI)
  const isWaxing = phase < 0.5
  const isFull = Math.abs(phase - 0.5) < 0.05
  const isNew  = phase < 0.05 || phase > 0.95

  if (isNew) {
    return (
      <svg width="64" height="64" viewBox="0 0 64 64">
        <circle cx="32" cy="32" r="28" fill="rgba(255,255,255,0.06)" stroke="rgba(255,255,255,0.15)" strokeWidth="1" />
        <circle cx="32" cy="32" r="3" fill="rgba(255,255,255,0.2)" />
      </svg>
    )
  }
  if (isFull) {
    return (
      <svg width="64" height="64" viewBox="0 0 64 64">
        <circle cx="32" cy="32" r="28" fill="#FFD166" opacity="0.9" />
        <circle cx="32" cy="32" r="28" fill="none" stroke="#FFD166" strokeWidth="1" opacity="0.5" />
      </svg>
    )
  }
  // Crescent/gibbous: use overlapping circles
  const dx = (1 - illum * 2) * 28 * (isWaxing ? -1 : 1)
  return (
    <svg width="64" height="64" viewBox="0 0 64 64">
      <defs>
        <mask id="moonMask">
          <circle cx="32" cy="32" r="28" fill="white" />
          <circle cx={32 + dx} cy="32" r="28" fill="black" />
        </mask>
      </defs>
      <circle cx="32" cy="32" r="28" fill="rgba(255,255,255,0.08)" />
      <circle cx="32" cy="32" r="28" fill="#FFD166" opacity="0.85" mask="url(#moonMask)" />
    </svg>
  )
}

function SkyGauge({ score, color, label }: { score: number; color: string; label: string }) {
  const r = 58
  const circ = 2 * Math.PI * r
  const dash = (score / 100) * circ
  return (
    <div className="relative flex items-center justify-center" style={{ width: 160, height: 160 }}>
      <svg width="160" height="160" viewBox="0 0 160 160">
        <circle cx="80" cy="80" r={r} fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="8" />
        <circle
          cx="80" cy="80" r={r} fill="none"
          stroke={color} strokeWidth="8" strokeLinecap="round"
          strokeDasharray={`${dash} ${circ}`}
          transform="rotate(-90 80 80)"
          style={{ transition: 'stroke-dasharray 1.4s ease, stroke 0.6s ease' }}
        />
      </svg>
      <div className="absolute text-center pointer-events-none">
        <div className="text-5xl font-bold text-white leading-none">{score}</div>
        <div className="text-[11px] font-bold tracking-widest mt-1.5 uppercase" style={{ color }}>{label}</div>
      </div>
    </div>
  )
}

const DIFF_COLORS: Record<string, string> = {
  easy: '#34d399', medium: '#FFD166', hard: '#f87171', expert: '#c084fc',
}

export default function SkyConditionsPage() {
  const { lang } = useLanguage()
  const router = useRouter()
  const [weather, setWeather] = useState<WeatherData | null>(null)
  const [planets, setPlanets] = useState<VisibleObject[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)
  const [lastUpdate, setLastUpdate] = useState('')
  const [refreshing, setRefreshing] = useState(false)

  const load = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true)
    else setLoading(true)
    setError(false)

    // Weather fetch — primary, blocking
    try {
      const res = await fetch(METEO_URL)
      if (res.ok) {
        const d = await res.json()
        setWeather(parseMeteo(d))
      } else {
        setError(true)
      }
    } catch {
      setError(true)
    }

    setLastUpdate(new Date().toLocaleTimeString(lang === 'ka' ? 'ka-GE' : 'en-US', { hour: '2-digit', minute: '2-digit' }))
    setLoading(false)
    setRefreshing(false)

    // Planets fetch — secondary, non-blocking, silent on failure
    fetch('/api/sky/conditions')
      .then(r => r.ok ? r.json() : null)
      .then(cond => { if (cond?.planets) setPlanets(cond.planets) })
      .catch(() => {})
  }, [lang])

  useEffect(() => {
    load()
    const iv = setInterval(() => load(), 30 * 60 * 1000)
    return () => clearInterval(iv)
  }, [load])

  const moonIllum  = weather ? Math.sin(weather.moonPhase * Math.PI) : 0
  const score = weather ? computeSkyScore({
    cloudCover:       weather.cloudCover,
    humidity:         weather.humidity,
    windSpeed:        weather.windSpeed,
    visibility:       weather.visibility,
    moonIllumination: moonIllum,
  }) : null

  const visiblePlanets = planets.filter(p => p.isVisible)
  const hiddenPlanets  = planets.filter(p => !p.isVisible)

  const bestHour = weather?.hourly.reduce((best, h) => h.cloudCover < best.cloudCover ? h : best, weather.hourly[0])

  return (
    <div className="max-w-5xl mx-auto px-3 sm:px-4 lg:px-6 py-4 sm:py-6 pb-24 sm:pb-8 animate-page-enter">

      {/* Page header */}
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
          {lang === 'ka' ? 'ცის პირობები' : 'Sky Conditions'}
        </h1>
        <div className="absolute right-0 flex items-center gap-2">
          <button
            onClick={() => load(true)}
            disabled={loading || refreshing}
            className="flex items-center gap-1.5 text-[11px] font-bold px-3 py-1.5 rounded-full transition-all disabled:opacity-40"
            style={{ background: 'rgba(99,102,241,0.1)', color: '#818CF8', border: '1px solid rgba(99,102,241,0.2)' }}
          >
            <RefreshCw size={12} className={refreshing ? 'animate-spin' : ''} />
            <span className="hidden sm:inline">{lang === 'ka' ? 'განახლება' : 'Refresh'}</span>
          </button>
          <Link
            href="/dashboard"
            className="w-9 h-9 rounded-full flex items-center justify-center transition-all hover:bg-white/[0.08]"
            style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}
          >
            <LayoutDashboard size={15} className="text-[#94A3B8]" />
          </Link>
        </div>
      </div>

      {/* Loading skeleton */}
      {loading && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-3 sm:gap-4">
          <div className="card p-6 h-56 animate-pulse" />
          <div className="lg:col-span-2 space-y-3">
            <div className="grid grid-cols-3 gap-3">
              {[...Array(6)].map((_, i) => <div key={i} className="card h-24 animate-pulse" />)}
            </div>
          </div>
        </div>
      )}

      {/* Error state */}
      {!loading && error && !weather && (
        <div className="card p-8 text-center">
          <div className="text-[#475569] mb-3">
            {lang === 'ka' ? 'ამინდის მონაცემები ვერ ჩაიტვირთა' : 'Could not load weather data'}
          </div>
          <button
            onClick={() => load()}
            className="text-[11px] font-bold px-4 py-2 rounded"
            style={{ background: '#6366F1', color: 'white' }}
          >
            {lang === 'ka' ? 'სცადე ახლავე' : 'Retry'}
          </button>
        </div>
      )}

      {/* Main content */}
      {!loading && weather && score && (
        <div className="space-y-3 sm:space-y-4">

          {/* Row 1: Sky score + conditions grid */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-3 sm:gap-4">

            {/* Sky score card */}
            <div className="lg:col-span-4 card p-6 flex flex-col items-center justify-center" style={{ borderColor: score.color + '30' }}>
              <span className="text-[10px] font-bold tracking-[0.15em] text-[#64748B] uppercase mb-5 block self-start">
                {lang === 'ka' ? 'ცის ქულა' : 'Sky Score'}
              </span>
              <SkyGauge score={score.score} color={score.color} label={lang === 'ka' ? score.label.ka : score.label.en} />

              {/* Breakdown */}
              <div className="mt-5 w-full space-y-2">
                {(Object.entries(score.breakdown) as [string, number][])
                  .filter(([, v]) => v > 0)
                  .map(([key, val]) => {
                    const labels: Record<string, { en: string; ka: string }> = {
                      clouds:     { en: 'Cloud cover', ka: 'ღრუბლები'  },
                      humidity:   { en: 'Humidity',    ka: 'ტენიანობა' },
                      wind:       { en: 'Wind',        ka: 'ქარი'      },
                      visibility: { en: 'Visibility',  ka: 'მხილვადობა'},
                      moon:       { en: 'Moon',        ka: 'მთვარე'    },
                    }
                    return (
                      <div key={key} className="flex items-center justify-between text-[11px]">
                        <span className="text-[#64748B]">{lang === 'ka' ? labels[key]?.ka : labels[key]?.en}</span>
                        <div className="flex items-center gap-2">
                          <div className="w-16 h-1 rounded-full bg-white/[0.05] overflow-hidden">
                            <div className="h-full rounded-full bg-red-400/60" style={{ width: `${Math.min(100, val * 2.5)}%` }} />
                          </div>
                          <span className="text-red-400 font-bold w-8 text-right">-{val}</span>
                        </div>
                      </div>
                    )
                  })
                }
                {Object.values(score.breakdown).every(v => v === 0) && (
                  <p className="text-center text-[11px] text-[#34d399] font-bold">
                    {lang === 'ka' ? 'ყველა პარამეტრი იდეალურია' : 'All parameters optimal'}
                  </p>
                )}
              </div>
            </div>

            {/* Stats grid 2×3 */}
            <div className="lg:col-span-8 grid grid-cols-2 sm:grid-cols-3 gap-3">
              {[
                { Icon: Cloud,       val: `${weather.cloudCover}%`,      label_en: 'Cloud Cover',   label_ka: 'ღრუბლიანობა', sub: `${100 - weather.cloudCover}% clear`,  color: '#38F0FF' },
                { Icon: Eye,         val: `${weather.visibility} km`,    label_en: 'Visibility',    label_ka: 'მხილვადობა',   sub: 'Horizontal',                          color: '#34d399' },
                { Icon: Thermometer, val: `${weather.temperature}°C`,    label_en: 'Temperature',   label_ka: 'ტემპერატურა', sub: 'At ground level',                     color: '#FFD166' },
                { Icon: Droplets,    val: `${weather.humidity}%`,        label_en: 'Humidity',      label_ka: 'ტენიანობა',    sub: 'Relative humidity',                   color: '#7A5FFF' },
                { Icon: Wind,        val: `${weather.windSpeed} km/h`,   label_en: 'Wind Speed',    label_ka: 'ქარი',         sub: weather.windSpeed < 15 ? 'Calm' : weather.windSpeed < 30 ? 'Moderate' : 'Strong', color: '#fb923c' },
                { Icon: Moon,        val: moonPhaseName(weather.moonPhase, lang), label_en: 'Moon Phase', label_ka: 'მთვარე', sub: `${Math.round(moonIllum * 100)}% illuminated`, color: '#FFD166' },
              ].map(s => (
                <div key={s.label_en} className="card p-4 flex flex-col gap-1.5">
                  <div className="flex items-center gap-1.5">
                    <s.Icon size={13} style={{ color: s.color }} />
                    <span className="text-[10px] text-[#64748B] uppercase tracking-wider font-bold">
                      {lang === 'ka' ? s.label_ka : s.label_en}
                    </span>
                  </div>
                  <p className="text-xl font-bold text-white">{s.val}</p>
                  <p className="text-[10px] text-[#475569]">{s.sub}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Row 2: Moon + Hourly forecast */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">

            {/* Moon card */}
            <div className="card p-5">
              <span className="text-[10px] font-bold tracking-[0.15em] text-[#64748B] uppercase block mb-4">
                {lang === 'ka' ? 'მთვარის ფაზა' : 'Moon Phase'}
              </span>
              <div className="flex items-center gap-5">
                <div className="flex-shrink-0 drop-shadow-[0_0_16px_rgba(255,209,102,0.3)]">
                  <MoonSVG phase={weather.moonPhase} />
                </div>
                <div className="flex-1">
                  <p className="text-base font-bold text-white mb-1">{moonPhaseName(weather.moonPhase, lang)}</p>
                  <p className="text-xs text-[#64748B] mb-3">
                    {Math.round(moonIllum * 100)}% {lang === 'ka' ? 'განათებული' : 'illuminated'} ·{' '}
                    {weather.moonPhase < 0.5 ? (lang === 'ka' ? 'მზარდი' : 'Waxing') : (lang === 'ka' ? 'კვდომადი' : 'Waning')}
                  </p>
                  <div className="h-1.5 rounded-full bg-white/[0.05] overflow-hidden mb-3">
                    <div className="h-full rounded-full transition-all duration-700"
                      style={{ width: `${Math.round(moonIllum * 100)}%`, background: '#FFD166' }} />
                  </div>
                  <div className="grid grid-cols-2 gap-x-4 text-[11px] text-[#64748B]">
                    <span>{lang === 'ka' ? 'მზის ამოსვლა' : 'Sunrise'}: <span className="text-white font-bold">{weather.sunrise}</span></span>
                    <span>{lang === 'ka' ? 'მზის ჩასვლა' : 'Sunset'}: <span className="text-white font-bold">{weather.sunset}</span></span>
                  </div>
                </div>
              </div>
              {moonIllum > 0.7 && (
                <div className="mt-4 text-xs text-amber-400 bg-amber-400/5 border border-amber-400/15 rounded-lg px-3 py-2">
                  {lang === 'ka'
                    ? 'ნათელი მთვარე ხელს გიშლის სუსტ ობიექტებზე დაკვირვებაში'
                    : 'Bright moon reduces visibility of faint objects'}
                </div>
              )}
            </div>

            {/* Hourly forecast */}
            {weather.hourly.length > 0 ? (
              <div className="card p-5">
                <div className="flex items-center justify-between mb-4">
                  <span className="text-[10px] font-bold tracking-[0.15em] text-[#64748B] uppercase">
                    {lang === 'ka' ? 'ყოველსაათური · ღამე' : 'Hourly Forecast · Tonight'}
                  </span>
                  {bestHour && (
                    <span className="text-[10px] font-bold text-[#34d399]">
                      {lang === 'ka' ? 'საუკეთესო:' : 'Best:'} {bestHour.label}
                    </span>
                  )}
                </div>
                <div className="flex items-end gap-1 h-20 mb-2">
                  {weather.hourly.map(h => {
                    const pct   = h.cloudCover
                    const barH  = Math.max(4, Math.round((pct / 100) * 72))
                    const color = pct < 30 ? '#34d399' : pct < 60 ? '#FFD166' : '#f87171'
                    const isBest = h === bestHour
                    return (
                      <div key={h.label} className="flex-1 flex flex-col items-center gap-0.5 group">
                        <span className="text-[8px] text-[#475569] group-hover:text-white transition-colors">{pct}%</span>
                        <div
                          className="w-full rounded-sm transition-all"
                          style={{
                            height: `${barH}px`,
                            background: isBest ? color : color + '99',
                            minWidth: 5,
                            boxShadow: isBest ? `0 0 8px ${color}66` : 'none',
                          }}
                        />
                      </div>
                    )
                  })}
                </div>
                <div className="flex justify-between text-[8px] text-[#475569] mb-3">
                  {weather.hourly.filter((_, i) => i % 2 === 0).map(h => (
                    <span key={h.label}>{h.label}</span>
                  ))}
                </div>
                <div className="flex items-center gap-4 text-[10px] text-[#475569]">
                  <span className="flex items-center gap-1"><span className="w-2 h-1.5 rounded-sm bg-[#34d399] inline-block" />{lang === 'ka' ? 'სუფთა' : 'Clear'}</span>
                  <span className="flex items-center gap-1"><span className="w-2 h-1.5 rounded-sm bg-[#FFD166] inline-block" />{lang === 'ka' ? 'ნაწილობრივ' : 'Partly'}</span>
                  <span className="flex items-center gap-1"><span className="w-2 h-1.5 rounded-sm bg-[#f87171] inline-block" />{lang === 'ka' ? 'ღრუბლიანი' : 'Cloudy'}</span>
                </div>
              </div>
            ) : (
              <div className="card p-5 flex items-center justify-center text-[#475569] text-sm">
                {lang === 'ka' ? 'პროგნოზი მიუწვდომელია' : 'Forecast unavailable'}
              </div>
            )}
          </div>

          {/* Row 3: Best viewing window */}
          {bestHour && (
            <div
              className="card p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center gap-4"
              style={{ borderColor: 'rgba(52,211,153,0.25)', background: 'rgba(52,211,153,0.03)' }}
            >
              <div className="flex items-center gap-3 flex-1">
                <div className="w-10 h-10 rounded-full bg-[#34d399]/10 border border-[#34d399]/20 flex items-center justify-center flex-shrink-0">
                  <Circle size={14} className="text-[#34d399]" />
                </div>
                <div>
                  <span className="text-[10px] font-bold tracking-[0.15em] text-[#34d399] uppercase block">
                    {lang === 'ka' ? 'საუკეთესო დაკვირვების დრო' : 'Best Viewing Window'}
                  </span>
                  <p className="text-white font-bold">
                    {bestHour.label} · {bestHour.cloudCover}% {lang === 'ka' ? 'ღრუბლიანობა' : 'cloud cover'} · {bestHour.temp}°C
                  </p>
                </div>
              </div>
              <Link
                href="/missions"
                className="flex items-center gap-1.5 text-[11px] font-bold px-4 py-2 rounded self-start sm:self-auto"
                style={{ background: 'rgba(52,211,153,0.1)', color: '#34d399', border: '1px solid rgba(52,211,153,0.25)' }}
              >
                {lang === 'ka' ? 'მისიები' : 'View Missions'} <ArrowRight size={12} />
              </Link>
            </div>
          )}

          {/* Row 4: Visible planets/objects */}
          {planets.length > 0 && (
            <div className="card p-5">
              <div className="flex items-center justify-between mb-4">
                <span className="text-[10px] font-bold tracking-[0.15em] text-[#64748B] uppercase">
                  {lang === 'ka' ? 'ხილული ობიექტები' : 'Visible Tonight'}
                </span>
                <span className="text-[10px] font-bold text-[#34d399]">
                  {visiblePlanets.length} {lang === 'ka' ? 'ხილული' : 'visible'}
                </span>
              </div>

              {visiblePlanets.length > 0 ? (
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 mb-4">
                  {visiblePlanets.map(obj => (
                    <div
                      key={obj.id}
                      className="rounded-lg p-3 flex items-center gap-3 transition-colors hover:border-white/10"
                      style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)' }}
                    >
                      <span className="text-2xl flex-shrink-0">{obj.emoji}</span>
                      <div className="min-w-0">
                        <p className="text-white text-xs font-bold truncate">{lang === 'ka' ? obj.nameGe : obj.name}</p>
                        <p className="text-[10px] text-[#475569] mt-0.5">{obj.maxAltitude}° · {obj.bestTime}</p>
                        <span
                          className="text-[9px] font-bold uppercase tracking-wide"
                          style={{ color: DIFF_COLORS[obj.difficulty] }}
                        >
                          {lang === 'ka'
                            ? ({ easy:'მარტ.', medium:'საშ.', hard:'რთ.', expert:'ექს.' }[obj.difficulty] ?? obj.difficulty)
                            : obj.difficulty}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-[#475569] mb-4">
                  {lang === 'ka' ? 'ამ ღამეს ხილული ობიექტები არ არის' : 'No bright objects visible right now'}
                </p>
              )}

              {hiddenPlanets.length > 0 && (
                <div className="border-t border-white/[0.05] pt-3">
                  <p className="text-[10px] text-[#475569] mb-2 font-bold uppercase tracking-wider">
                    {lang === 'ka' ? 'ამჟამად არ ჩანს' : 'Not visible now'}
                  </p>
                  <div className="flex flex-wrap gap-3">
                    {hiddenPlanets.map(obj => (
                      <span key={obj.id} className="text-[11px] text-[#334155] flex items-center gap-1.5 opacity-50">
                        <span>{obj.emoji}</span>
                        <span>{lang === 'ka' ? obj.nameGe : obj.name}</span>
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
