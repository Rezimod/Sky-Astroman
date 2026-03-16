'use client'
import { useEffect, useState } from 'react'
import { Cloud, Eye, Thermometer, Sunrise, Moon, Clock } from 'lucide-react'
import type { SkyConditions } from '@/lib/types'

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

function MoonPhaseLabel(phase: number): string {
  if (phase < 0.05 || phase > 0.95) return 'New Moon'
  if (phase < 0.25) return 'Waxing Crescent'
  if (phase < 0.3) return 'First Quarter'
  if (phase < 0.45) return 'Waxing Gibbous'
  if (phase < 0.55) return 'Full Moon'
  if (phase < 0.7) return 'Waning Gibbous'
  if (phase < 0.75) return 'Last Quarter'
  return 'Waning Crescent'
}

function VisibilityRating(cloud: number): { label: string; color: string } {
  if (cloud < 20) return { label: 'Excellent', color: '#34d399' }
  if (cloud < 40) return { label: 'Good', color: '#38F0FF' }
  if (cloud < 70) return { label: 'Fair', color: '#FFD166' }
  return { label: 'Poor', color: '#f87171' }
}

export default function SkyConditionsPage() {
  const [data, setData] = useState<SkyConditions | null>(null)
  const [loading, setLoading] = useState(true)
  const [lastUpdate, setLastUpdate] = useState<string>('')

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
      setLastUpdate(new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }))
    } catch {
      // Use fallback
    } finally {
      setLoading(false)
    }
  }

  const vis = data ? VisibilityRating(data.cloudCover) : null

  return (
    <div className="max-w-3xl mx-auto px-4 py-6 animate-page-enter">
      <header className="mb-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-white">Tonight&apos;s Sky</h1>
            <p className="text-sm text-[var(--text-secondary)]">Tbilisi, Georgia · 41.7°N, 44.8°E</p>
          </div>
          {lastUpdate && <p className="text-xs text-[var(--text-dim)]">Updated {lastUpdate}</p>}
        </div>
      </header>

      {loading && (
        <div className="glass-card p-8 text-center text-[var(--text-secondary)]">Loading sky data...</div>
      )}

      {!loading && data && (
        <>
          {/* Visibility banner */}
          <div className="glass-card p-4 mb-4 flex items-center gap-4" style={{ borderColor: vis?.color + '33' }}>
            <div className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: vis?.color + '15' }}>
              <Eye size={22} style={{ color: vis?.color }} />
            </div>
            <div>
              <p className="font-bold text-white text-lg">{vis?.label} Viewing Conditions</p>
              <p className="text-sm text-[var(--text-secondary)]">{data.cloudCover}% cloud cover — best window: {data.bestViewingStart}–{data.bestViewingEnd}</p>
            </div>
          </div>

          {/* Data grid */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-4">
            <SkyDataCard
              title="Cloud Cover"
              value={`${data.cloudCover}%`}
              sub={`${100 - data.cloudCover}% clear sky`}
              icon={Cloud}
              color="#38F0FF"
            />
            <SkyDataCard
              title="Visibility"
              value={`${data.visibility} km`}
              sub="Horizontal visibility"
              icon={Eye}
              color="#34d399"
            />
            <SkyDataCard
              title="Temperature"
              value={`${data.temperature}°C`}
              sub="At observation level"
              icon={Thermometer}
              color="#FFD166"
            />
            <SkyDataCard
              title="Moon Phase"
              value={MoonPhaseLabel(data.moonPhase)}
              sub={`${Math.round(data.moonIllumination * 100)}% illuminated`}
              icon={Moon}
              color="#FFD166"
            />
            <SkyDataCard
              title="Best Window"
              value={data.bestViewingStart}
              sub={`Until ${data.bestViewingEnd}`}
              icon={Clock}
              color="#7A5FFF"
            />
            <SkyDataCard
              title="Sunrise"
              value={data.sunrise}
              sub={`Sunset: ${data.sunset}`}
              icon={Sunrise}
              color="#fb923c"
            />
          </div>

          {/* Moon phase visual */}
          <div className="glass-card p-5">
            <p className="text-xs text-[var(--text-secondary)] uppercase tracking-widest mb-3 font-medium">Moon Phase Progress</p>
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-full flex-shrink-0" style={{
                background: `conic-gradient(#FFD166 ${data.moonPhase * 360}deg, rgba(255,209,102,0.1) 0deg)`,
                boxShadow: '0 0 16px rgba(255,209,102,0.2)',
              }} />
              <div>
                <p className="font-semibold text-white">{MoonPhaseLabel(data.moonPhase)}</p>
                <p className="text-sm text-[var(--text-secondary)]">{Math.round(data.moonIllumination * 100)}% illuminated — {data.moonPhase < 0.5 ? 'Waxing' : 'Waning'}</p>
              </div>
            </div>
            {data.moonIllumination > 0.7 && (
              <p className="mt-3 text-xs text-amber-400/80 bg-amber-400/5 border border-amber-400/20 rounded-lg px-3 py-2">
                ⚠️ Bright moon tonight — deep sky objects will be washed out. Good night for planets and the Moon itself.
              </p>
            )}
          </div>
        </>
      )}
    </div>
  )
}
