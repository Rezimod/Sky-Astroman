import type { SupabaseClient } from '@supabase/supabase-js'
import { computeStreakFromDates } from './gamification'

const PLANETS = new Set(['Moon', 'Jupiter', 'Venus', 'Mars', 'Saturn', 'Mercury', 'Uranus', 'Neptune'])
const NEBULA_KEYWORDS = ['nebula', 'ნისლეული', 'nisan']

/**
 * Check badge conditions for a user and insert any newly earned badges.
 * Safe to call even if user_badges table doesn't exist — errors are caught.
 * Returns array of newly awarded badge_ids.
 */
export async function checkAndAwardBadges(
  userId: string,
  supabase: SupabaseClient,
): Promise<string[]> {
  try {
    const [{ data: observations }, { data: profile }, { data: existing }] = await Promise.all([
      supabase
        .from('observations')
        .select('id, object_name, observed_at')
        .eq('user_id', userId)
        .eq('status', 'approved')
        .order('observed_at', { ascending: false }),
      supabase
        .from('profiles')
        .select('team_id')
        .eq('id', userId)
        .single(),
      supabase
        .from('user_badges')
        .select('badge_id')
        .eq('user_id', userId),
    ])

    const obs = observations ?? []
    const earnedSet = new Set((existing ?? []).map((b: { badge_id: string }) => b.badge_id))

    // Streak
    const uniqueDates = [...new Set(obs.map(o => (o.observed_at as string).slice(0, 10)))]
      .sort()
      .reverse()
    const { current: streakCurrent } = computeStreakFromDates(uniqueDates)

    // Planet diversity
    const distinctPlanets = new Set(
      obs.map(o => o.object_name as string).filter(n => n && PLANETS.has(n))
    )

    // Nebula check
    const hasNebula = obs.some(o =>
      NEBULA_KEYWORDS.some(k => (o.object_name as string ?? '').toLowerCase().includes(k))
    )

    const toAward: string[] = []
    const check = (id: string, condition: boolean) => {
      if (condition && !earnedSet.has(id)) toAward.push(id)
    }

    check('first_step',    obs.length >= 1)
    check('observer',      obs.length >= 5)
    check('photographer',  obs.length >= 10)
    check('teacher',       obs.length >= 25)
    check('nebula_hunter', hasNebula)
    check('planet_hunter', distinctPlanets.size >= 3)
    check('streak_7',      streakCurrent >= 7)
    check('streak_30',     streakCurrent >= 30)
    check('team_player',   !!profile?.team_id)

    if (toAward.length > 0) {
      const now = new Date().toISOString()
      await supabase
        .from('user_badges')
        .insert(toAward.map(badge_id => ({ user_id: userId, badge_id, earned_at: now })))
    }

    return toAward
  } catch {
    // user_badges table may not exist yet — fail silently
    return []
  }
}
