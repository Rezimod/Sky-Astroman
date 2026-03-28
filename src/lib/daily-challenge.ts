import * as Astronomy from 'astronomy-engine'

const LAT = 41.7151
const LNG = 44.8271
const TBILISI_UTC_OFFSET = 4

interface DailyChallenge {
  object_name: string
  title_ka: string
  description_ka: string
  reward_points: number
  difficulty: 'easy' | 'medium' | 'hard'
  expires_at: string
  object_type: string
}

function getTbilisiNow(): Date {
  const now = new Date()
  return new Date(now.getTime() + TBILISI_UTC_OFFSET * 60 * 60 * 1000)
}

function getMidnightExpiresAt(): string {
  const tbilisi = getTbilisiNow()
  // midnight at end of today in Tbilisi = tomorrow 00:00 Tbilisi = tomorrow 00:00 - 4h UTC
  const midnightTbilisi = new Date(
    Date.UTC(tbilisi.getUTCFullYear(), tbilisi.getUTCMonth(), tbilisi.getUTCDate() + 1, 0, 0, 0)
  )
  // subtract 4h to get UTC equivalent
  return new Date(midnightTbilisi.getTime() - TBILISI_UTC_OFFSET * 60 * 60 * 1000).toISOString()
}

function getWeekNumber(d: Date): number {
  const onejan = new Date(d.getUTCFullYear(), 0, 1)
  return Math.ceil(((d.getTime() - onejan.getTime()) / 86400000 + onejan.getUTCDay() + 1) / 7)
}

function isPlanetVisibleTonight(body: Astronomy.Body): boolean {
  try {
    const observer = new Astronomy.Observer(LAT, LNG, 0)
    const now = new Date()
    // look for a set time in the next 12 hours — if the planet sets after now it's visible at some point tonight
    const setTime = Astronomy.SearchRiseSet(body, observer, -1, now, 1)
    if (!setTime) return false
    // check altitude around 21:00 local (17:00 UTC for Tbilisi UTC+4)
    const checkTime = new Date(now)
    checkTime.setUTCHours(17, 0, 0, 0)
    const eq = Astronomy.Equator(body, checkTime, observer, true, true)
    const hor = Astronomy.Horizon(checkTime, observer, eq.ra, eq.dec, 'normal')
    return hor.altitude > 10
  } catch {
    return false
  }
}

const DSO_ROTATION: DailyChallenge[] = [
  {
    object_name: 'ორიონის ნისლეული',
    title_ka: 'ორიონის ნისლეულის დაკვირვება',
    description_ka: 'M42 — ყველაზე ნათელი ნისლეული ღამის ცაზე, ორიონის თანავარსკვლავედში. დაათვალიერეთ ბინოკლით ან ტელესკოპით.',
    reward_points: 80,
    difficulty: 'hard',
    expires_at: '',
    object_type: 'dso',
  },
  {
    object_name: 'ანდრომედა გალაქტიკა',
    title_ka: 'ანდრომედა გალაქტიკის პოვნა',
    description_ka: 'M31 — ჩვენი ყველაზე ახლო მეზობელი გალაქტიკა, 2.5 მლნ სინათლის წელზე. შეუიარაღებელი თვალით ჩანს ბნელ ადგილას.',
    reward_points: 100,
    difficulty: 'hard',
    expires_at: '',
    object_type: 'dso',
  },
  {
    object_name: 'პლეიადები',
    title_ka: 'პლეიადების ვარსკვლავთგროვა',
    description_ka: 'M45 — ულამაზესი ვარსკვლავთგროვა კუროს თანავარსკვლავედში. 6-7 ვარსკვლავი ჩანს შეუიარაღებელი თვალით.',
    reward_points: 60,
    difficulty: 'medium',
    expires_at: '',
    object_type: 'dso',
  },
]

export function generateDailyChallenge(): DailyChallenge {
  const tbilisiNow = getTbilisiNow()
  const dayOfWeek = tbilisiNow.getUTCDay() // 0=Sun, 1=Mon ... 6=Sat
  const weekNumber = getWeekNumber(tbilisiNow)
  const expires_at = getMidnightExpiresAt()

  // Hard days: Saturday (6) or Sunday (0)
  if (dayOfWeek === 0 || dayOfWeek === 6) {
    const dso = DSO_ROTATION[weekNumber % DSO_ROTATION.length]
    return { ...dso, expires_at }
  }

  // Easy days: Mon (1), Wed (3), Fri (5)
  if (dayOfWeek === 1 || dayOfWeek === 3 || dayOfWeek === 5) {
    // Try Moon first
    if (dayOfWeek === 1 || dayOfWeek === 5) {
      return {
        object_name: 'მთვარე',
        title_ka: 'მთვარის დაკვირვება',
        description_ka: 'დააკვირდით მთვარეს და ჩაწერეთ მისი ფაზა. ტელესკოპით კი ხილვადია კრატერები და ზღვები.',
        reward_points: 20,
        difficulty: 'easy',
        expires_at,
        object_type: 'moon',
      }
    }

    // Wednesday: try Venus, then Jupiter
    if (isPlanetVisibleTonight(Astronomy.Body.Venus)) {
      return {
        object_name: 'ვენერა',
        title_ka: 'ვენერა — ღამის ვარსკვლავი',
        description_ka: 'ვენერა ყველაზე ნათელი პლანეტაა ცაზე. იპოვეთ ჩასვლის ან ამოსვლის შემდეგ — ისე ნათელია, რომ ჩრდილსაც კი ბრასავს.',
        reward_points: 30,
        difficulty: 'easy',
        expires_at,
        object_type: 'planet',
      }
    }

    if (isPlanetVisibleTonight(Astronomy.Body.Jupiter)) {
      return {
        object_name: 'იუპიტერი',
        title_ka: 'იუპიტერი — გიგანტი',
        description_ka: 'იუპიტერი მზის სისტემის უდიდესი პლანეტაა. ბინოკლით კი ჩანს მისი ოთხი დიდი მთვარე.',
        reward_points: 30,
        difficulty: 'easy',
        expires_at,
        object_type: 'planet',
      }
    }

    // Fallback to Moon
    return {
      object_name: 'მთვარე',
      title_ka: 'მთვარის დაკვირვება',
      description_ka: 'დააკვირდით მთვარეს და ჩაწერეთ მისი ფაზა. ტელესკოპით კი ხილვადია კრატერები და ზღვები.',
      reward_points: 20,
      difficulty: 'easy',
      expires_at,
      object_type: 'moon',
    }
  }

  // Medium days: Tue (2), Thu (4)
  const planets: Array<{ body: Astronomy.Body; challenge: DailyChallenge }> = [
    {
      body: Astronomy.Body.Mars,
      challenge: {
        object_name: 'მარსი',
        title_ka: 'მარსი — წითელი პლანეტა',
        description_ka: 'მარსი ადვილად გამოირჩევა წითელი ფერით. ტელესკოპით შესაძლოა გამოჩნდეს პოლარული ქუდი.',
        reward_points: 40,
        difficulty: 'medium',
        expires_at,
        object_type: 'planet',
      },
    },
    {
      body: Astronomy.Body.Saturn,
      challenge: {
        object_name: 'სატურნი',
        title_ka: 'სატურნი — რგოლების პლანეტა',
        description_ka: 'სატურნის რგოლები უნიკალური სანახაობაა სამყაროში. პატარა ტელესკოპითაც კი ვხედავთ მათ.',
        reward_points: 40,
        difficulty: 'medium',
        expires_at,
        object_type: 'planet',
      },
    },
  ]

  for (const p of planets) {
    if (isPlanetVisibleTonight(p.body)) {
      return p.challenge
    }
  }

  // Fallback: Pleiades
  return {
    ...DSO_ROTATION[2],
    expires_at,
  }
}
