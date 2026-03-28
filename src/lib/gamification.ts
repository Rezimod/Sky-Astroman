export const LEVELS = [
  { level: 1,  threshold: 0,     title_ka: 'დამწყები',              title_en: 'Beginner'          },
  { level: 2,  threshold: 200,   title_ka: 'დამკვირვებელი',         title_en: 'Observer'          },
  { level: 3,  threshold: 500,   title_ka: 'მოყვარული',             title_en: 'Amateur'           },
  { level: 4,  threshold: 1000,  title_ka: 'ასტროფოტოგრაფი',       title_en: 'Astrophotographer' },
  { level: 5,  threshold: 2000,  title_ka: 'ექსპერტი',             title_en: 'Expert'            },
  { level: 6,  threshold: 4000,  title_ka: 'ვარსკვლავთმცოდნე',    title_en: 'Astronomer'        },
  { level: 7,  threshold: 7000,  title_ka: 'მასტერი',              title_en: 'Master'            },
  { level: 8,  threshold: 12000, title_ka: 'ლეგენდა',              title_en: 'Legend'            },
  { level: 9,  threshold: 20000, title_ka: 'კოსმოსის მკვლევარი',   title_en: 'Cosmos Explorer'   },
  { level: 10, threshold: 35000, title_ka: 'ვარსკვლავთმრიცხველი', title_en: 'Star Counter'      },
] as const

export type LevelEntry = typeof LEVELS[number]

export interface LevelInfo {
  level: number
  title_ka: string
  title_en: string
  threshold: number
  next_threshold: number | null
}

export function getLevelForPoints(points: number): LevelInfo {
  let entry: LevelEntry = LEVELS[0]
  for (const lvl of LEVELS) {
    if (points >= lvl.threshold) entry = lvl
    else break
  }
  const next = LEVELS.find(l => l.threshold > entry.threshold) ?? null
  return {
    level: entry.level,
    title_ka: entry.title_ka,
    title_en: entry.title_en,
    threshold: entry.threshold,
    next_threshold: next?.threshold ?? null,
  }
}

export function getProgressToNextLevel(points: number): { current: number; needed: number; percentage: number } {
  const info = getLevelForPoints(points)
  if (info.next_threshold === null) {
    return { current: points - info.threshold, needed: 1, percentage: 100 }
  }
  const current = points - info.threshold
  const needed = info.next_threshold - info.threshold
  return { current, needed, percentage: Math.min(Math.round((current / needed) * 100), 100) }
}

export const BADGES = [
  { id: 'first_step',    title_ka: 'პირველი ნაბიჯი',    title_en: 'First Step',       description_en: '1st approved observation'    },
  { id: 'observer',      title_ka: 'დამკვირვებელი',      title_en: 'Observer',         description_en: '5 approved observations'     },
  { id: 'photographer',  title_ka: 'ფოტოგრაფი',         title_en: 'Photographer',     description_en: '10 approved observations'    },
  { id: 'nebula_hunter', title_ka: 'ნებულა მონადირე',    title_en: 'Nebula Hunter',    description_en: 'Photograph any nebula'       },
  { id: 'planet_hunter', title_ka: 'პლანეტა მონადირე',   title_en: 'Planet Hunter',    description_en: '3 different planets'         },
  { id: 'streak_7',      title_ka: '7 დღე სტრიქი',       title_en: '7-Day Streak',     description_en: '7 consecutive days'          },
  { id: 'streak_30',     title_ka: '30 დღე სტრიქი',      title_en: '30-Day Streak',    description_en: '30 consecutive days'         },
  { id: 'team_player',   title_ka: 'გუნდის მოთამაშე',    title_en: 'Team Player',      description_en: 'Join a team'                },
  { id: 'teacher',       title_ka: 'მასწავლებელი',       title_en: 'Teacher',          description_en: '25 approved observations'    },
] as const

export type BadgeId = typeof BADGES[number]['id']

/** Pure function. dates = unique YYYY-MM-DD strings sorted descending. */
export function computeStreakFromDates(dates: string[]): { current: number; max: number } {
  if (dates.length === 0) return { current: 0, max: 0 }

  const todayStr     = new Date().toISOString().slice(0, 10)
  const yesterdayStr = new Date(Date.now() - 86400000).toISOString().slice(0, 10)

  function prevDay(a: string, b: string): boolean {
    return (new Date(a).getTime() - new Date(b).getTime()) === 86400000
  }

  // Current streak — must start from today or yesterday
  let current = 0
  if (dates[0] === todayStr || dates[0] === yesterdayStr) {
    current = 1
    for (let i = 1; i < dates.length; i++) {
      if (prevDay(dates[i - 1], dates[i])) current++
      else break
    }
  }

  // Max streak across all dates
  let max = 1
  let run = 1
  for (let i = 1; i < dates.length; i++) {
    if (prevDay(dates[i - 1], dates[i])) {
      run++
      if (run > max) max = run
    } else {
      run = 1
    }
  }

  return { current, max }
}
