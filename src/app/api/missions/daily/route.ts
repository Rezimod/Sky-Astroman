import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET() {
  try {
    const supabase = await createClient()
    const today = new Date().toISOString().slice(0, 10)

    const { data, error } = await supabase
      .from('missions')
      .select('*')
      .eq('active', true)
      .eq('is_daily', true)
      .gte('created_at', `${today}T00:00:00Z`)
      .order('created_at', { ascending: false })
      .limit(1)
      .single()

    if (error && error.code !== 'PGRST116') throw error

    return NextResponse.json(data ?? null)
  } catch {
    return NextResponse.json({ error: 'Failed to fetch daily challenge' }, { status: 500 })
  }
}
