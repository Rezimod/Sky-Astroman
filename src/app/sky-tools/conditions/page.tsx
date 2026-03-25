'use client'
import { useEffect, useState } from 'react'
import { Cloud, Eye, Thermometer, Sunrise, Moon, Clock } from 'lucide-react'
import type { SkyConditions } from '@/lib/types'
import { useLanguage } from '@/contexts/LanguageContext'

const DIFF_COLOR: Record<string, string> = {
  easy:   '#34d399',
  medium: '#FFD166',
  hard:   '#f87171',
  expert: '#c084fc',
}

function SkyDataCard({ title, value, sub, icon: Icon, color = '#38F0FF' }: {
  title: string; value: string; sub?: string; icon: React.ElementType; color?: string
}) {
  return (
    <div className="glass-card p-4 flex flex-col gap-3">
      <div className="flex items-center gap-2">
        <Icon size={16} style={{ color }} />
        <span className="text-xs text-[var(--text-secondary)] uppercase tracking-wide font-medium">{title}</span>
      </div>
      <p className="text-2xl font-bold text-white">{value}</p>
      {sub && <p className="text-xs text-[var(--text-dim)]">{sub}</p>}
    </div>
  )
}

export default function SkyConditionsPage() {
  const { t, lang } = useLanguage()
  const [data, setData] = useState<SkyConditions | null>(null)
  const [loading, setLoading] = useState(true)
  const [lastUpdate, setLastUpdate] = useState('')

  useEffect(() => {
    loadConditions()
    const interval = setInterval(loadConditions, 30 * 60 * 1000)
    return () => clearInterval(interval)
  }, [])

  async function loadConditions() {
    try {
      const res = await fetch('/api/sky/conditions')
      if (!res.ok) throw new Error('Failed')
      const json = await res.json()
      setData(json)
      setLastUpdate(new Date().toLocaleTimeString(lang === 'ka' ? 'ka-GE' : 'en-US', { hour: '2-digit', minute: '2-digit' }))
    } catch {
      // silent fail
    } finally {
      setLoading(false)
    }
  }

  function moonPhaseLabel(phase: number): string {
    if (phase < 0.05 || phase > 0.95) return t('sky.newMoon')
    if (phase < 0.25) return t('sky.waxCrescent')
    if (phase < 0.30) return t('sky.firstQuarter')
    if (phase < 0.45) return t('sky.waxGibbous')
    if (phase < 0.55) return t('sky.fullMoon')
    if (phase < 0.70) return t('sky.wanGibbous')
    if (phase < 0.75) return t('sky.lastQuarter')
    return t('sky.wanCrescent')
  }

  function visibilityRating(cloud: number): { label: string; color: string } {
    if (cloud < 20) return { label: t('sky.excellent'), color: '#34d399' }
    if (cloud < 40) return { label: t('sky.good'),      color: '#38F0FF' }
    if (cloud < 70) return { label: t('sky.fair'),      color: '#FFD166' }
    return            { label: t('sky.poor'),            color: '#f87171' }
  }

  const vis = data ? visibilityRating(data.cloudCover) : null
  const visibleObjects = data?.planets?.filter(p => p.isVisible) ?? []

  return (
    <div className="max-w-3xl mx-auto px-4 py-6 animate-page-enter">
      <header className="mb-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-white">{t('sky.title')}</h1>
            <p className="text-sm text-[var(--text-secondary)]">{t('sky.subtitle')}</p>
          </div>
          {lastUpdate && (
            <p className="text-xs text-[var(--text-dim)]">{t('sky.updated')} {lastUpdate}</p>
          )}
        </div>
      </header>

      {loading && (
        <div className="glass-card p-8 text-center text-[var(--text-secondary)]">
          {t('sky.loading')}
        </div>
      )}

      {!loading && data && (
        <>
          {/* Visibility banner */}
          <div className="glass-card p-4 mb-4 flex items-center gap-4" style={{ borderColor: vis?.color + '33' }}>
            <div className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: vis?.color + '15' }}>
              <Eye size={22} style={{ color: vis?.color }} />
            </div>
            <div>
              <p className="font-bold text-white text-lg">{vis?.label}</p>
              <p className="text-sm text-[var(--text-secondary)]">
                {data.cloudCover}% {t('sky.clouds')} — {t('sky.bestAt')}: {data.bestViewingStart}–{data.bestViewingEnd}
              </p>
            </div>
          </div>

          {/* Data grid */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-4">
            <SkyDataCard
              title={t('sky.cloudCover')}
              value={`${data.cloudCover}%`}
              sub={`${100 - data.cloudCover}% ${t('sky.clearSky')}`}
              icon={Cloud} color="#38F0FF"
            />
            <SkyDataCard
              title={t('sky.visibility')}
              value={`${data.visibility} km`}
              sub={t('sky.horizVis')}
              icon={Eye} color="#34d399"
            />
            <SkyDataCard
              title={t('sky.temperature')}
              value={`${data.temperature}°C`}
              sub={t('sky.obsLevel')}
              icon={Thermometer} color="#FFD166"
            />
            <SkyDataCard
              title={t('sky.moonPhase')}
              value={moonPhaseLabel(data.moonPhase)}
              sub={`${Math.round(data.moonIllumination * 100)}% ${t('sky.illuminated')}`}
              icon={Moon} color="#FFD166"
            />
            <SkyDataCard
              title={t('sky.bestWindow')}
              value={data.bestViewingStart}
              sub={`${t('sky.until')} ${data.bestViewingEnd}`}
              icon={Clock} color="#7A5FFF"
            />
            <SkyDataCard
              title={t('sky.sunrise')}
              value={data.sunrise}
              sub={`${t('sky.sunsetAt')}: ${data.sunset}`}
              icon={Sunrise} color="#fb923c"
            />
          </div>

          {/* Moon phase visual */}
          <div className="glass-card p-5 mb-4">
            <p className="text-xs text-[var(--text-secondary)] uppercase tracking-widest mb-3 font-medium">
              {t('sky.moonProgress')}
            </p>
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-full flex-shrink-0" style={{
                background: `conic-gradient(#FFD166 ${data.moonPhase * 360}deg, rgba(255,209,102,0.1) 0deg)`,
                boxShadow: '0 0 16px rgba(255,209,102,0.2)',
              }} />
              <div>
                <p className="font-semibold text-white">{moonPhaseLabel(data.moonPhase)}</p>
                <p className="text-sm text-[var(--text-secondary)]">
                  {Math.round(data.moonIllumination * 100)}% {t('sky.illuminated')} — {data.moonPhase < 0.5 ? t('sky.waxing') : t('sky.waning')}
                </p>
              </div>
            </div>
            {data.moonIllumination > 0.7 && (
              <p className="mt-3 text-xs text-amber-400/80 bg-amber-400/5 border border-amber-400/20 rounded-lg px-3 py-2">
                {t('sky.brightMoon')}
              </p>
            )}
          </div>

          {/* Visible objects grid */}
          {visibleObjects.length > 0 && (
            <div className="glass-card p-5">
              <p className="text-xs text-[var(--text-secondary)] uppercase tracking-widest mb-4 font-medium">
                {t('sky.planetsTitle')}
              </p>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {visibleObjects.map(obj => (
                  <div key={obj.id} className="flex items-center gap-3 p-3 rounded-xl" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
                    <span className="text-2xl flex-shrink-0">{obj.emoji}</span>
                    <div className="min-w-0">
                      <p className="text-white text-xs font-semibold truncate">
                        {lang === 'ka' ? obj.nameGe : obj.name}
                      </p>
                      <p className="text-[10px] text-[var(--text-dim)]">{obj.maxAltitude}° · {obj.bestTime}</p>
                      <span
                        className="text-[9px] font-bold"
                        style={{ color: DIFF_COLOR[obj.difficulty] }}
                      >
                        {lang === 'ka'
                          ? ({ easy: 'მარტივი', medium: 'საშუალო', hard: 'რთული', expert: 'ექსპერტი' }[obj.difficulty])
                          : obj.difficulty}
                      </span>
                    </div>
                  </div>
                ))}
              </div>

              {/* Objects not visible */}
              {(data.planets?.filter(p => !p.isVisible) ?? []).length > 0 && (
                <div className="mt-3 pt-3 border-t border-[var(--border-glass)]">
                  <p className="text-[10px] text-[var(--text-dim)] mb-2">{t('sky.notVisible')}</p>
                  <div className="flex flex-wrap gap-2">
                    {(data.planets?.filter(p => !p.isVisible) ?? []).map(obj => (
                      <span key={obj.id} className="text-[10px] text-[var(--text-dim)] flex items-center gap-1 opacity-50">
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
