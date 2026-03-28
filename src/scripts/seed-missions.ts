/**
 * Seed script — inserts initial missions into Supabase.
 * Run with: npx tsx --env-file=.env.local src/scripts/seed-missions.ts
 */
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !serviceKey) {
  console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, serviceKey, {
  auth: { autoRefreshToken: false, persistSession: false },
})

const MISSIONS = [
  // ── Tonight's missions ─────────────────────────────────────────────────────
  {
    title: 'მთვარის ფოტო',
    description: 'გადაიღე მთვარე ნებისმიერი მოწყობილობით',
    object_name: 'Moon',
    reward_points: 100,
    difficulty: 'easy',
    is_daily: false,
    active: true,
  },
  {
    title: 'იუპიტერის დაკვირვება',
    description: 'იპოვე და გადაიღე იუპიტერი — ყველაზე ნათელი პლანეტა ღამის ცაზე',
    object_name: 'Jupiter',
    reward_points: 200,
    difficulty: 'medium',
    is_daily: false,
    active: true,
  },
  {
    title: 'ორიონის ნისლეული',
    description: 'M42 — ორიონის ნისლეული ტელესკოპით',
    object_name: 'Orion Nebula',
    reward_points: 300,
    difficulty: 'hard',
    is_daily: false,
    active: true,
  },
  {
    title: 'ვენერა გარიჟრაჟზე',
    description: 'გადაიღე ვენერა დილის ცაზე',
    object_name: 'Venus',
    reward_points: 150,
    difficulty: 'easy',
    is_daily: false,
    active: true,
  },
  {
    title: 'სატურნის რგოლები',
    description: 'გადაიღე სატურნი რგოლებით — საჭიროა ტელესკოპი',
    object_name: 'Saturn',
    reward_points: 350,
    difficulty: 'hard',
    is_daily: false,
    active: true,
  },
  {
    title: 'მარსი',
    description: 'იპოვე წითელი პლანეტა ღამის ცაზე',
    object_name: 'Mars',
    reward_points: 200,
    difficulty: 'medium',
    is_daily: false,
    active: true,
  },
  {
    title: 'თანავარსკვლავედი — ორიონი',
    description: 'გადაიღე ორიონის თანავარსკვლავედი სრულად',
    object_name: 'Orion',
    reward_points: 100,
    difficulty: 'easy',
    is_daily: false,
    active: true,
  },
  {
    title: 'ISS გადაფრენა',
    description: 'გადაიღე საერთაშორისო კოსმოსური სადგური ცაზე',
    object_name: 'ISS',
    reward_points: 250,
    difficulty: 'medium',
    is_daily: false,
    active: true,
  },
  {
    title: 'ირმის ნახტომი',
    description: 'გადაიღე ირმის ნახტომი — საჭიროა ბნელი ცა',
    object_name: 'Milky Way',
    reward_points: 400,
    difficulty: 'hard',
    is_daily: false,
    active: true,
  },
  {
    title: 'მეტეორი',
    description: 'გადაიღე მეტეორი — იღბალი გჭირდება!',
    object_name: 'Meteor',
    reward_points: 500,
    difficulty: 'hard',
    is_daily: false,
    active: true,
  },
  // ── Daily challenges ───────────────────────────────────────────────────────
  {
    title: 'ღამის ცა — ნებისმიერი ობიექტი',
    description: 'გადაიღე ნებისმიერი ობიექტი ცაზე',
    object_name: null,
    reward_points: 50,
    difficulty: 'easy',
    is_daily: true,
    active: true,
  },
  {
    title: 'მზის ჩასვლა',
    description: 'გადაიღე დღევანდელი მზის ჩასვლა',
    object_name: 'Sunset',
    reward_points: 75,
    difficulty: 'easy',
    is_daily: true,
    active: true,
  },
]

async function seed() {
  const { count, error: countErr } = await supabase
    .from('missions')
    .select('*', { count: 'exact', head: true })

  if (countErr) {
    console.error('Failed to query missions:', countErr.message)
    process.exit(1)
  }

  if (count && count > 0) {
    console.log(`Already seeded (${count} rows). Delete existing rows manually to re-seed.`)
    process.exit(0)
  }

  const { data, error } = await supabase
    .from('missions')
    .insert(MISSIONS)
    .select()

  if (error) {
    console.error('Seed failed:', error.message)
    process.exit(1)
  }

  console.log(`Seeded ${data.length} missions successfully`)
}

seed()
