import Navigation from '@/components/layout/Navigation'
import CardWrapper from '@/components/layout/CardWrapper'
import { DEFAULT_LOCATION, OPEN_METEO_URL } from '@/lib/constants'
import type { SkyConditions } from '@/lib/types'

async function getSkyConditions(): Promise<SkyConditions | null> {
  try {
    const url = `${OPEN_METEO_URL}?latitude=${DEFAULT_LOCATION.lat}&longitude=${DEFAULT_LOCATION.lng}&hourly=cloud_cover,visibility,temperature_2m&daily=sunrise,sunset,moon_phase&current=cloud_cover,temperature_2m&timezone=Asia%2FTbilisi&forecast_days=1`
    const res = await fetch(url, { next: { revalidate: 1800 } })
    if (!res.ok) return null
    const data = await res.json()

    const currentHour = new Date().getHours()
    const cloudCover = data.current?.cloud_cover ?? data.hourly?.cloud_cover?.[currentHour] ?? 50
    const moonPhase = data.daily?.moon_phase?.[0] ?? 0.5

    return {
      cloudCover,
      visibility: Math.round((data.hourly?.visibility?.[currentHour] ?? 10000) / 1000),
      temperature: data.current?.temperature_2m ?? 15,
      moonPhase,
      moonIllumination: (1 - Math.cos(moonPhase * 2 * Math.PI)) / 2,
      sunrise: data.daily?.sunrise?.[0]?.slice(11, 16) ?? '06:30',
      sunset: data.daily?.sunset?.[0]?.slice(11, 16) ?? '19:45',
      bestViewingStart: '22:00',
      bestViewingEnd: '02:00',
    }
  } catch {
    return null
  }
}

export default async function SkyConditionsPage() {
  const conditions = await getSkyConditions()

  return (
    <div className="min-h-screen bg-[var(--bg-void)]">
      <div className="max-w-3xl mx-auto px-4 py-6 pb-24 sm:pb-6">
        <header className="mb-6">
          <h1 className="text-2xl font-bold text-[var(--text-primary)]">Sky Conditions</h1>
          <p className="text-sm text-[var(--text-secondary)]">{DEFAULT_LOCATION.name}</p>
        </header>

        <Navigation />

        {conditions ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 animate-page-enter">
            <CardWrapper glow="cyan">
              <h3 className="text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wider mb-3">Current Conditions</h3>
              <div className="space-y-2">
                <Metric label="Cloud Cover" value={`${conditions.cloudCover}%`} />
                <Metric label="Visibility" value={`${conditions.visibility} km`} />
                <Metric label="Temperature" value={`${conditions.temperature}°C`} />
              </div>
            </CardWrapper>

            <CardWrapper>
              <h3 className="text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wider mb-3">Moon</h3>
              <div className="space-y-2">
                <Metric label="Illumination" value={`${Math.round(conditions.moonIllumination * 100)}%`} />
                <Metric label="Phase" value={`${Math.round(conditions.moonPhase * 100)}%`} />
              </div>
            </CardWrapper>

            <CardWrapper>
              <h3 className="text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wider mb-3">Sun Times</h3>
              <div className="space-y-2">
                <Metric label="Sunrise" value={conditions.sunrise} />
                <Metric label="Sunset" value={conditions.sunset} />
              </div>
            </CardWrapper>

            <CardWrapper glow="gold">
              <h3 className="text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wider mb-3">Best Viewing Window</h3>
              <p className="text-xl font-bold text-[var(--accent-gold)]">
                {conditions.bestViewingStart} – {conditions.bestViewingEnd}
              </p>
              <p className="text-xs text-[var(--text-secondary)] mt-1">Local time, {DEFAULT_LOCATION.name}</p>
            </CardWrapper>
          </div>
        ) : (
          <div className="glass-card p-8 text-center">
            <p className="text-[var(--text-secondary)]">Unable to load sky conditions. Check your connection.</p>
          </div>
        )}
      </div>
    </div>
  )
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between items-center">
      <span className="text-sm text-[var(--text-secondary)]">{label}</span>
      <span className="text-sm font-semibold text-[var(--text-primary)]">{value}</span>
    </div>
  )
}
