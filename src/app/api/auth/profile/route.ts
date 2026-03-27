import { createServiceClient } from '@/lib/supabase/service'
import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { display_name } = await req.json().catch(() => ({}))

  const emailPrefix = (user.email?.split('@')[0] ?? 'user')
    .replace(/[^a-zA-Z0-9_]/g, '')
    .slice(0, 20)
  const username = `${emailPrefix}_${user.id.slice(0, 4)}`

  const admin = createServiceClient()
  const { error } = await admin.from('profiles').upsert({
    id: user.id,
    username,
    display_name: display_name || user.user_metadata?.display_name || emailPrefix,
    avatar_url: user.user_metadata?.avatar_url ?? null,
  }, { onConflict: 'id', ignoreDuplicates: true })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}
