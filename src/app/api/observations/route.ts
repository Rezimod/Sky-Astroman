import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(req: NextRequest) {
  try {
    const supabase = await createClient()
    const { searchParams } = new URL(req.url)
    const status = searchParams.get('status') ?? 'approved'
    const limit = parseInt(searchParams.get('limit') ?? '50')
    const offset = parseInt(searchParams.get('offset') ?? '0')

    let query = supabase
      .from('observations')
      .select('id, user_id, object_name, description, photo_url, telescope_used, location_lat, location_lng, observed_at, created_at, status, points_awarded, profiles(username, display_name)')
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1)

    const mine = searchParams.get('mine') === 'true'

    if (mine) {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return NextResponse.json([])
      query = query.eq('user_id', user.id)
      if (status !== 'all') query = query.eq('status', status)
    } else if (status === 'approved') {
      query = query.eq('status', 'approved')
    } else if (status === 'pending' || status === 'rejected') {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return NextResponse.json([])
      query = query.eq('status', status).eq('user_id', user.id)
    }

    const { data, error } = await query
    if (error) throw error
    return NextResponse.json(data ?? [])
  } catch {
    return NextResponse.json({ error: 'Failed to fetch observations' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const body = await req.json()
    const { object_name, description, photo_url, telescope_used, location_lat, location_lng, observed_at } = body

    if (!object_name || !observed_at) {
      return NextResponse.json({ error: 'object_name and observed_at are required' }, { status: 400 })
    }

    const { data, error } = await supabase
      .from('observations')
      .insert({
        user_id: user.id,
        object_name,
        description,
        photo_url,
        telescope_used,
        location_lat,
        location_lng,
        observed_at,
        status: 'pending',
      })
      .select()
      .single()

    if (error) throw error
    return NextResponse.json(data, { status: 201 })
  } catch (err) {
    return NextResponse.json({ error: 'Failed to create observation' }, { status: 500 })
  }
}
