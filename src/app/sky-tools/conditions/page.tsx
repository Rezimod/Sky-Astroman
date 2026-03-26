'use client'
import { useEffect, useState } from 'react'
import { Cloud, Wind, Droplets, Eye, Thermometer, Moon, Clock, Star } from 'lucide-react'
import { useLanguage } from '@/contexts/LanguageContext'
import { fetchLiveWeather, type LiveWeather } from '@/lib/weather'
import { computeSkyScore } from '@/lib/skyScore'
import { getTonightsObjects, type VisibleObject } from '@/lib/astronomy'

const DIFF_COLOR: Record<string, string> = {
  easy: '#34d399', medium: '#FFD166', hard: '#f87171', expert: '#c084fc',
}

function moonPhaseIcon(phase: number): string {
  if (phase < 0.05 || phase > 0.95) return '🌑'
  if (phase < 0.25) return '🌒'
  if (phase < 0.30) return '🌓'
  if (phase < 0.45) return '🌔'
  if (phase < 0.55) return '🌕'
  if (phase < 0.70) return '🌖'
  if (phase < 0.75) return '🌗'
  return '🌘'
}

function StatCard({ icon: Icon, title, value, sub, color = '#38F0FF' }: {
  icon: React.ElementType; title: string; value: string; sub?: string; color?: string
}) {
  return (
    <div className="glass-card p-4 flex flex-col gap-2">
      <div className="flex items-center gap-2">
        <Icon size={14} style={{ color }} />
        <span className="text-[10px] text-[var(--text-secondary)] uppercase tracking-wider font-medium">{title}</span>
      </div>
      <p className="text-xl font-bold text-white">{value}</p>
      {sub && <p className="text-[11px] text-[var(--text-dim)]">{sub}</p>}
    </div>
  )
}

export default function SkyConditionsPage() {
  const { t, lang } = useLanguage()
  const [weather, setWeather] = useState<LiveWeather | null>(null)
  const [planets, setPlanets] = useState<VisibleObject[]>([])
  const [loading, setLoading] = useState(true)
  const [lastUpdate, setLastUpdate] = useState('')

  useEffect(() => {
    load()
    const iv = setInterval(load, 10 * 60 * 1000) // refresh every 10 min
    return () => clearInterval(iv)
  }, [])

  async function load() {
    setLoading(true)
    const [w] = await Promise.all([
      fetchLiveWeather(),
    ])
    if (w) setWeather(w)
    // planets from API route (server-side astronomy calc)
    try {
      const res = await fetch('/api/sky/conditions')
      const json = await res.json()
      if (json.planets) setPlanets(json.planets)
    } catch {}
    setLastUpdate(new Date().toLocaleTimeString(lang === 'ka' ? 'ka-GE' : 'en-US', { hour: '2-digit', minute: '2-digit' }))
    setLoading(false)
  }

  const score = weather ? computeSkyScore({
    cloudCover:       weather.cloudCover,
    humidity:         weather.humidity,
    windSpeed:        weather.windSpeed,
    visibility:       weather.visibility,
    moonIllumination: Math.sin(weather.moonPhase * Math.PI),
  }) : null

  const moonIllum = weather ? Math.sin(weather.moonPhase * Math.PI) : 0

  function moonLabel(phase: number): string {
    if (phase < 0.05 || phase > 0.95) return t('sky.newMoon')
    if (phase < 0.25) return t('sky.waxCrescent')
    if (phase < 0.30) return t('sky.firstQuarter')
    if (phase < 0.45) return t('sky.waxGibbous')
    if (phase < 0.55) return t('sky.fullMoon')
    if (phase < 0.70) return t('sky.wanGibbous')
    if (phase < 0.75) return t('sky.lastQuarter')
    return t('sky.wanCrescent')
  }

  const visibleObjects = planets.filter(p => p.isVisible)

  return (
    <div className="max-w-3xl mx-auto px-4 py-6 animate-page-enter flex flex-col gap-5">
      {/* Header */}
      <header className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">{t('sky.title')}</h1>
          <p className="text-sm text-[var(--text-secondary)]">{t('sky.subtitle')}</p>
        </div>
        {lastUpdate && (
          <p className="text-xs text-[var(--text-dim)] text-right mt-1">{t('sky.updated')} {lastUpdate}</p>
        )}
      </header>

      {loading && !weather && (
        <div className="glass-card p-8 text-center text-[var(--text-secondary)] text-sm">{t('sky.loading')}</div>
      )}

      {weather && score && (
        <>
          {/* Sky Score */}
          <div className="glass-card p-5 flex items-center gap-6" style={{ borderColor: score.color + '40' }}>
            <div className="relative flex-shrink-0">
              <svg width="80" height="80" viewBox="0 0 80 80">
                <circle cx="40" cy="40" r="34" fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="7" />
                <circle
                  cx="40" cy="40" r="34" fill="none"
                  stroke={score.color} strokeWidth="7"
                  strokeDasharray={`${(score.score / 100) * 213.6} 213.6`}
                  strokeLinecap="round"
                  transform="rotate(-90 40 40)"
                  style={{ transition: 'stroke-dasharray 1s ease' }}
                />
              </svg>
              <span className="absolute inset-0 flex items-center justify-center text-xl font-bold text-white">{score.score}</span>
            </div>
            <div className="flex-1">
              <p className="text-2xl font-bold" style={{ color: score.color }}>{lang === 'ka' ? score.label.ka : score.label.en}</p>
              <p className="text-sm text-[var(--text-secondary)] mt-0.5">
                {lang === 'ka' ? 'ცის პირობები ამ წამს' : 'Sky quality right now'}
              </p>
              <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1">
                {[
                  { label: lang === 'ka' ? 'ღრუბლები' : 'Clouds',     val: `-${score.breakdown.clouds}` },
                  { label: lang === 'ka' ? 'ტენიანობა' : 'Humidity',   val: `-${score.breakdown.humidity}` },
                  { label: lang === 'ka' ? 'ქარი' : 'Wind',           val: `-${score.breakdown.wind}` },
                  { label: lang === 'ka' ? 'მხილვადობა' : 'Vis.',      val: `-${score.breakdown.visibility}` },
                  { label: lang === 'ka' ? 'მთვარე' : 'Moon',          val: `-${score.breakdown.moon}` },
                ].filter(b => parseInt(b.val) < 0).map(b => (
                  <span key={b.label} className="text-[10px] text-[var(--text-dim)]">{b.label} <span className="text-red-400">{b.val}</span></span>
                ))}
              </div>
            </div>
          </div>

          {/* Current conditions grid */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            <StatCard icon={Cloud}       title={t('sky.cloudCover')}   value={`${weather.cloudCover}%`}    sub={`${100 - weather.cloudCover}% ${t('sky.clearSky')}`}     color="#38F0FF" />
            <StatCard icon={Eye}         title={t('sky.visibility')}   value={`${weather.visibility} km`}  sub={t('sky.horizVis')}                                        color="#34d399" />
            <StatCard icon={Thermometer} title={t('sky.temperature')}  value={`${weather.temperature}°C`} sub={t('sky.obsLevel')}                                        color="#FFD166" />
            <StatCard icon={Droplets}    title={lang === 'ka' ? 'ტენიანობა' : 'Humidity'}      value={`${weather.humidity}%`}       sub={lang === 'ka' ? 'ჰაერის ტენიანობა' : 'Air humidity'} color="#7A5FFF" />
            <StatCard icon={Wind}        title={lang === 'ka' ? 'ქარი' : 'Wind Speed'}         value={`${weather.windSpeed} km/h`}  sub={lang === 'ka' ? 'ქარის სიჩქარე' : 'Wind speed'}       color="#fb923c" />
            <StatCard icon={Moon}        title={t('sky.moonPhase')}    value={moonLabel(weather.moonPhase)} sub={`${Math.round(moonIllum * 100)}% ${t('sky.illuminated')}`} color="#FFD166" />
          </div>

          {/* Moon card */}
          <div className="glass-card p-5">
            <p className="text-xs text-[var(--text-secondary)] uppercase tracking-widest mb-4 font-medium">{t('sky.moonProgress')}</p>
            <div className="flex items-center gap-5">
              <span className="text-5xl flex-shrink-0">{moonPhaseIcon(weather.moonPhase)}</span>
              <div className="flex-1">
                <p className="font-bold text-white text-lg">{moonLabel(weather.moonPhase)}</p>
                <p className="text-sm text-[var(--text-secondary)]">
                  {Math.round(moonIllum * 100)}% {t('sky.illuminated')} · {weather.moonPhase < 0.5 ? t('sky.waxing') : t('sky.waning')}
                </p>
                <div className="mt-2 h-1.5 rounded-full bg-white/5 overflow-hidden w-48">
                  <div className="h-full rounded-full bg-[#FFD166]" style={{ width: `${Math.round(moonIllum * 100)}%` }} />
                </div>
              </div>
              <div className="text-right text-xs text-[var(--text-dim)]">
                <p>{t('sky.sunrise')}: <span className="text-white">{weather.sunrise}</span></p>
                <p>{t('sky.sunsetAt')}: <span className="text-white">{weather.sunset}</span></p>
              </div>
            </div>
            {moonIllum > 0.7 && (
              <p className="mt-3 text-xs text-amber-400/80 bg-amber-400/5 border border-amber-400/20 rounded-lg px-3 py-2">
                {t('sky.brightMoon')}
              </p>
            )}
          </div>

          {/* Hourly tonight forecast */}
          {weather.hourly.length > 0 && (
            <div className="glass-card p-5">
              <p className="text-xs text-[var(--text-secondary)] uppercase tracking-widest mb-4 font-medium">
                {lang === 'ka' ? 'ყოველსაათური პროგნოზი — ღამე' : 'Hourly Forecast — Tonight'}
              </p>
              <div className="flex items-end gap-1.5 h-24">
                {weather.hourly.map(h => {
                  const pct = h.cloudCover
                  const barH = Math.max(4, Math.round((pct / 100) * 80))
                  const color = pct < 30 ? '#34d399' : pct < 60 ? '#FFD166' : '#f87171'
                  return (
                    <div key={h.timeLabel} className="flex-1 flex flex-col items-center gap-1">
                      <span className="text-[8px] text-[var(--text-dim)]">{pct}%</span>
                      <div className="w-full rounded-sm" style={{ height: `${barH}px`, background: color + 'cc', minWidth: 6 }} />
                      <span className="text-[8px] text-[var(--text-dim)]">{h.timeLabel}</span>
                    </div>
                  )
                })}
              </div>
              <div className="mt-3 flex items-center gap-4 text-[10px] text-[var(--text-dim)]">
                <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-sm bg-[#34d399] inline-block" /> {lang === 'ka' ? 'სუფთა' : 'Clear'} &lt;30%</span>
                <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-sm bg-[#FFD166] inline-block" /> {lang === 'ka' ? 'ნაწილობრივ' : 'Partly'} 30–60%</span>
                <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-sm bg-[#f87171] inline-block" /> {lang === 'ka' ? 'ღრუბლიანი' : 'Cloudy'} &gt;60%</span>
              </div>
            </div>
          )}

          {/* Visible planets */}
          {visibleObjects.length > 0 && (
            <div className="glass-card p-5">
              <p className="text-xs text-[var(--text-secondary)] uppercase tracking-widest mb-4 font-medium">{t('sky.planetsTitle')}</p>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {visibleObjects.map(obj => (
                  <div key={obj.id} className="flex items-center gap-3 p-3 rounded-xl" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
                    <span className="text-2xl flex-shrink-0">{obj.emoji}</span>
                    <div className="min-w-0">
                      <p className="text-white text-xs font-semibold truncate">{lang === 'ka' ? obj.nameGe : obj.name}</p>
                      <p className="text-[10px] text-[var(--text-dim)]">{obj.maxAltitude}° · {obj.bestTime}</p>
                      <span className="text-[9px] font-bold" style={{ color: DIFF_COLOR[obj.difficulty] }}>
                        {lang === 'ka' ? ({ easy: 'მარტივი', medium: 'საშუალო', hard: 'რთული', expert: 'ექსპერტი' }[obj.difficulty] ?? obj.difficulty) : obj.difficulty}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
              {planets.filter(p => !p.isVisible).length > 0 && (
                <div className="mt-3 pt-3 border-t border-[var(--border-glass)]">
                  <p className="text-[10px] text-[var(--text-dim)] mb-2">{t('sky.notVisible')}</p>
                  <div className="flex flex-wrap gap-2">
                    {planets.filter(p => !p.isVisible).map(obj => (
                      <span key={obj.id} className="text-[10px] text-[var(--text-dim)] opacity-50">
                        {obj.emoji} {lang === 'ka' ? obj.nameGe : obj.name}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </>
      )}
    </div>
  )
}
