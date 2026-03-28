import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { computeStreakFromDates } from '@/lib/gamification'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ current: 0, max: 0 })

    const { data } = await supabase
      .from('observations')
      .select('observed_at')
      .eq('user_id', user.id)
      .eq('status', 'approved')
      .order('observed_at', { ascending: false })

    const uniqueDates = [
      ...new Set((data ?? []).map(o => (o.observed_at as string).slice(0, 10))),
    ]
      .sort()
      .reverse()

    return NextResponse.json(computeStreakFromDates(uniqueDates))
  } catch {
    return NextResponse.json({ current: 0, max: 0 })
  }
}
