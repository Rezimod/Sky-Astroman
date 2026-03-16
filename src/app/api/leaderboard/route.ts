import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(req: NextRequest) {
  try {
    const supabase = await createClient()
    const { searchParams } = new URL(req.url)
    const period = searchParams.get('period') ?? 'all'
    const limit = parseInt(searchParams.get('limit') ?? '50')

    let query = supabase
      .from('profiles')
      .select('id, username, display_name, avatar_url, level, points, observations_count, missions_completed')
      .order('points', { ascending: false })
      .limit(limit)

    // For period filtering, we'd need created_at on a points_log table — for now, all-time only
    const { data, error } = await query
    if (error) throw error

    return NextResponse.json(data)
  } catch {
    return NextResponse.json({ error: 'Failed to fetch leaderboard' }, { status: 500 })
  }
}
