'use client'
import { useState, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { Lock, Mail } from 'lucide-react'
import { SaturnLogo } from '@/components/shared/SaturnLogo'
import { useLanguage } from '@/contexts/LanguageContext'
import { createClient } from '@/lib/supabase/client'

function LoginForm() {
  const { lang } = useLanguage()
  const searchParams = useSearchParams()
  const redirectTo = searchParams.get('redirectTo') || '/dashboard'
  const registered = searchParams.get('registered') === '1'
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      const supabase = createClient()
      const { error: signInError } = await supabase.auth.signInWithPassword({ email: email.trim().toLowerCase(), password })

      if (signInError) {
        const msg = signInError.message.toLowerCase()
        if (msg.includes('invalid login') || msg.includes('invalid credentials') || msg.includes('invalid')) {
          setError(lang === 'ka' ? 'ელ-ფოსტა ან პაროლი არასწორია' : 'Invalid email or password')
        } else if (msg.includes('email not confirmed')) {
          setError(lang === 'ka' ? 'გთხოვ, ელ-ფოსტა დაადასტურე' : 'Please confirm your email first')
        } else {
          setError(signInError.message)
        }
        return
      }

      window.location.replace(redirectTo)
    } catch {
      setError(lang === 'ka' ? 'კავშირის შეცდომა. სცადეთ ხელახლა.' : 'Connection error. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex flex-col relative overflow-hidden">

      {/* Header */}
      <header className="relative z-50 border-b border-white/[0.06] bg-[#06080F]/75 backdrop-blur-xl">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2 shrink-0">
            <SaturnLogo width={22} height={22} />
            <span className="text-sm font-bold tracking-[0.14em] text-white uppercase">
              Ste<span className="text-[#6366F1]">llar</span>
            </span>
          </Link>
          <div className="flex items-center gap-3">
            <span className="text-[#475569] text-xs hidden sm:block">
              {lang === 'ka' ? 'ანგარიში არ გაქვს?' : "Don't have an account?"}
            </span>
            <Link href="/register" className="text-[11px] font-bold tracking-widest text-[#6366F1] hover:text-[#818CF8] transition-colors uppercase">
              {lang === 'ka' ? 'რეგისტრაცია' : 'Register'}
            </Link>
          </div>
        </div>
      </header>

      {/* Main */}
      <main className="relative z-10 flex flex-col items-center justify-center flex-1 py-8 px-4">
        <div className="w-full max-w-sm">

          {/* Logo */}
          <div className="flex justify-center mb-6">
            <div className="relative">
              <div className="absolute inset-0 rounded-full bg-[#6366F1]/18 blur-2xl scale-150" />
              <SaturnLogo width={58} height={58} />
            </div>
          </div>

          {/* Title */}
          <div className="text-center mb-6">
            <h1 className="text-2xl sm:text-3xl font-bold text-white mb-1 leading-tight">
              {lang === 'ka' ? 'კეთილი მობრძანება' : 'Welcome back'}
            </h1>
            <p className="text-[#64748B] text-sm">
              {lang === 'ka' ? 'გააგრძელე კოსმოსური მოგზაურობა' : 'Continue your cosmic journey'}
            </p>
          </div>

          {registered && (
            <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-xl px-4 py-2.5 mb-4">
              <p className="text-emerald-400 text-sm text-center">
                {lang === 'ka' ? 'ანგარიში შეიქმნა! შედი სისტემაში.' : 'Account created! Please sign in.'}
              </p>
            </div>
          )}

          {/* Card */}
          <div className="bg-[#0A0E1A]/90 backdrop-blur-2xl border border-white/[0.08] rounded-2xl p-6 shadow-2xl">

            <form onSubmit={handleSubmit} className="space-y-3.5">

              {/* Email */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold uppercase tracking-widest text-[#64748B] ml-1">
                  {lang === 'ka' ? 'ელ-ფოსტა' : 'Email'}
                </label>
                <div className="relative group">
                  <Mail size={13} className="absolute left-4 top-1/2 -translate-y-1/2 text-[#475569] group-focus-within:text-[#6366F1] transition-colors pointer-events-none" />
                  <input
                    type="email"
                    required
                    autoComplete="email"
                    placeholder="example@mail.com"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl py-3 pl-10 pr-4 text-sm text-white placeholder:text-[#334155] focus:outline-none focus:border-[#6366F1]/55 focus:bg-white/[0.06] transition-all"
                  />
                </div>
              </div>

              {/* Password */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold uppercase tracking-widest text-[#64748B] ml-1">
                  {lang === 'ka' ? 'პაროლი' : 'Password'}
                </label>
                <div className="relative group">
                  <Lock size={13} className="absolute left-4 top-1/2 -translate-y-1/2 text-[#475569] group-focus-within:text-[#6366F1] transition-colors pointer-events-none" />
                  <input
                    type="password"
                    required
                    autoComplete="current-password"
                    placeholder="••••••••"
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl py-3 pl-10 pr-4 text-sm text-white placeholder:text-[#334155] focus:outline-none focus:border-[#6366F1]/55 focus:bg-white/[0.06] transition-all"
                  />
                </div>
              </div>

              {error && (
                <div className="bg-rose-500/10 border border-rose-500/20 rounded-xl px-4 py-2.5">
                  <p className="text-rose-400 text-sm text-center">{error}</p>
                </div>
              )}

              <div className="pt-1">
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-3 bg-[#6366F1] hover:bg-[#4F46E5] disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold rounded-xl transition-all text-sm tracking-wide shadow-lg shadow-indigo-500/20"
                >
                  {loading
                    ? (lang === 'ka' ? 'შესვლა...' : 'Signing in...')
                    : (lang === 'ka' ? 'შესვლა' : 'Sign in')}
                </button>
              </div>
            </form>

            <p className="text-center text-xs text-[#475569] mt-4">
              {lang === 'ka' ? 'ანგარიში არ გაქვს? ' : "Don't have an account? "}
              <Link href="/register" className="text-[#6366F1] hover:text-[#818CF8] font-semibold transition-colors">
                {lang === 'ka' ? 'დარეგისტრირდი' : 'Register'}
              </Link>
            </p>
          </div>
        </div>
      </main>
    </div>
  )
}

export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  )
}
