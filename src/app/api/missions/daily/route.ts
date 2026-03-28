import { NextResponse } from 'next/server'
import { generateDailyChallenge } from '@/lib/daily-challenge'
import { createClient } from '@/lib/supabase/server'

export const revalidate = 0

export async function GET() {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    const challenge = generateDailyChallenge()

    let completed = false
    if (user) {
      const today = new Date().toISOString().slice(0, 10)
      const { data } = await supabase
        .from('observations')
        .select('id')
        .eq('user_id', user.id)
        .ilike('object_name', `%${challenge.object_name}%`)
        .gte('observed_at', `${today}T00:00:00Z`)
        .limit(1)

      completed = (data?.length ?? 0) > 0
    }

    return NextResponse.json({ ...challenge, completed })
  } catch {
    return NextResponse.json({ error: 'Failed' }, { status: 500 })
  }
}
