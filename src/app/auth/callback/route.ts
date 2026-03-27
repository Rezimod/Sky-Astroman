import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(req: NextRequest) {
  const { searchParams, origin } = new URL(req.url)
  const code = searchParams.get('code')
  const next = searchParams.get('next') ?? '/dashboard'

  if (code) {
    const supabase = await createClient()
    const { error } = await supabase.auth.exchangeCodeForSession(code)

    if (!error) {
      const { data: { user } } = await supabase.auth.getUser()

      if (user) {
        // Build a guaranteed-unique username from email prefix + short uid
        const emailPrefix = (user.email?.split('@')[0] ?? 'user')
          .replace(/[^a-zA-Z0-9_]/g, '')
          .slice(0, 20)
        const username = `${emailPrefix}_${user.id.slice(0, 4)}`

        await supabase.from('profiles').upsert({
          id: user.id,
          username,
          display_name: user.user_metadata?.display_name
            ?? user.user_metadata?.full_name
            ?? emailPrefix,
          avatar_url: user.user_metadata?.avatar_url ?? null,
        }, { onConflict: 'id', ignoreDuplicates: false })
      }

      return NextResponse.redirect(`${origin}${next}`)
    }
  }

  return NextResponse.redirect(`${origin}/login?error=auth_failed`)
}
