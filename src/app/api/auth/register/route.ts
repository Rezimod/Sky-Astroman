import { createServiceClient } from '@/lib/supabase/service'
import { NextRequest, NextResponse } from 'next/server'
import { Resend } from 'resend'

const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null

async function sendWelcomeEmail(email: string, name: string) {
  if (!resend) return
  const displayName = name || email.split('@')[0]

  await resend.emails.send({
    from: 'Stellar <welcome@stellar.ge>',
    to: email,
    subject: 'Welcome to Stellar — Your cosmic journey begins',
    html: `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Welcome to Stellar</title>
  <style>
    body { margin: 0; padding: 0; background: #06080F; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; color: #e2e8f0; }
    .wrapper { max-width: 560px; margin: 0 auto; padding: 40px 20px; }
    .logo { text-align: center; margin-bottom: 32px; }
    .logo-icon { display: inline-block; width: 48px; height: 48px; }
    .logo-text { font-size: 22px; font-weight: 800; letter-spacing: 0.12em; color: #ffffff; text-transform: uppercase; margin-top: 10px; }
    .logo-text span { color: #6366F1; }
    .card { background: #0A0E1A; border: 1px solid rgba(255,255,255,0.08); border-radius: 16px; padding: 32px; }
    h1 { font-size: 24px; font-weight: 700; color: #ffffff; margin: 0 0 8px; }
    .subtitle { color: #64748B; font-size: 14px; margin: 0 0 28px; }
    .divider { height: 1px; background: rgba(255,255,255,0.06); margin: 24px 0; }
    .steps-title { font-size: 11px; font-weight: 700; letter-spacing: 0.12em; text-transform: uppercase; color: #64748B; margin-bottom: 16px; }
    .step { display: flex; align-items: flex-start; gap: 14px; margin-bottom: 18px; }
    .step-num { flex-shrink: 0; width: 28px; height: 28px; border-radius: 8px; background: rgba(99,102,241,0.15); border: 1px solid rgba(99,102,241,0.25); display: flex; align-items: center; justify-content: center; font-size: 11px; font-weight: 800; color: #818CF8; line-height: 28px; text-align: center; }
    .step-body h3 { margin: 0 0 3px; font-size: 13px; font-weight: 700; color: #ffffff; }
    .step-body p { margin: 0; font-size: 12px; color: #64748B; line-height: 1.5; }
    .cta { display: block; text-align: center; margin: 28px 0 0; background: #6366F1; color: #ffffff; text-decoration: none; font-weight: 700; font-size: 14px; letter-spacing: 0.05em; padding: 14px 32px; border-radius: 12px; }
    .footer { text-align: center; margin-top: 28px; font-size: 11px; color: #334155; }
  </style>
</head>
<body>
  <div class="wrapper">
    <div class="logo">
      <svg class="logo-icon" viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
        <circle cx="20" cy="20" r="17" fill="none" stroke="rgba(99,102,241,0.3)" stroke-width="1"/>
        <path d="M20 4 L22.5 15 L33 12 L25.5 20 L33 28 L22.5 25 L20 36 L17.5 25 L7 28 L14.5 20 L7 12 L17.5 15 Z" fill="url(#grad)"/>
        <circle cx="20" cy="20" r="3.5" fill="rgba(165,180,252,0.7)"/>
        <defs>
          <linearGradient id="grad" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stop-color="#A5B4FC"/>
            <stop offset="100%" stop-color="#4338CA"/>
          </linearGradient>
        </defs>
      </svg>
      <div class="logo-text">Ste<span>llar</span></div>
    </div>

    <div class="card">
      <h1>Welcome, ${displayName}</h1>
      <p class="subtitle">Your account is ready. Here's how to get started.</p>

      <div class="divider"></div>

      <div class="steps-title">How to use Stellar</div>

      <div class="step">
        <div class="step-num">1</div>
        <div class="step-body">
          <h3>Check the Sky</h3>
          <p>Go to <strong>Sky Conditions</strong> to see tonight's cloud cover, moon phase, and the best viewing window for Tbilisi.</p>
        </div>
      </div>

      <div class="step">
        <div class="step-num">2</div>
        <div class="step-body">
          <h3>Pick a Mission</h3>
          <p>Open <strong>Missions</strong> to see what celestial objects are visible tonight. Each mission shows the object, difficulty, and XP reward.</p>
        </div>
      </div>

      <div class="step">
        <div class="step-num">3</div>
        <div class="step-body">
          <h3>Go Outside & Observe</h3>
          <p>Head out with your telescope or naked eye. Photograph the target object — even a phone photo works.</p>
        </div>
      </div>

      <div class="step">
        <div class="step-num">4</div>
        <div class="step-body">
          <h3>Submit & Earn XP</h3>
          <p>Tap <strong>Begin</strong> on the mission and upload your photo. An admin reviews it and awards your points within 24h.</p>
        </div>
      </div>

      <div class="step">
        <div class="step-num">5</div>
        <div class="step-body">
          <h3>Climb the Leaderboard</h3>
          <p>Track your rank in <strong>Leaderboard</strong>. Complete more missions to level up and unlock badges.</p>
        </div>
      </div>

      <a href="https://sky-astroman.vercel.app/dashboard" class="cta">Open Stellar →</a>
    </div>

    <div class="footer">
      Stellar · Tbilisi, Georgia<br/>
      You're receiving this because you just created an account.
    </div>
  </div>
</body>
</html>
    `.trim(),
  })
}

export async function POST(req: NextRequest) {
  try {
    const { email, password, name } = await req.json()

    if (!email || !password) {
      return NextResponse.json({ error: 'Email and password are required' }, { status: 400 })
    }

    const supabase = createServiceClient()

    // Create user with email already confirmed — no confirmation email sent
    const { data, error } = await supabase.auth.admin.createUser({
      email: email.trim().toLowerCase(),
      password,
      email_confirm: true,
      user_metadata: {
        full_name: name?.trim() ?? '',
        display_name: name?.trim() ?? '',
      },
    })

    if (error) {
      const msg = error.message.toLowerCase()
      if (msg.includes('already registered') || msg.includes('already been registered') || msg.includes('user already registered')) {
        return NextResponse.json({ error: 'EMAIL_EXISTS' }, { status: 400 })
      }
      return NextResponse.json({ error: error.message }, { status: 400 })
    }

    if (!data.user) {
      return NextResponse.json({ error: 'Failed to create user' }, { status: 500 })
    }

    // Create profile immediately
    const emailPrefix = (email.split('@')[0] ?? 'user')
      .replace(/[^a-zA-Z0-9_]/g, '')
      .slice(0, 20)
    const username = `${emailPrefix}_${data.user.id.slice(0, 4)}`

    await supabase.from('profiles').upsert({
      id: data.user.id,
      username,
      display_name: name?.trim() || emailPrefix,
      avatar_url: null,
    }, { onConflict: 'id', ignoreDuplicates: false })

    // Send welcome email — fails silently if not configured
    try {
      await sendWelcomeEmail(email.trim().toLowerCase(), name?.trim() ?? '')
    } catch {}

    return NextResponse.json({ success: true })
  } catch (err) {
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
