import { NextRequest, NextResponse } from 'next/server'
import { DEFAULT_LOCATION, OPEN_METEO_URL } from '@/lib/constants'
import type { SkyConditions } from '@/lib/types'

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const lat = parseFloat(searchParams.get('lat') ?? String(DEFAULT_LOCATION.lat))
    const lng = parseFloat(searchParams.get('lng') ?? String(DEFAULT_LOCATION.lng))

    const url = `${OPEN_METEO_URL}?latitude=${lat}&longitude=${lng}&hourly=cloud_cover,visibility,temperature_2m&daily=sunrise,sunset,moon_phase&current=cloud_cover,temperature_2m&timezone=Asia%2FTbilisi&forecast_days=1`

    const res = await fetch(url, { next: { revalidate: 1800 } })
    if (!res.ok) throw new Error('Open-Meteo fetch failed')

    const data = await res.json()

    const currentHour = new Date().getHours()
    const cloudCover = data.current?.cloud_cover ?? data.hourly?.cloud_cover?.[currentHour] ?? 50
    const visibility = data.hourly?.visibility?.[currentHour] ?? 10000
    const temperature = data.current?.temperature_2m ?? data.hourly?.temperature_2m?.[currentHour] ?? 15
    const moonPhase = data.daily?.moon_phase?.[0] ?? 0.5

    // Find best viewing window (lowest cloud cover between 21:00–04:00)
    const nightHours = [21, 22, 23, 0, 1, 2, 3, 4]
    let bestStart = '21:00'
    let bestEnd = '23:00'
    if (data.hourly?.cloud_cover) {
      const nightData = nightHours.map(h => ({ hour: h, cloud: data.hourly.cloud_cover[h] ?? 100 }))
      const sorted = nightData.sort((a, b) => a.cloud - b.cloud)
      bestStart = `${String(sorted[0].hour).padStart(2, '0')}:00`
      bestEnd = `${String(sorted[1].hour).padStart(2, '0')}:00`
    }

    const conditions: SkyConditions = {
      cloudCover,
      visibility: Math.round(visibility / 1000),
      temperature,
      moonPhase,
      moonIllumination: Math.sin(moonPhase * Math.PI),
      sunrise: data.daily?.sunrise?.[0]?.slice(11, 16) ?? '06:30',
      sunset: data.daily?.sunset?.[0]?.slice(11, 16) ?? '19:45',
      bestViewingStart: bestStart,
      bestViewingEnd: bestEnd,
    }

    return NextResponse.json(conditions)
  } catch (err) {
    return NextResponse.json({ error: 'Failed to fetch sky conditions' }, { status: 500 })
  }
}
