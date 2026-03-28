import { NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/service'

export const revalidate = 60

export async function GET() {
  try {
    const supabase = createServiceClient()
    const { data, error } = await supabase
      .from('missions')
      .select('*')
      .eq('active', true)

    if (error) throw error

    const order = { easy: 0, medium: 1, hard: 2 } as Record<string, number>
    const sorted = (data ?? []).sort(
      (a, b) => (order[a.difficulty] ?? 0) - (order[b.difficulty] ?? 0)
    )

    return NextResponse.json(sorted)
  } catch {
    return NextResponse.json([], { status: 200 })
  }
}
