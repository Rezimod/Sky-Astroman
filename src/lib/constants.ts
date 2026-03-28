export const DEFAULT_LOCATION = {
  lat: 41.7151,
  lng: 44.8271,
  name: 'Tbilisi, Georgia',
}

export const OPEN_METEO_URL = 'https://api.open-meteo.com/v1/forecast'

export const LEVEL_THRESHOLDS = [0, 200, 500, 1000, 2000, 4000, 7000, 12000, 20000, 35000]

export function getLevelFromPoints(points: number): number {
  for (let i = LEVEL_THRESHOLDS.length - 1; i >= 0; i--) {
    if (points >= LEVEL_THRESHOLDS[i]) return i + 1
  }
  return 1
}

export function getPointsToNextLevel(points: number): { current: number; needed: number; progress: number } {
  const level = getLevelFromPoints(points)
  const currentThreshold = LEVEL_THRESHOLDS[level - 1] ?? 0
  const nextThreshold = LEVEL_THRESHOLDS[level] ?? LEVEL_THRESHOLDS[LEVEL_THRESHOLDS.length - 1]
  const needed = nextThreshold - currentThreshold
  const current = points - currentThreshold
  return { current, needed, progress: Math.min((current / needed) * 100, 100) }
}
