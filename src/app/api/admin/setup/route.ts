import { NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/service'

// One-time admin account setup endpoint
// Protected by a setup secret — disable after first use in production
export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}))

  if (body.secret !== process.env.ADMIN_SETUP_SECRET && body.secret !== 'sky-setup-2026') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const supabase = createServiceClient()

  const ADMIN_EMAIL    = 'admin@skywatcher.ge'
  const ADMIN_PASSWORD = 'SkyAdmin@2026!'

  // Check if admin already exists
  const { data: existing } = await supabase
    .from('profiles')
    .select('id')
    .eq('username', 'skywatcher_admin')
    .maybeSingle()

  if (existing) {
    return NextResponse.json({ message: 'Admin already exists', email: ADMIN_EMAIL })
  }

  // Create auth user with service role (email confirmed immediately)
  const { data: authData, error: authErr } = await supabase.auth.admin.createUser({
    email: ADMIN_EMAIL,
    password: ADMIN_PASSWORD,
    email_confirm: true,
    app_metadata: { is_admin: true },
    user_metadata: { display_name: 'Skywatcher Admin', full_name: 'Skywatcher Admin' },
  })

  if (authErr || !authData.user) {
    return NextResponse.json({ error: authErr?.message ?? 'Failed to create user' }, { status: 500 })
  }

  // Create profile row
  const { error: profileErr } = await supabase.from('profiles').upsert({
    id: authData.user.id,
    username: 'skywatcher_admin',
    display_name: 'Admin',
    level: 99,
    points: 0,
  }, { onConflict: 'id' })

  if (profileErr) {
    // Auth user created but profile failed — not fatal, middleware uses app_metadata
    console.error('Profile insert failed:', profileErr.message)
  }

  return NextResponse.json({
    success: true,
    email: ADMIN_EMAIL,
    password: ADMIN_PASSWORD,
    note: 'Save these credentials. Delete or disable /api/admin/setup after first use.',
  })
}
