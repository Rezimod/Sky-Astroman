import { NextResponse } from 'next/server'

// Simple moon phase calculation based on known new moon epoch
function getMoonPhase(date: Date): { phase: number; name: string; illumination: number } {
  const knownNewMoon = new Date('2000-01-06T18:14:00Z')
  const synodicMonth = 29.53058867
  const diff = (date.getTime() - knownNewMoon.getTime()) / (1000 * 60 * 60 * 24)
  const phase = ((diff % synodicMonth) + synodicMonth) % synodicMonth / synodicMonth

  let name = 'New Moon'
  if (phase < 0.03 || phase > 0.97) name = 'New Moon'
  else if (phase < 0.22) name = 'Waxing Crescent'
  else if (phase < 0.28) name = 'First Quarter'
  else if (phase < 0.47) name = 'Waxing Gibbous'
  else if (phase < 0.53) name = 'Full Moon'
  else if (phase < 0.72) name = 'Waning Gibbous'
  else if (phase < 0.78) name = 'Last Quarter'
  else name = 'Waning Crescent'

  const illumination = (1 - Math.cos(phase * 2 * Math.PI)) / 2

  return { phase, name, illumination }
}

export async function GET() {
  const now = new Date()
  const moon = getMoonPhase(now)
  return NextResponse.json({
    ...moon,
    illuminationPercent: Math.round(moon.illumination * 100),
    date: now.toISOString(),
  })
}
