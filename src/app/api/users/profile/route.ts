import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET() {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    let { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single()

    // Auto-create profile on first login if it doesn't exist
    if (error && error.code === 'PGRST116') {
      const emailPrefix = (user.email?.split('@')[0] ?? 'user').replace(/[^a-zA-Z0-9_]/g, '').slice(0, 20)
      const username = `${emailPrefix}_${user.id.slice(0, 4)}`
      const displayName = user.user_metadata?.display_name || user.user_metadata?.full_name || emailPrefix
      const { data: created, error: createError } = await supabase
        .from('profiles')
        .upsert({ id: user.id, username, display_name: displayName, avatar_url: null }, { onConflict: 'id' })
        .select()
        .single()
      if (createError) throw createError
      data = created
      error = null
    }

    if (error) throw error

    // Rank = count of users with strictly more points + 1
    const { count } = await supabase
      .from('profiles')
      .select('*', { count: 'exact', head: true })
      .gt('points', data.points)

    return NextResponse.json({ ...data, rank: (count ?? 0) + 1 })
  } catch {
    return NextResponse.json({ error: 'Failed to fetch profile' }, { status: 500 })
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const body = await req.json()
    const allowed = ['display_name', 'avatar_url', 'location_lat', 'location_lng']
    const updates: Record<string, unknown> = {}
    for (const key of allowed) {
      if (key in body) updates[key] = body[key]
    }

    const { data, error } = await supabase
      .from('profiles')
      .update(updates)
      .eq('id', user.id)
      .select()
      .single()

    if (error) throw error
    return NextResponse.json(data)
  } catch {
    return NextResponse.json({ error: 'Failed to update profile' }, { status: 500 })
  }
}
