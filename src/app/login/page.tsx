'use client'
import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Lock } from 'lucide-react'
import { SaturnLogo } from '@/components/shared/SaturnLogo'
import { useLanguage } from '@/contexts/LanguageContext'
import { createClient } from '@/lib/supabase/client'

export default function LoginPage() {
  const router = useRouter()
  const { lang } = useLanguage()
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
      const { error: signInError } = await supabase.auth.signInWithPassword({ email, password })

      if (signInError) {
        if (signInError.message.includes('Invalid login') || signInError.message.includes('invalid')) {
          setError(lang === 'ka' ? 'ელ-ფოსტა ან პაროლი არასწორია' : 'Invalid email or password')
        } else if (signInError.message.includes('Email not confirmed')) {
          setError(lang === 'ka' ? 'გთხოვ, დაადასტურე ელ-ფოსტა' : 'Please confirm your email first')
        } else {
          setError(signInError.message)
        }
        return
      }

      router.push('/dashboard')
      router.refresh()
    } catch {
      setError(lang === 'ka' ? 'კავშირის შეცდომა. სცადეთ ხელახლა.' : 'Connection error. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex flex-col relative overflow-hidden">

      {/* Animated background particles */}
      {[...Array(12)].map((_, i) => (
        <span
          key={i}
          className="auth-particle"
          style={{
            left: `${8 + i * 8}%`,
            width: i % 3 === 0 ? '2px' : '1px',
            height: i % 3 === 0 ? '2px' : '1px',
            opacity: 0.3 + (i % 4) * 0.1,
            '--dur': `${10 + i * 2.5}s`,
            '--delay': `${i * 0.9}s`,
            '--drift': `${(i % 2 === 0 ? 1 : -1) * (10 + i * 3)}px`,
          } as React.CSSProperties}
        />
      ))}

      {/* Glow blobs */}
      <div className="fixed top-[-20%] left-[-10%] w-[55vw] h-[55vw] rounded-full bg-[#6366F1]/15 blur-[130px] pointer-events-none z-0" />
      <div className="fixed bottom-[-20%] right-[-10%] w-[60vw] h-[60vw] rounded-full bg-[#A855F7]/10 blur-[150px] pointer-events-none z-0" />
      <div className="fixed top-[40%] right-[20%] w-[20vw] h-[20vw] rounded-full bg-[#38F0FF]/5 blur-[80px] pointer-events-none z-0" />

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
              {lang === 'ka' ? 'ანგარიში არ გაქვს?' : "Don't have an account?"}
            </span>
            <Link
              href="/register"
              className="text-[11px] font-bold tracking-widest text-white hover:text-[#6366F1] transition-colors uppercase"
            >
              {lang === 'ka' ? 'რეგისტრაცია' : 'Register'}
            </Link>
          </div>
        </div>
      </header>

      {/* Main */}
      <main className="relative z-10 flex flex-col items-center justify-center flex-1 py-10 px-4">
        <div className="w-full max-w-md">

          {/* Floating planet */}
          <div className="flex justify-center mb-8 animate-auth-float">
            <div className="relative">
              <div className="absolute inset-0 rounded-full bg-[#6366F1]/20 blur-2xl scale-125" />
              <SaturnLogo width={72} height={54} />
            </div>
          </div>

          {/* Title */}
          <div className="text-center mb-8 animate-auth-slide-up-1">
            <h1 className="text-4xl sm:text-5xl font-bold text-white mb-2 leading-tight">
              {lang === 'ka' ? 'კეთილი იყოს\nმობრძანება' : 'Welcome\nback'}
            </h1>
            <p className="text-slate-500 text-sm">
              {lang === 'ka' ? 'გააგრძელე შენი კოსმოსური მოგზაურობა' : 'Continue your cosmic journey'}
            </p>
          </div>

          {/* Card */}
          <div className="animate-auth-slide-up-2 animate-auth-glow bg-[#0D1117]/90 backdrop-blur-2xl border border-white/[0.08] rounded-[1.75rem] p-7 shadow-2xl">

            {/* Spinning orbit rings decoration */}
            <div className="absolute -top-8 -right-8 w-32 h-32 pointer-events-none opacity-20 hidden sm:block">
              <svg viewBox="0 0 100 100" className="w-full h-full animate-ring-spin">
                <ellipse cx="50" cy="50" rx="46" ry="18" fill="none" stroke="#6366F1" strokeWidth="0.8" strokeDasharray="4 3" />
              </svg>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Email */}
              <div className="space-y-1.5 animate-auth-slide-up-3">
                <label className="text-[10px] font-bold uppercase tracking-widest text-slate-500 ml-1">
                  {lang === 'ka' ? 'ელ-ფოსტის მისამართი' : 'Email address'}
                </label>
                <div className="relative group">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-600 group-focus-within:text-[#6366F1] transition-colors text-sm font-semibold select-none">@</span>
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
                  {lang === 'ka' ? 'პაროლი' : 'Password'}
                </label>
                <div className="relative group">
                  <Lock size={13} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-600 group-focus-within:text-[#6366F1] transition-colors" />
                  <input
                    type="password"
                    required
                    autoComplete="current-password"
                    placeholder="••••••••"
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    className="w-full bg-white/[0.04] border border-white/[0.08] rounded-2xl py-3.5 pl-10 pr-4 text-white placeholder:text-slate-700 focus:outline-none focus:border-[#6366F1]/60 focus:bg-white/[0.06] transition-all"
                  />
                </div>
              </div>

              {error && (
                <div className="animate-auth-slide-up bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3">
                  <p className="text-red-400 text-sm text-center">{error}</p>
                </div>
              )}

              <div className="animate-auth-slide-up-5 pt-1">
                <button
                  type="submit"
                  disabled={loading}
                  className="relative w-full py-3.5 bg-white hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed text-[#090C14] font-bold rounded-2xl transition-all overflow-hidden group"
                >
                  <span className="absolute inset-0 bg-gradient-to-r from-[#6366F1]/0 via-white/10 to-[#6366F1]/0 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700" />
                  {loading
                    ? (lang === 'ka' ? 'შესვლა...' : 'Signing in...')
                    : (lang === 'ka' ? 'შესვლა' : 'Sign in')}
                </button>
              </div>
            </form>

            <p className="text-center text-xs text-slate-600 mt-5">
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
