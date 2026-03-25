/**
 * Astronomy calculations for Tbilisi, Georgia
 * Uses astronomy-engine (pure JS, no API needed)
 */
import * as Astronomy from 'astronomy-engine'

const LAT = 41.7151
const LNG = 44.8271

export interface VisibleObject {
  id: string
  name: string
  nameGe: string
  emoji: string
  type: 'planet' | 'moon' | 'cluster' | 'nebula' | 'galaxy'
  magnitude: number
  altitude: number       // degrees above horizon right now
  maxAltitude: number    // peak altitude tonight
  azimuth: number        // degrees (0=N, 90=E, 180=S, 270=W)
  difficulty: 'easy' | 'medium' | 'hard' | 'expert'
  equipment: 'naked_eye' | 'binoculars' | 'small_telescope' | 'telescope'
  bestTime: string       // "22:30"
  constellation: string
  hint: string
  hintGe: string
  points: number
  isVisible: boolean     // true if maxAltitude > 10°
}

export interface GeneratedMission {
  id: string
  title: string
  titleGe: string
  description: string
  descriptionGe: string
  objectName: string
  objectEmoji: string
  difficulty: 'easy' | 'medium' | 'hard' | 'expert'
  points: number
  equipment: VisibleObject['equipment']
  bestTime: string
  maxAltitude: number
  isVisible: boolean
}

// ── Solar system bodies ──────────────────────────────────────────────────────

const SOLAR_BODIES: Array<{
  id: string
  name: string
  nameGe: string
  emoji: string
  type: VisibleObject['type']
  body: Astronomy.Body
  equipment: VisibleObject['equipment']
  basePoints: number
  hint: string
  hintGe: string
}> = [
  {
    id: 'moon', name: 'Moon', nameGe: 'მთვარე', emoji: '🌕',
    type: 'moon', body: Astronomy.Body.Moon,
    equipment: 'naked_eye', basePoints: 50,
    hint: 'Brightest object in the night sky. Identify 3 craters through any telescope.',
    hintGe: 'ღამის ცის ყველაზე კაშკაშა ობიექტი. ამოიცანი 3 კრატერი ნებისმიერი ტელესკოპით.',
  },
  {
    id: 'venus', name: 'Venus', nameGe: 'ვენერა', emoji: '⭐',
    type: 'planet', body: Astronomy.Body.Venus,
    equipment: 'naked_eye', basePoints: 60,
    hint: 'Brightest planet — visible near the horizon at dusk or dawn. Cannot be missed.',
    hintGe: 'ყველაზე კაშკაშა პლანეტა, ხილული ჰორიზონტთან. გამორიცხავს დაბნეულობას.',
  },
  {
    id: 'jupiter', name: 'Jupiter', nameGe: 'იუპიტერი', emoji: '🪐',
    type: 'planet', body: Astronomy.Body.Jupiter,
    equipment: 'naked_eye', basePoints: 75,
    hint: "Brightest 'star' that doesn't twinkle. Small telescope shows cloud bands and moons.",
    hintGe: 'ყველაზე კაშკაშა "ვარსკვლავი", რომელიც არ ციმციმებს. პატარა ტელესკოპი გვიჩვენებს ღრუბლის ზოლებს.',
  },
  {
    id: 'mars', name: 'Mars', nameGe: 'მარსი', emoji: '🔴',
    type: 'planet', body: Astronomy.Body.Mars,
    equipment: 'naked_eye', basePoints: 70,
    hint: 'Distinct reddish hue. Does not twinkle like a star. Note its current constellation.',
    hintGe: 'გამოირჩევა წითელი ფერით. არ ციმციმებს. აღნიშნე თანავარსკვლავედი.',
  },
  {
    id: 'saturn', name: 'Saturn', nameGe: 'სატურნი', emoji: '🪐',
    type: 'planet', body: Astronomy.Body.Saturn,
    equipment: 'small_telescope', basePoints: 100,
    hint: 'Yellowish star to naked eye. Even 30mm telescope shows rings. Use 50–150× magnification.',
    hintGe: 'მოყვითალო ვარსკვლავი შეუიარაღებელი თვალით. 30მმ ტელესკოპი გვიჩვენებს რგოლებს. 50–150× გადიდება.',
  },
  {
    id: 'mercury', name: 'Mercury', nameGe: 'მერკური', emoji: '⚫',
    type: 'planet', body: Astronomy.Body.Mercury,
    equipment: 'naked_eye', basePoints: 100,
    hint: 'Only visible just after sunset or before sunrise, very low on the horizon. Fast mover.',
    hintGe: 'ხილული მხოლოდ მზის ჩასვლის შემდეგ ან ამოსვლამდე. ჰორიზონტის ძალიან ახლოს.',
  },
  {
    id: 'uranus', name: 'Uranus', nameGe: 'ურანი', emoji: '🔵',
    type: 'planet', body: Astronomy.Body.Uranus,
    equipment: 'binoculars', basePoints: 120,
    hint: 'Faint blue-green dot at magnitude ~5.7. Binoculars help confirm it against stars.',
    hintGe: 'სუსტი ლურჯ-მწვანე წერტილი. ბინოკლი ადასტურებს ვარსკვლავებს შორის.',
  },
  {
    id: 'neptune', name: 'Neptune', nameGe: 'ნეპტუნი', emoji: '🔵',
    type: 'planet', body: Astronomy.Body.Neptune,
    equipment: 'telescope', basePoints: 175,
    hint: 'Magnitude ~7.8 — needs a star chart and telescope. Appears as a faint blue-grey dot.',
    hintGe: 'mag ~7.8 — სჭირდება ვარსკვლავური რუკა და ტელესკოპი. სუსტი ლურჯ-ნაცრისფერი წერტილი.',
  },
]

// ── Deep sky objects (J2000 RA in decimal hours, Dec in decimal degrees) ──────

const DEEP_SKY: Array<{
  id: string
  name: string
  nameGe: string
  emoji: string
  type: VisibleObject['type']
  ra: number
  dec: number
  magnitude: number
  difficulty: VisibleObject['difficulty']
  equipment: VisibleObject['equipment']
  constellation: string
  hint: string
  hintGe: string
  points: number
}> = [
  {
    id: 'pleiades', name: 'Pleiades (M45)', nameGe: 'პლეიადები (M45)', emoji: '💫',
    type: 'cluster', ra: 3.789, dec: 24.116, magnitude: 1.6,
    difficulty: 'easy', equipment: 'naked_eye', constellation: 'Taurus',
    hint: 'The Seven Sisters — fuzzy patch with naked eye. Binoculars reveal dozens of stars.',
    hintGe: 'შვიდი დები — ღრუბლიანი ლაქა შეუიარაღებელი თვალით. ბინოკლი ათეულ ვარსკვლავებს გვიჩვენებს.',
    points: 60,
  },
  {
    id: 'double_cluster', name: 'Double Cluster', nameGe: 'ორმაგი გროვა', emoji: '✨',
    type: 'cluster', ra: 2.358, dec: 57.135, magnitude: 4.3,
    difficulty: 'easy', equipment: 'binoculars', constellation: 'Perseus',
    hint: 'Two rich open clusters side by side in Perseus. Spectacular in binoculars.',
    hintGe: 'ორი მდიდარი ღია გროვა გვერდიგვერდ. განსაცვიფრებელი ბინოკლში.',
    points: 70,
  },
  {
    id: 'andromeda', name: 'Andromeda Galaxy (M31)', nameGe: 'ანდრომედას გალაქტიკა (M31)', emoji: '🌌',
    type: 'galaxy', ra: 0.712, dec: 41.269, magnitude: 3.4,
    difficulty: 'medium', equipment: 'binoculars', constellation: 'Andromeda',
    hint: 'Naked-eye smudge from dark skies. Binoculars show core and dust lanes. 2.5 million light-years.',
    hintGe: 'ბნელ ცაში შეიმჩნევა შეუიარაღებელი თვალით. ბინოკლი უჩვენებს ბირთვს. 2.5 მლნ სინათლის წელი.',
    points: 120,
  },
  {
    id: 'orion_nebula', name: 'Orion Nebula (M42)', nameGe: 'ორიონის ნისლეული (M42)', emoji: '✨',
    type: 'nebula', ra: 5.588, dec: -5.391, magnitude: 4.0,
    difficulty: 'medium', equipment: 'binoculars', constellation: 'Orion',
    hint: "Middle 'star' of Orion's sword. Binoculars show greenish glow. Telescope reveals Trapezium stars.",
    hintGe: 'ორიონის ხმლის შუა "ვარსკვლავი". ბინოკლი მომწვანო ბზინვას გვიჩვენებს.',
    points: 100,
  },
  {
    id: 'beehive', name: 'Beehive Cluster (M44)', nameGe: 'სკის გროვა (M44)', emoji: '🐝',
    type: 'cluster', ra: 8.673, dec: 19.674, magnitude: 3.7,
    difficulty: 'medium', equipment: 'binoculars', constellation: 'Cancer',
    hint: 'Fuzzy patch in Cancer to naked eye. Binoculars resolve dozens of stars.',
    hintGe: 'ღრუბლიანი ლაქა კიბოს თანავარსკვლავედში. ბინოკლი ათობით ვარსკვლავს გვიჩვენებს.',
    points: 80,
  },
  {
    id: 'hercules', name: 'Hercules Cluster (M13)', nameGe: 'ჰერკულეს გროვა (M13)', emoji: '🔮',
    type: 'cluster', ra: 16.695, dec: 36.461, magnitude: 5.8,
    difficulty: 'hard', equipment: 'telescope', constellation: 'Hercules',
    hint: 'Greatest globular cluster in the north. Use 100–200× to resolve individual stars.',
    hintGe: 'ჩრდილოეთ ცის საუკეთესო სფეროსებური გროვა. 100–200× ინდივიდუალური ვარსკვლავები.',
    points: 150,
  },
  {
    id: 'ring_nebula', name: 'Ring Nebula (M57)', nameGe: 'რგოლის ნისლეული (M57)', emoji: '🔭',
    type: 'nebula', ra: 18.893, dec: 33.029, magnitude: 8.8,
    difficulty: 'hard', equipment: 'telescope', constellation: 'Lyra',
    hint: 'Tiny smoke ring between β and γ Lyrae. Needs 100–200× magnification.',
    hintGe: 'პატარა კვამლის რგოლი ბეტა და გამა ლირის შორის. საჭიროა 100–200× გადიდება.',
    points: 175,
  },
  {
    id: 'dumbbell', name: 'Dumbbell Nebula (M27)', nameGe: 'განტელის ნისლეული (M27)', emoji: '🔭',
    type: 'nebula', ra: 19.993, dec: 22.721, magnitude: 7.5,
    difficulty: 'hard', equipment: 'telescope', constellation: 'Vulpecula',
    hint: 'Brightest planetary nebula. Apple-core shape at 80–150×. Easily found above Sagitta.',
    hintGe: 'ყველაზე კაშკაშა პლანეტური ნისლეული. 80-150× ვაშლის ძირის ფორმა.',
    points: 150,
  },
  {
    id: 'crab_nebula', name: 'Crab Nebula (M1)', nameGe: 'კიბოს ნისლეული (M1)', emoji: '🦀',
    type: 'nebula', ra: 5.575, dec: 22.017, magnitude: 8.4,
    difficulty: 'expert', equipment: 'telescope', constellation: 'Taurus',
    hint: 'Supernova remnant. Needs 8"+ aperture. Irregular blob 1° NW of ζ Tauri.',
    hintGe: 'სუპერნოვას ნარჩენი. საჭიროა 8"+ აპერტურა. ζ Tau-ს 1°-ით ჩრდ-დასავლეთით.',
    points: 250,
  },
  {
    id: 'whirlpool', name: 'Whirlpool Galaxy (M51)', nameGe: 'გრიგალის გალაქტიკა (M51)', emoji: '🌀',
    type: 'galaxy', ra: 13.498, dec: 47.195, magnitude: 8.4,
    difficulty: 'expert', equipment: 'telescope', constellation: 'Canes Venatici',
    hint: 'Interacting galaxy pair. 6"+ telescope needed to see spiral arms. Use dark skies.',
    hintGe: 'ორი ურთიერთმოქმედი გალაქტიკა. 6"+ ბნელ ცაში სპირალური მკლავების სანახავად.',
    points: 225,
  },
]

// ── Helpers ──────────────────────────────────────────────────────────────────

function padTime(h: number, m = 0): string {
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`
}

/**
 * Iterates through tonight's observation window (20:00 – 05:00)
 * and returns the peak altitude + time.
 */
function peakTonight(
  getAlt: (d: Date) => number
): { maxAlt: number; bestTime: string } {
  const now = new Date()
  // Build 20:00 window for tonight
  const base = new Date(now)
  base.setHours(20, 0, 0, 0)
  // If it's already past 05:00 and before 20:00 shift base to next night start
  if (now.getHours() >= 5 && now.getHours() < 20) {
    // daytime — compute for tonight
  } else if (now.getHours() < 5) {
    // very early morning — window already started last night, shift base back
    base.setDate(base.getDate() - 1)
  }

  let maxAlt = -90
  let bestTime = '22:00'

  // Check every 30 min across 9 hours (18 steps)
  for (let i = 0; i <= 18; i++) {
    const t = new Date(base.getTime() + i * 30 * 60 * 1000)
    const alt = getAlt(t)
    if (alt > maxAlt) {
      maxAlt = alt
      bestTime = padTime(t.getHours(), t.getMinutes())
    }
  }

  return { maxAlt: Math.round(maxAlt * 10) / 10, bestTime }
}

function moonIllumination(date: Date): number {
  const phase = Astronomy.MoonPhase(date) // 0–360
  return Math.abs(Math.sin((phase * Math.PI) / 180))
}

// ── Main export ───────────────────────────────────────────────────────────────

export function getTonightsObjects(): VisibleObject[] {
  const now = new Date()
  const observer = new Astronomy.Observer(LAT, LNG, 0)
  const moonIllum = moonIllumination(now)
  const results: VisibleObject[] = []

  // --- Solar system bodies ---
  for (const obj of SOLAR_BODIES) {
    let magnitude: number
    try {
      if (obj.body === Astronomy.Body.Moon) {
        // Moon magnitude: full ≈ -12.7, new ≈ -3 (rough linear)
        magnitude = -12.7 + (1 - moonIllum) * 9.7
      } else {
        magnitude = Astronomy.Illumination(obj.body, now).mag
      }
    } catch {
      magnitude = 99
    }

    const { maxAlt, bestTime } = peakTonight((d) => {
      const eq = Astronomy.Equator(obj.body, d, observer, true, true)
      return Astronomy.Horizon(d, observer, eq.ra, eq.dec, 'normal').altitude
    })

    const eqNow = Astronomy.Equator(obj.body, now, observer, true, true)
    const horNow = Astronomy.Horizon(now, observer, eqNow.ra, eqNow.dec, 'normal')

    // Difficulty logic per body
    let difficulty: VisibleObject['difficulty']
    let equipment = obj.equipment

    switch (obj.body) {
      case Astronomy.Body.Moon:
      case Astronomy.Body.Venus:
      case Astronomy.Body.Jupiter:
        difficulty = 'easy'
        break
      case Astronomy.Body.Mars:
        difficulty = magnitude < 1 ? 'easy' : 'medium'
        break
      case Astronomy.Body.Saturn:
        difficulty = 'medium'
        equipment = 'small_telescope'
        break
      case Astronomy.Body.Mercury:
        // Mercury stays low — hard because it's fleeting near horizon
        difficulty = maxAlt < 15 ? 'hard' : 'medium'
        break
      case Astronomy.Body.Uranus:
        difficulty = 'medium'
        break
      case Astronomy.Body.Neptune:
        difficulty = 'hard'
        break
      default:
        difficulty = 'medium'
    }

    results.push({
      id: obj.id,
      name: obj.name,
      nameGe: obj.nameGe,
      emoji: obj.emoji,
      type: obj.type,
      magnitude: Math.round(magnitude * 10) / 10,
      altitude: Math.round(horNow.altitude * 10) / 10,
      maxAltitude: maxAlt,
      azimuth: Math.round(horNow.azimuth * 10) / 10,
      difficulty,
      equipment,
      bestTime,
      constellation: 'varies',
      hint: obj.hint,
      hintGe: obj.hintGe,
      points: obj.basePoints,
      isVisible: maxAlt > 10,
    })
  }

  // --- Deep sky objects ---
  for (const obj of DEEP_SKY) {
    const { maxAlt, bestTime } = peakTonight((d) => {
      return Astronomy.Horizon(d, observer, obj.ra, obj.dec, 'normal').altitude
    })

    const horNow = Astronomy.Horizon(now, observer, obj.ra, obj.dec, 'normal')

    // Bump difficulty if moon is bright and the object is faint
    let difficulty = obj.difficulty
    if (moonIllum > 0.6 && obj.magnitude > 7) {
      difficulty = difficulty === 'hard' ? 'expert' : 'hard'
    } else if (moonIllum > 0.4 && obj.magnitude > 9) {
      difficulty = 'expert'
    }

    results.push({
      id: obj.id,
      name: obj.name,
      nameGe: obj.nameGe,
      emoji: obj.emoji,
      type: obj.type,
      magnitude: obj.magnitude,
      altitude: Math.round(horNow.altitude * 10) / 10,
      maxAltitude: maxAlt,
      azimuth: Math.round(horNow.azimuth * 10) / 10,
      difficulty,
      equipment: obj.equipment,
      bestTime,
      constellation: obj.constellation,
      hint: obj.hint,
      hintGe: obj.hintGe,
      points: obj.points,
      isVisible: maxAlt > 10,
    })
  }

  // Sort: visible first, then highest altitude
  return results.sort((a, b) => {
    if (a.isVisible !== b.isVisible) return a.isVisible ? -1 : 1
    return b.maxAltitude - a.maxAltitude
  })
}

export function generateMissions(objects: VisibleObject[]): GeneratedMission[] {
  return objects
    .filter((o) => o.isVisible)
    .map((obj) => {
      let title = ''
      let titleGe = ''
      let description = ''
      let descriptionGe = ''

      switch (obj.type) {
        case 'moon':
          title = 'Observe the Moon'
          titleGe = 'დააკვირდი მთვარეს'
          description = 'Observe the lunar surface and identify at least 3 craters.'
          descriptionGe = 'დააკვირდი მთვარის ზედაპირს და ამოიცანი სულ მცირე 3 კრატერი.'
          break
        case 'planet':
          title = `Find ${obj.name}`
          titleGe = `იპოვე ${obj.nameGe}`
          description = `Locate ${obj.name} tonight. ${obj.hint}`
          descriptionGe = `${obj.nameGe} — ${obj.hintGe}`
          break
        case 'nebula':
          title = `Capture ${obj.name}`
          titleGe = `გადაიღე ${obj.nameGe}`
          description = `Photograph ${obj.name}. ${obj.hint}`
          descriptionGe = `${obj.nameGe} — ${obj.hintGe}`
          break
        case 'galaxy':
          title = `Hunt ${obj.name}`
          titleGe = `მოინადირე ${obj.nameGe}`
          description = `Locate and observe ${obj.name}. ${obj.hint}`
          descriptionGe = `${obj.nameGe} — ${obj.hintGe}`
          break
        case 'cluster':
          title = `Spot ${obj.name}`
          titleGe = `იპოვე ${obj.nameGe}`
          description = `Identify ${obj.name} in ${obj.constellation}. ${obj.hint}`
          descriptionGe = `${obj.nameGe} — ${obj.hintGe}`
          break
        default:
          title = `Observe ${obj.name}`
          titleGe = `დააკვირდი ${obj.nameGe}`
          description = obj.hint
          descriptionGe = obj.hintGe
      }

      return {
        id: obj.id,
        title,
        titleGe,
        description,
        descriptionGe,
        objectName: obj.name,
        objectEmoji: obj.emoji,
        difficulty: obj.difficulty,
        points: obj.points,
        equipment: obj.equipment,
        bestTime: obj.bestTime,
        maxAltitude: obj.maxAltitude,
        isVisible: obj.isVisible,
      }
    })
    .sort((a, b) => {
      const order = { easy: 0, medium: 1, hard: 2, expert: 3 }
      return order[a.difficulty] - order[b.difficulty]
    })
}
