import { NextRequest, NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'
import { DEFAULT_LOCATION, OPEN_METEO_URL } from '@/lib/constants'
import { getTonightsObjects } from '@/lib/astronomy'
import type { SkyConditions } from '@/lib/types'

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const lat = parseFloat(searchParams.get('lat') ?? String(DEFAULT_LOCATION.lat))
    const lng = parseFloat(searchParams.get('lng') ?? String(DEFAULT_LOCATION.lng))

    const url = `${OPEN_METEO_URL}?latitude=${lat}&longitude=${lng}&hourly=cloud_cover,visibility,temperature_2m&daily=sunrise,sunset&current=cloud_cover,temperature_2m&timezone=Asia%2FTbilisi&forecast_days=1`

    const res = await fetch(url, { cache: 'no-store' })
    if (!res.ok) throw new Error('Open-Meteo fetch failed')

    const data = await res.json()

    // Vercel servers run in UTC — Tbilisi is always UTC+4 (no DST)
    const currentHour = (new Date().getUTCHours() + 4) % 24
    const cloudCover = data.current?.cloud_cover ?? data.hourly?.cloud_cover?.[currentHour] ?? 50
    const visibility = data.hourly?.visibility?.[currentHour] ?? 10000
    const temperature = data.current?.temperature_2m ?? data.hourly?.temperature_2m?.[currentHour] ?? 15

    // moon_phase is not a valid Open-Meteo param — calculate via astronomy-engine
    const { MoonPhase } = await import('astronomy-engine')
    const moonPhaseAngle = MoonPhase(new Date()) // 0–360 degrees
    const moonPhase = moonPhaseAngle / 360

    const nightHours = [21, 22, 23, 0, 1, 2, 3, 4]
    let bestStart = '21:00'
    let bestEnd = '23:00'
    if (data.hourly?.cloud_cover) {
      const nightData = nightHours.map(h => ({ hour: h, cloud: data.hourly.cloud_cover[h] ?? 100 }))
      const sorted = [...nightData].sort((a, b) => a.cloud - b.cloud)
      bestStart = `${String(sorted[0].hour).padStart(2, '0')}:00`
      bestEnd = `${String(sorted[1].hour).padStart(2, '0')}:00`
    }

    // Real-time planet & deep sky object visibility
    const planets = getTonightsObjects()

    const conditions: SkyConditions = {
      cloudCover,
      visibility: Math.round(visibility / 1000),
      temperature,
      moonPhase,
      moonIllumination: Math.abs(Math.sin(moonPhaseAngle * Math.PI / 180)),
      sunrise: data.daily?.sunrise?.[0]?.slice(11, 16) ?? '06:30',
      sunset: data.daily?.sunset?.[0]?.slice(11, 16) ?? '19:45',
      bestViewingStart: bestStart,
      bestViewingEnd: bestEnd,
      planets,
    }

    return NextResponse.json(conditions)
  } catch (err) {
    // Fallback: return astronomy data even if weather fails
    try {
      const planets = getTonightsObjects()
      return NextResponse.json({
        cloudCover: 50,
        visibility: 10,
        temperature: 15,
        moonPhase: 0.5,
        moonIllumination: 0.5,
        sunrise: '06:30',
        sunset: '19:45',
        bestViewingStart: '21:00',
        bestViewingEnd: '03:00',
        planets,
      })
    } catch {
      return NextResponse.json({ error: 'Failed to fetch sky conditions' }, { status: 500 })
    }
  }
}
