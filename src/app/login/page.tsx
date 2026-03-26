'use client'
import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Telescope } from 'lucide-react'
import { useLanguage } from '@/contexts/LanguageContext'
import { createClient } from '@/lib/supabase/client'

export default function LoginPage() {
  const router = useRouter()
  const { t, lang } = useLanguage()
  const [mode, setMode] = useState<'signin' | 'signup'>('signin')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setMessage('')
    setLoading(true)
    const supabase = createClient()

    if (mode === 'signin') {
      const { error } = await supabase.auth.signInWithPassword({ email, password })
      if (error) setError(t('login.error'))
      else { router.push('/dashboard'); router.refresh() }
    } else {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: { emailRedirectTo: `${window.location.origin}/auth/callback` },
      })
      if (error) setError(error.message)
      else if (data.session) { router.push('/dashboard'); router.refresh() }
      else setMessage(t('login.checkEmail'))
    }
    setLoading(false)
  }

  async function handleGoogle() {
    const supabase = createClient()
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${window.location.origin}/auth/callback` },
    })
  }

  function toggleMode() {
    setMode(mode === 'signin' ? 'signup' : 'signin')
    setError('')
    setMessage('')
  }

  return (
    <div className="min-h-screen flex flex-col relative overflow-hidden">
      {/* Glow blobs */}
      <div className="fixed top-[-10%] left-[-5%] w-[40vw] h-[40vw] rounded-full bg-space-accent/15 blur-[120px] mix-blend-screen pointer-events-none" />
      <div className="fixed bottom-[-10%] right-[-5%] w-[40vw] h-[40vw] rounded-full bg-space-glow/10 blur-[150px] mix-blend-screen pointer-events-none" />

      {/* Header */}
      <header className="relative z-50 border-b border-white/10 bg-space-900/50 backdrop-blur-xl">
        <div className="max-w-7xl mx-auto px-10 h-20 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <Telescope size={20} className="text-space-accent" />
            <span className="text-xl font-bold tracking-widest text-white uppercase">
              Sky<span className="text-space-accent">watcher</span>
            </span>
          </Link>
          <div className="flex items-center gap-4 text-sm">
            <span className="text-slate-400">
              {mode === 'signin'
                ? (lang === 'ka' ? 'ანგარიში არ გაქვს?' : "Don't have an account?")
                : (lang === 'ka' ? 'უკვე გაქვს ანგარიში?' : 'Already have an account?')}
            </span>
            <button
              onClick={toggleMode}
              className="text-white font-semibold hover:text-space-accent transition-colors"
            >
              {mode === 'signin'
                ? (lang === 'ka' ? 'რეგისტრაცია' : 'Register')
                : (lang === 'ka' ? 'შესვლა' : 'Sign in')}
            </button>
          </div>
        </div>
      </header>

      {/* Main */}
      <main className="relative z-10 flex flex-col items-center justify-center flex-1 pt-12 pb-20 px-6">
        <div className="w-full max-w-lg">
          {/* Title */}
          <div className="text-center mb-10">
            <h1 className="text-4xl font-bold text-white mb-2">
              {mode === 'signin'
                ? (lang === 'ka' ? 'კეთილი იყოს მობრძანება' : 'Welcome back')
                : (lang === 'ka' ? 'შექმენი ანგარიში' : 'Create account')}
            </h1>
            <p className="text-slate-400">
              {mode === 'signin'
                ? (lang === 'ka' ? 'გააგრძელე შენი კოსმოსური მოგზაურობა' : 'Continue your cosmic journey')
                : (lang === 'ka' ? 'დაიწყე შენი მოგზაურობა კოსმოსის სიღრმეებში.' : 'Start your journey into the depths of space.')}
            </p>
          </div>

          {/* Form card */}
          <div className="bg-[#12122b]/80 backdrop-blur-2xl border border-white/10 rounded-[2.5rem] p-10 shadow-2xl relative overflow-hidden">
            <div className="absolute top-0 right-0 p-8 opacity-10 text-8xl pointer-events-none">✨</div>

            <div className="relative z-10 space-y-6">
              {/* Google OAuth */}
              <button
                onClick={handleGoogle}
                className="w-full flex items-center justify-center gap-3 py-4 px-4 rounded-2xl border border-white/10 bg-white/5 hover:bg-white/10 text-white font-medium transition-all"
              >
                <svg width="18" height="18" viewBox="0 0 18 18">
                  <path d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.717v2.258h2.908c1.702-1.567 2.684-3.875 2.684-6.615z" fill="#4285F4"/>
                  <path d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18z" fill="#34A853"/>
                  <path d="M3.964 10.71A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.042l3.007-2.332z" fill="#FBBC05"/>
                  <path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.958L3.964 7.29C4.672 5.163 6.656 3.58 9 3.58z" fill="#EA4335"/>
                </svg>
                {t('login.google')}
              </button>

              <div className="flex items-center gap-3">
                <div className="flex-1 h-px bg-white/10" />
                <span className="text-xs text-slate-500">{t('login.orDivider')}</span>
                <div className="flex-1 h-px bg-white/10" />
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <label className="text-xs font-bold uppercase tracking-widest text-slate-400 ml-1">{t('login.email')}</label>
                  <div className="relative group">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-space-accent transition-colors">@</span>
                    <input
                      type="email"
                      required
                      placeholder="example@mail.com"
                      value={email}
                      onChange={e => setEmail(e.target.value)}
                      className="w-full bg-white/5 border border-white/10 rounded-2xl py-4 pl-10 pr-4 text-white placeholder:text-slate-600 focus:outline-none focus:border-space-accent focus:ring-1 focus:ring-space-accent transition-all"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-bold uppercase tracking-widest text-slate-400 ml-1">{t('login.password')}</label>
                  <div className="relative group">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-space-accent transition-colors">🔒</span>
                    <input
                      type="password"
                      required
                      minLength={6}
                      placeholder="••••••••"
                      value={password}
                      onChange={e => setPassword(e.target.value)}
                      className="w-full bg-white/5 border border-white/10 rounded-2xl py-4 pl-10 pr-4 text-white placeholder:text-slate-600 focus:outline-none focus:border-space-accent focus:ring-1 focus:ring-space-accent transition-all"
                    />
                  </div>
                </div>

                {error && <p className="text-red-400 text-sm text-center">{error}</p>}
                {message && <p className="text-green-400 text-sm text-center">{message}</p>}

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-4 bg-space-accent hover:bg-indigo-500 disabled:opacity-50 text-white font-bold rounded-2xl transition-all shadow-[0_0_20px_rgba(99,102,241,0.3)] hover:shadow-[0_0_30px_rgba(99,102,241,0.5)]"
                >
                  {loading ? t('login.loading') : mode === 'signin' ? t('login.signIn') : t('login.register')}
                </button>
              </form>

              <p className="text-center text-xs text-slate-500">{t('login.noCrypto')}</p>
            </div>
          </div>

          <div className="mt-8 text-center opacity-50">
            <p className="text-[10px] text-slate-500 uppercase tracking-[0.2em]">
              {lang === 'ka' ? 'სანდო პლატფორმა ქართველი ასტრომოყვარულებისთვის' : 'Trusted platform for Georgian astronomy lovers'}
            </p>
          </div>
        </div>
      </main>
    </div>
  )
}
