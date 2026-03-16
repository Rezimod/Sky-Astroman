import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(req: NextRequest) {
  try {
    const supabase = await createClient()
    const { searchParams } = new URL(req.url)
    const status = searchParams.get('status') ?? 'approved'
    const limit = parseInt(searchParams.get('limit') ?? '20')
    const offset = parseInt(searchParams.get('offset') ?? '0')

    const { data, error } = await supabase
      .from('observations')
      .select('*')
      .eq('status', status)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1)

    if (error) throw error
    return NextResponse.json(data)
  } catch (err) {
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
