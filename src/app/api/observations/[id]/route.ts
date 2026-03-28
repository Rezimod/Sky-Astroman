import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'

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

    // Verify admin
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    if (user.app_metadata?.is_admin !== true) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const body = await req.json()
    const { status, points_awarded } = body

    if (!['approved', 'rejected'].includes(status)) {
      return NextResponse.json({ error: 'Invalid status' }, { status: 400 })
    }

    const service = createServiceClient()

    const updates: Record<string, unknown> = {
      status,
      reviewed_by: user.id,
      reviewed_at: new Date().toISOString(),
    }
    if (status === 'approved' && points_awarded != null) {
      updates.points_awarded = points_awarded
    }

    const { data, error } = await service
      .from('observations')
      .update(updates)
      .eq('id', id)
      .select()
      .single()

    if (error) throw error

    if (status === 'approved' && data.user_id) {
      const pts = Number(points_awarded ?? 0)

      // Award points via RPC
      if (pts > 0) {
        await service.rpc('increment_user_points', {
          p_user_id: data.user_id,
          p_points: pts,
        })
      }

      // Increment observations_count
      const { data: profile } = await service
        .from('profiles')
        .select('observations_count')
        .eq('id', data.user_id)
        .single()

      await service
        .from('profiles')
        .update({ observations_count: (profile?.observations_count ?? 0) + 1 })
        .eq('id', data.user_id)

      // Complete matching missions
      if (data.object_name) {
        const { data: missions } = await service
          .from('missions')
          .select('id')
          .eq('object_name', data.object_name)
          .eq('active', true)

        if (missions?.length) {
          for (const mission of missions) {
            await service.from('mission_progress').upsert(
              {
                user_id: data.user_id,
                mission_id: mission.id,
                status: 'completed',
                completed_at: new Date().toISOString(),
              },
              { onConflict: 'user_id,mission_id' }
            )
          }
        }
      }
    }

    return NextResponse.json(data)
  } catch {
    return NextResponse.json({ error: 'Failed to update observation' }, { status: 500 })
  }
}
