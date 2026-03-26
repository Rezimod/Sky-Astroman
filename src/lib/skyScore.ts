export interface SkyScoreInput {
  cloudCover: number        // 0–100 %
  humidity: number          // 0–100 %
  windSpeed: number         // km/h
  visibility: number        // km
  moonIllumination: number  // 0–1
}

export interface SkyScore {
  score: number
  label: { en: string; ka: string }
  color: string
  breakdown: { clouds: number; humidity: number; wind: number; visibility: number; moon: number }
}

export function computeSkyScore(input: SkyScoreInput): SkyScore {
  const cloudPenalty = Math.round((input.cloudCover / 100) * 40)
  const humidPenalty = input.humidity > 85 ? Math.round(((input.humidity - 85) / 15) * 15) : 0
  const windPenalty  = input.windSpeed > 25 ? Math.min(Math.round(((input.windSpeed - 25) / 35) * 15), 15) : 0
  const visPenalty   = input.visibility < 10 ? Math.round(((10 - input.visibility) / 10) * 15) : 0
  const moonPenalty  = input.moonIllumination > 0.6 ? Math.round(((input.moonIllumination - 0.6) / 0.4) * 15) : 0

  const score = Math.max(0, Math.min(100, 100 - cloudPenalty - humidPenalty - windPenalty - visPenalty - moonPenalty))

  let label: { en: string; ka: string }
  let color: string
  if      (score >= 80) { label = { en: 'Excellent', ka: 'შესანიშნავი' }; color = '#34d399' }
  else if (score >= 60) { label = { en: 'Good',      ka: 'კარგი'       }; color = '#38F0FF' }
  else if (score >= 40) { label = { en: 'Fair',      ka: 'საშუალო'     }; color = '#FFD166' }
  else if (score >= 20) { label = { en: 'Poor',      ka: 'ცუდი'        }; color = '#fb923c' }
  else                  { label = { en: 'Very Poor', ka: 'ძალიან ცუდი' }; color = '#f87171' }

  return { score, label, color, breakdown: { clouds: cloudPenalty, humidity: humidPenalty, wind: windPenalty, visibility: visPenalty, moon: moonPenalty } }
}
