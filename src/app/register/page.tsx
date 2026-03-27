'use client'
import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Lock, User, Mail, CheckCircle } from 'lucide-react'
import { SaturnLogo } from '@/components/shared/SaturnLogo'
import { useLanguage } from '@/contexts/LanguageContext'
import { createClient } from '@/lib/supabase/client'

export default function RegisterPage() {
  const router = useRouter()
  const { lang } = useLanguage()
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [done, setDone] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')

    if (password !== confirmPassword) {
      setError(lang === 'ka' ? 'პაროლები არ ემთხვევა' : 'Passwords do not match')
      return
    }
    if (password.length < 6) {
      setError(lang === 'ka' ? 'პაროლი მინიმუმ 6 სიმბოლო უნდა იყოს' : 'Password must be at least 6 characters')
      return
    }

    setLoading(true)

    try {
      const supabase = createClient()

      const { data, error: signUpError } = await supabase.auth.signUp({
        email: email.trim().toLowerCase(),
        password,
        options: {
          data: { full_name: name.trim(), display_name: name.trim() },
          emailRedirectTo: `${window.location.origin}/auth/callback`,
        },
      })

      if (signUpError) {
        if (signUpError.message.toLowerCase().includes('already registered') || signUpError.message.toLowerCase().includes('already been registered') || signUpError.message.toLowerCase().includes('user already registered')) {
          setError(lang === 'ka' ? 'ეს ელ-ფოსტა უკვე რეგისტრირებულია' : 'This email is already registered')
        } else {
          setError(signUpError.message)
        }
        return
      }

      if (data.user) {
        if (data.session) {
          // Create profile via server route (bypasses RLS)
          await fetch('/api/auth/profile', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ display_name: name.trim() }),
          })
          router.push('/dashboard')
          router.refresh()
        } else {
          // Email confirmation required (fallback if re-enabled)
          setDone(true)
        }
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err)
      setError(msg || (lang === 'ka' ? 'შეცდომა. სცადეთ ხელახლა.' : 'Something went wrong. Please try again.'))
    } finally {
      setLoading(false)
    }
  }

  // ── Email confirmation sent screen ──
  if (done) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center relative overflow-hidden px-4">
        <div className="fixed top-[-20%] left-[-10%] w-[55vw] h-[55vw] rounded-full bg-[#6366F1]/15 blur-[130px] pointer-events-none z-0" />
        <div className="fixed bottom-[-20%] right-[-10%] w-[60vw] h-[60vw] rounded-full bg-[#A855F7]/10 blur-[150px] pointer-events-none z-0" />
        <div className="relative z-10 text-center max-w-sm animate-auth-slide-up">
          <div className="flex justify-center mb-6">
            <div className="w-20 h-20 rounded-full bg-[#6366F1]/10 border border-[#6366F1]/20 flex items-center justify-center">
              <CheckCircle size={36} className="text-[#6366F1]" strokeWidth={1.5} />
            </div>
          </div>
          <h2 className="text-3xl font-bold text-white mb-3">
            {lang === 'ka' ? 'შეამოწმე ელ-ფოსტა' : 'Check your email'}
          </h2>
          <p className="text-slate-400 text-sm mb-2">
            {lang === 'ka'
              ? `დადასტურების ბმული გაიგზავნა:`
              : 'A confirmation link was sent to:'}
          </p>
          <p className="text-white font-semibold text-sm mb-8 bg-white/5 border border-white/10 rounded-xl px-4 py-2 inline-block">{email}</p>
          <p className="text-slate-500 text-xs mb-8">
            {lang === 'ka'
              ? 'ბმულს ვადა 24 საათი აქვს. შეამოწმე spam/junk საქაღალდეც.'
              : 'The link expires in 24 hours. Check your spam folder if you don\'t see it.'}
          </p>
          <Link
            href="/login"
            className="inline-flex items-center gap-2 text-[#6366F1] hover:text-[#818CF8] text-sm font-semibold transition-colors"
          >
            ← {lang === 'ka' ? 'შესვლის გვერდი' : 'Back to sign in'}
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex flex-col relative overflow-hidden">

      {/* Animated background particles */}
      {[...Array(14)].map((_, i) => (
        <span
          key={i}
          className="auth-particle"
          style={{
            left: `${5 + i * 7}%`,
            width: i % 4 === 0 ? '2px' : '1px',
            height: i % 4 === 0 ? '2px' : '1px',
            '--dur': `${11 + i * 2.2}s`,
            '--delay': `${i * 0.7}s`,
            '--drift': `${(i % 2 === 0 ? 1 : -1) * (8 + i * 4)}px`,
          } as React.CSSProperties}
        />
      ))}

      {/* Glow blobs */}
      <div className="fixed top-[-20%] left-[-10%] w-[55vw] h-[55vw] rounded-full bg-[#6366F1]/15 blur-[130px] pointer-events-none z-0" />
      <div className="fixed bottom-[-20%] right-[-10%] w-[60vw] h-[60vw] rounded-full bg-[#A855F7]/10 blur-[150px] pointer-events-none z-0" />
      <div className="fixed top-[30%] left-[15%] w-[18vw] h-[18vw] rounded-full bg-[#38F0FF]/4 blur-[70px] pointer-events-none z-0" />

      {/* Header */}
      <header className="relative z-50 border-b border-white/[0.07] bg-[#090C14]/70 backdrop-blur-xl">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between gap-4">
          <Link href="/" className="flex items-center gap-2 shrink-0">
            <SaturnLogo width={32} height={24} />
            <span className="text-xs font-bold tracking-[0.18em] text-white uppercase">
              Sky<span className="text-[#6366F1]">watcher</span>
            </span>
          </Link>
          <div className="flex items-center gap-3">
            <span className="text-slate-500 text-xs hidden sm:block">
              {lang === 'ka' ? 'უკვე გაქვს ანგარიში?' : 'Already have an account?'}
            </span>
            <Link
              href="/login"
              className="text-[11px] font-bold tracking-widest text-white hover:text-[#6366F1] transition-colors uppercase"
            >
              {lang === 'ka' ? 'შესვლა' : 'Sign in'}
            </Link>
          </div>
        </div>
      </header>

      {/* Main */}
      <main className="relative z-10 flex flex-col items-center justify-center flex-1 py-8 px-4">
        <div className="w-full max-w-md">

          {/* Floating planet */}
          <div className="flex justify-center mb-6 animate-auth-float">
            <div className="relative">
              <div className="absolute inset-0 rounded-full bg-[#A855F7]/20 blur-2xl scale-150" />
              <SaturnLogo width={64} height={48} />
            </div>
          </div>

          {/* Title */}
          <div className="text-center mb-6 animate-auth-slide-up-1">
            <h1 className="text-3xl sm:text-4xl font-bold text-white mb-2 leading-tight">
              {lang === 'ka' ? 'შექმენი ანგარიში' : 'Create account'}
            </h1>
            <p className="text-slate-500 text-sm">
              {lang === 'ka' ? 'დაიწყე კოსმოსური მოგზაურობა' : 'Start your cosmic journey'}
            </p>
          </div>

          {/* Card */}
          <div className="animate-auth-slide-up-2 animate-auth-glow bg-[#0D1117]/90 backdrop-blur-2xl border border-white/[0.08] rounded-[1.75rem] p-7 shadow-2xl">

            <form onSubmit={handleSubmit} className="space-y-3.5">
              {/* Name */}
              <div className="space-y-1.5 animate-auth-slide-up-2">
                <label className="text-[10px] font-bold uppercase tracking-widest text-slate-500 ml-1">
                  {lang === 'ka' ? 'სახელი' : 'Name'}
                </label>
                <div className="relative group">
                  <User size={13} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-600 group-focus-within:text-[#6366F1] transition-colors" />
                  <input
                    type="text"
                    required
                    autoComplete="name"
                    placeholder={lang === 'ka' ? 'შენი სახელი' : 'Your name'}
                    value={name}
                    onChange={e => setName(e.target.value)}
                    className="w-full bg-white/[0.04] border border-white/[0.08] rounded-2xl py-3.5 pl-10 pr-4 text-white placeholder:text-slate-700 focus:outline-none focus:border-[#6366F1]/60 focus:bg-white/[0.06] transition-all"
                  />
                </div>
              </div>

              {/* Email */}
              <div className="space-y-1.5 animate-auth-slide-up-3">
                <label className="text-[10px] font-bold uppercase tracking-widest text-slate-500 ml-1">
                  {lang === 'ka' ? 'ელ-ფოსტა' : 'Email'}
                </label>
                <div className="relative group">
                  <Mail size={13} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-600 group-focus-within:text-[#6366F1] transition-colors" />
                  <input
                    type="email"
                    required
                    autoComplete="email"
                    placeholder="example@mail.com"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    className="w-full bg-white/[0.04] border border-white/[0.08] rounded-2xl py-3.5 pl-10 pr-4 text-white placeholder:text-slate-700 focus:outline-none focus:border-[#6366F1]/60 focus:bg-white/[0.06] transition-all"
                  />
                </div>
              </div>

              {/* Password */}
              <div className="space-y-1.5 animate-auth-slide-up-4">
                <label className="text-[10px] font-bold uppercase tracking-widest text-slate-500 ml-1">
                  {lang === 'ka' ? 'პაროლი (მინ. 6 სიმბოლო)' : 'Password (min. 6 chars)'}
                </label>
                <div className="relative group">
                  <Lock size={13} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-600 group-focus-within:text-[#6366F1] transition-colors" />
                  <input
                    type="password"
                    required
                    minLength={6}
                    autoComplete="new-password"
                    placeholder="••••••••"
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    className="w-full bg-white/[0.04] border border-white/[0.08] rounded-2xl py-3.5 pl-10 pr-4 text-white placeholder:text-slate-700 focus:outline-none focus:border-[#6366F1]/60 focus:bg-white/[0.06] transition-all"
                  />
                </div>
              </div>

              {/* Confirm Password */}
              <div className="space-y-1.5 animate-auth-slide-up-5">
                <label className="text-[10px] font-bold uppercase tracking-widest text-slate-500 ml-1">
                  {lang === 'ka' ? 'გაიმეორე პაროლი' : 'Confirm password'}
                </label>
                <div className="relative group">
                  <Lock size={13} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-600 group-focus-within:text-[#6366F1] transition-colors" />
                  <input
                    type="password"
                    required
                    minLength={6}
                    autoComplete="new-password"
                    placeholder="••••••••"
                    value={confirmPassword}
                    onChange={e => setConfirmPassword(e.target.value)}
                    className="w-full bg-white/[0.04] border border-white/[0.08] rounded-2xl py-3.5 pl-10 pr-4 text-white placeholder:text-slate-700 focus:outline-none focus:border-[#6366F1]/60 focus:bg-white/[0.06] transition-all"
                  />
                </div>
              </div>

              {error && (
                <div className="animate-auth-slide-up bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3">
                  <p className="text-red-400 text-sm text-center">{error}</p>
                </div>
              )}

              <div className="pt-1">
                <button
                  type="submit"
                  disabled={loading}
                  className="relative w-full py-3.5 bg-white hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed text-[#090C14] font-bold rounded-2xl transition-all overflow-hidden group"
                >
                  <span className="absolute inset-0 bg-gradient-to-r from-[#6366F1]/0 via-white/10 to-[#6366F1]/0 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700" />
                  {loading
                    ? (lang === 'ka' ? 'იქმნება ანგარიში...' : 'Creating account...')
                    : (lang === 'ka' ? 'ანგარიშის შექმნა' : 'Create account')}
                </button>
              </div>
            </form>

            <p className="text-center text-xs text-slate-600 mt-5">
              {lang === 'ka' ? 'უკვე გაქვს ანგარიში? ' : 'Already have an account? '}
              <Link href="/login" className="text-[#6366F1] hover:text-[#818CF8] font-semibold transition-colors">
                {lang === 'ka' ? 'შესვლა' : 'Sign in'}
              </Link>
            </p>
          </div>
        </div>
      </main>
    </div>
  )
}
