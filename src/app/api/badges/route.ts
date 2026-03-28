import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json([])

    const { data, error } = await supabase
      .from('user_badges')
      .select('badge_id, earned_at')
      .eq('user_id', user.id)
      .order('earned_at', { ascending: true })

    if (error) throw error
    return NextResponse.json(data ?? [])
  } catch {
    // Table may not exist yet
    return NextResponse.json([])
  }
}
