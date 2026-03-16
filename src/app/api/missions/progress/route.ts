import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(req: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { data, error } = await supabase
      .from('mission_progress')
      .select('*')
      .eq('user_id', user.id)

    if (error) throw error
    return NextResponse.json(data)
  } catch {
    return NextResponse.json({ error: 'Failed to fetch progress' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { mission_id } = await req.json()
    if (!mission_id) return NextResponse.json({ error: 'mission_id required' }, { status: 400 })

    const { data, error } = await supabase
      .from('mission_progress')
      .upsert({
        user_id: user.id,
        mission_id,
        status: 'completed',
        completed_at: new Date().toISOString(),
      }, { onConflict: 'user_id,mission_id' })
      .select()
      .single()

    if (error) throw error
    return NextResponse.json(data)
  } catch {
    return NextResponse.json({ error: 'Failed to update progress' }, { status: 500 })
  }
}
