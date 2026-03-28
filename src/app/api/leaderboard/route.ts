import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/service'

export async function GET(req: NextRequest) {
  try {
    const supabase = createServiceClient()
    const { searchParams } = new URL(req.url)
    const period = searchParams.get('period') ?? 'all'

    if (period === 'all') {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, username, display_name, level, points, observations_count')
        .order('points', { ascending: false })
        .limit(50)

      if (error) throw error
      return NextResponse.json(data ?? [])
    }

    // month / week — aggregate approved observations within the window
    const days = period === 'week' ? 7 : 30
    const cutoff = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString()

    const { data: obs, error: obsErr } = await supabase
      .from('observations')
      .select('user_id, points_awarded')
      .eq('status', 'approved')
      .gte('observed_at', cutoff)

    if (obsErr) throw obsErr
    if (!obs || obs.length === 0) return NextResponse.json([])

    // Aggregate points and observation count per user in JS
    const pointsMap = new Map<string, number>()
    const obsMap    = new Map<string, number>()
    for (const o of obs) {
      pointsMap.set(o.user_id, (pointsMap.get(o.user_id) ?? 0) + (o.points_awarded ?? 0))
      obsMap.set(o.user_id,    (obsMap.get(o.user_id)    ?? 0) + 1)
    }

    const userIds = [...pointsMap.keys()]
    const { data: profiles, error: profErr } = await supabase
      .from('profiles')
      .select('id, username, display_name, level, points, observations_count')
      .in('id', userIds)

    if (profErr) throw profErr

    const result = (profiles ?? [])
      .map(p => ({
        ...p,
        points:             pointsMap.get(p.id) ?? 0,
        observations_count: obsMap.get(p.id)    ?? 0,
      }))
      .sort((a, b) => b.points - a.points)
      .slice(0, 50)

    return NextResponse.json(result)
  } catch {
    return NextResponse.json({ error: 'Failed to fetch leaderboard' }, { status: 500 })
  }
}
