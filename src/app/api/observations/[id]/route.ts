import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const supabase = await createClient()
    const { data, error } = await supabase
      .from('observations')
      .select('*')
      .eq('id', id)
      .single()

    if (error) throw error
    return NextResponse.json(data)
  } catch {
    return NextResponse.json({ error: 'Observation not found' }, { status: 404 })
  }
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const body = await req.json()
    const { status, points_awarded } = body

    if (!['approved', 'rejected'].includes(status)) {
      return NextResponse.json({ error: 'Invalid status' }, { status: 400 })
    }

    const updates: Record<string, unknown> = {
      status,
      reviewed_by: user.id,
      reviewed_at: new Date().toISOString(),
    }
    if (status === 'approved' && points_awarded) {
      updates.points_awarded = points_awarded
    }

    const { data, error } = await supabase
      .from('observations')
      .update(updates)
      .eq('id', id)
      .select()
      .single()

    if (error) throw error

    // Award points to user if approved
    if (status === 'approved' && points_awarded && data.user_id) {
      await supabase.rpc('increment_user_points', {
        p_user_id: data.user_id,
        p_points: points_awarded,
      })
    }

    return NextResponse.json(data)
  } catch {
    return NextResponse.json({ error: 'Failed to update observation' }, { status: 500 })
  }
}
