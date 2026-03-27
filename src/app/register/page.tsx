'use client'
import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Lock, User } from 'lucide-react'
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
  const [message, setMessage] = useState('')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setMessage('')

    if (password !== confirmPassword) {
      setError(lang === 'ka' ? 'პაროლები არ ემთხვევა' : 'Passwords do not match')
      return
    }

    setLoading(true)
    const supabase = createClient()

    const { data, error: signUpError } = await supabase.auth.signUp({
      email,
      password,
      options: { emailRedirectTo: `${window.location.origin}/auth/callback` },
    })

    if (signUpError) {
      setError(signUpError.message)
      setLoading(false)
      return
    }

    const userId = data.user?.id
    if (userId) {
      await supabase.from('profiles').upsert({
        id: userId,
        username: email.split('@')[0],
        display_name: name,
      })
    }

    if (data.session) {
      router.push('/dashboard')
      router.refresh()
    } else {
      setMessage(lang === 'ka'
        ? 'გამოგიგზავნეთ დადასტურების ბმული ელ-ფოსტაზე'
        : 'Check your email for a confirmation link')
    }

    setLoading(false)
  }

  return (
    <div className="min-h-screen flex flex-col relative overflow-hidden">

      {/* Background glow blobs */}
      <div className="fixed top-[-20%] left-[-10%] w-[50vw] h-[50vw] rounded-full bg-[#6366F1]/20 blur-[120px] mix-blend-screen z-0 pointer-events-none" />
      <div className="fixed bottom-[-20%] right-[-10%] w-[60vw] h-[60vw] rounded-full bg-[#A855F7]/10 blur-[150px] mix-blend-screen z-0 pointer-events-none" />

      {/* Header */}
      <header className="relative z-50 border-b border-white/10 bg-[#0B0B1A]/60 backdrop-blur-xl">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between gap-4">
          <Link href="/" className="flex items-center gap-2 shrink-0">
            <SaturnLogo width={34} height={26} />
            <span className="text-xs font-bold tracking-[0.18em] text-white uppercase">
              Sky<span className="text-[#6366F1]">watcher</span>
            </span>
          </Link>
          <div className="flex items-center gap-3 text-sm">
            <span className="text-slate-500 text-xs hidden sm:block">
              {lang === 'ka' ? 'უკვე გაქვს ანგარიში?' : 'Already have an account?'}
            </span>
            <Link
              href="/login"
              className="text-xs font-bold tracking-widest text-white hover:text-[#6366F1] transition-colors uppercase"
            >
              {lang === 'ka' ? 'შესვლა' : 'Sign in'}
            </Link>
          </div>
        </div>
      </header>

      {/* Main */}
      <main className="relative z-10 flex flex-col items-center justify-center flex-1 py-12 px-4">
        <div className="w-full max-w-md">

          {/* Title */}
          <div className="text-center mb-8">
            <h1 className="text-4xl sm:text-5xl font-bold text-white mb-3 leading-tight">
              {lang === 'ka' ? 'შექმენი\nანგარიში' : 'Create\naccount'}
            </h1>
            <p className="text-slate-400 text-sm">
              {lang === 'ka' ? 'დაიწყე შენი კოსმოსური მოგზაურობა' : 'Start your cosmic journey'}
            </p>
          </div>

          {/* Form card */}
          <div className="bg-[#12122b]/80 backdrop-blur-2xl border border-white/10 rounded-[2rem] p-8 shadow-2xl">
            <form onSubmit={handleSubmit} className="space-y-4">

              {/* Name */}
              <div className="space-y-2">
                <label className="text-xs font-bold uppercase tracking-widest text-slate-400 ml-1">
                  {lang === 'ka' ? 'სახელი' : 'Name'}
                </label>
                <div className="relative group">
                  <User size={14} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-[#6366F1] transition-colors" />
                  <input
                    type="text"
                    required
                    placeholder={lang === 'ka' ? 'შენი სახელი' : 'Your name'}
                    value={name}
                    onChange={e => setName(e.target.value)}
                    className="w-full bg-white/5 border border-white/10 rounded-2xl py-4 pl-10 pr-4 text-white placeholder:text-slate-600 focus:outline-none focus:border-[#6366F1] focus:ring-1 focus:ring-[#6366F1] transition-all"
                  />
                </div>
              </div>

              {/* Email */}
              <div className="space-y-2">
                <label className="text-xs font-bold uppercase tracking-widest text-slate-400 ml-1">
                  {lang === 'ka' ? 'ელ-ფოსტის მისამართი' : 'Email address'}
                </label>
                <div className="relative group">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-[#6366F1] transition-colors text-sm font-medium">@</span>
                  <input
                    type="email"
                    required
                    placeholder="example@mail.com"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    className="w-full bg-white/5 border border-white/10 rounded-2xl py-4 pl-10 pr-4 text-white placeholder:text-slate-600 focus:outline-none focus:border-[#6366F1] focus:ring-1 focus:ring-[#6366F1] transition-all"
                  />
                </div>
              </div>

              {/* Password */}
              <div className="space-y-2">
                <label className="text-xs font-bold uppercase tracking-widest text-slate-400 ml-1">
                  {lang === 'ka' ? 'პაროლი (მინ. 6 სიმბოლო)' : 'Password (min. 6 chars)'}
                </label>
                <div className="relative group">
                  <Lock size={14} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-[#6366F1] transition-colors" />
                  <input
                    type="password"
                    required
                    minLength={6}
                    placeholder="••••••••"
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    className="w-full bg-white/5 border border-white/10 rounded-2xl py-4 pl-10 pr-4 text-white placeholder:text-slate-600 focus:outline-none focus:border-[#6366F1] focus:ring-1 focus:ring-[#6366F1] transition-all"
                  />
                </div>
              </div>

              {/* Confirm Password */}
              <div className="space-y-2">
                <label className="text-xs font-bold uppercase tracking-widest text-slate-400 ml-1">
                  {lang === 'ka' ? 'გაიმეორე პაროლი' : 'Confirm password'}
                </label>
                <div className="relative group">
                  <Lock size={14} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-[#6366F1] transition-colors" />
                  <input
                    type="password"
                    required
                    minLength={6}
                    placeholder="••••••••"
                    value={confirmPassword}
                    onChange={e => setConfirmPassword(e.target.value)}
                    className="w-full bg-white/5 border border-white/10 rounded-2xl py-4 pl-10 pr-4 text-white placeholder:text-slate-600 focus:outline-none focus:border-[#6366F1] focus:ring-1 focus:ring-[#6366F1] transition-all"
                  />
                </div>
              </div>

              {error && <p className="text-red-400 text-sm text-center">{error}</p>}
              {message && <p className="text-green-400 text-sm text-center">{message}</p>}

              <button
                type="submit"
                disabled={loading}
                className="w-full py-4 bg-white hover:bg-slate-100 disabled:opacity-50 text-[#0B0B1A] font-bold rounded-2xl transition-all mt-2"
              >
                {loading
                  ? (lang === 'ka' ? 'იტვირთება...' : 'Loading...')
                  : (lang === 'ka' ? 'რეგისტრაცია' : 'Register')}
              </button>
            </form>

            <p className="text-center text-xs text-slate-600 mt-6">
              {lang === 'ka' ? 'უკვე გაქვს ანგარიში? ' : 'Already have an account? '}
              <Link href="/login" className="text-[#6366F1] hover:text-[#818CF8] transition-colors">
                {lang === 'ka' ? 'შესვლა' : 'Sign in'}
              </Link>
            </p>
          </div>
        </div>
      </main>
    </div>
  )
}
