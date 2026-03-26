export const TBILISI = { lat: 41.7151, lng: 44.8271 }

export interface LiveWeather {
  cloudCover: number       // 0-100 %
  humidity: number         // 0-100 %
  windSpeed: number        // km/h
  temperature: number      // °C
  visibility: number       // km
  weatherCode: number
  moonPhase: number        // 0-1
  sunrise: string          // "HH:MM"
  sunset: string           // "HH:MM"
  hourly: HourlySlice[]
}

export interface HourlySlice {
  hour: number             // 0-23 local time
  timeLabel: string        // "20:00"
  cloudCover: number       // 0-100
  visibility: number       // km
  temperature: number      // °C
  dewPoint: number         // °C
}

function meteoUrl(lat = TBILISI.lat, lng = TBILISI.lng): string {
  return (
    `https://api.open-meteo.com/v1/forecast` +
    `?latitude=${lat}&longitude=${lng}` +
    `&current=temperature_2m,relative_humidity_2m,wind_speed_10m,cloud_cover,weather_code` +
    `&hourly=cloud_cover,visibility,temperature_2m,dew_point_2m` +
    `&daily=sunrise,sunset,moon_phase` +
    `&timezone=Asia%2FTbilisi&forecast_days=2`
  )
}

export async function fetchLiveWeather(lat?: number, lng?: number): Promise<LiveWeather | null> {
  try {
    const res = await fetch(meteoUrl(lat, lng))
    if (!res.ok) return null
    const d = await res.json()

    const hour = new Date().getHours()

    const cloudCover  = d.current?.cloud_cover      ?? d.hourly?.cloud_cover?.[hour]      ?? 50
    const humidity    = d.current?.relative_humidity_2m ?? 60
    const windSpeed   = d.current?.wind_speed_10m   ?? 0
    const temperature = d.current?.temperature_2m   ?? d.hourly?.temperature_2m?.[hour]   ?? 15
    const visRaw      = d.hourly?.visibility?.[hour] ?? 10000
    const visibility  = Math.round(visRaw / 1000)
    const weatherCode = d.current?.weather_code     ?? 0
    const moonPhase   = d.daily?.moon_phase?.[0]    ?? 0.5
    const sunrise     = d.daily?.sunrise?.[0]?.slice(11, 16) ?? '06:30'
    const sunset      = d.daily?.sunset?.[0]?.slice(11, 16)  ?? '20:00'

    // Build tonight's hourly slices (20:00 → 05:00 next day)
    const times: string[] = d.hourly?.time ?? []
    const clouds: number[] = d.hourly?.cloud_cover ?? []
    const vis: number[]    = d.hourly?.visibility  ?? []
    const temps: number[]  = d.hourly?.temperature_2m ?? []
    const dews: number[]   = d.hourly?.dew_point_2m   ?? []

    const tonightHours = [20, 21, 22, 23, 0, 1, 2, 3, 4, 5]
    const hourly: HourlySlice[] = tonightHours.flatMap(h => {
      const idx = times.findIndex(t => t.endsWith(`T${String(h).padStart(2,'0')}:00`))
      if (idx === -1) return []
      return [{
        hour: h,
        timeLabel: `${String(h).padStart(2,'0')}:00`,
        cloudCover: clouds[idx] ?? 50,
        visibility: Math.round((vis[idx] ?? 10000) / 1000),
        temperature: temps[idx] ?? temperature,
        dewPoint: dews[idx] ?? 10,
      }]
    })

    return { cloudCover, humidity, windSpeed, temperature, visibility, weatherCode, moonPhase, sunrise, sunset, hourly }
  } catch {
    return null
  }
}
