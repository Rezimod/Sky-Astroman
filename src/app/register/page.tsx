'use client'
import { useState } from 'react'
import Link from 'next/link'
import { Lock, User, Mail } from 'lucide-react'
import { SaturnLogo } from '@/components/shared/SaturnLogo'
import { useLanguage } from '@/contexts/LanguageContext'
import { createClient } from '@/lib/supabase/client'

// Registration uses a server-side API route (service role) so users are
// auto-confirmed and can sign in immediately — no confirmation email sent.

function AuthInput({
  type, value, onChange, placeholder, icon: Icon, label,
}: {
  type: string; value: string; onChange: (v: string) => void
  placeholder: string; icon: React.ElementType; label: string
}) {
  return (
    <div className="space-y-1.5">
      <label className="text-[10px] font-bold uppercase tracking-widest text-[#64748B] ml-1">{label}</label>
      <div className="relative group">
        <Icon size={13} className="absolute left-4 top-1/2 -translate-y-1/2 text-[#475569] group-focus-within:text-[#6366F1] transition-colors pointer-events-none" />
        <input
          type={type}
          required
          autoComplete={type === 'password' ? 'new-password' : type === 'email' ? 'email' : 'name'}
          placeholder={placeholder}
          value={value}
          onChange={e => onChange(e.target.value)}
          className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl py-3 pl-10 pr-4 text-sm text-white placeholder:text-[#334155] focus:outline-none focus:border-[#6366F1]/55 focus:bg-white/[0.06] transition-all"
        />
      </div>
    </div>
  )
}

export default function RegisterPage() {
  const { lang } = useLanguage()
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')

    if (password !== confirmPassword) {
      setError(lang === 'ka' ? 'პაროლები არ ემთხვევა' : 'Passwords do not match')
      return
    }
    if (password.length < 6) {
      setError(lang === 'ka' ? 'პაროლი მინიმუმ 6 სიმბოლო' : 'Password must be at least 6 characters')
      return
    }

    setLoading(true)
    try {
      // Step 1: Create user via server-side route (auto-confirmed, no confirmation email)
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim().toLowerCase(), password, name: name.trim() }),
      })
      const json = await res.json()

      if (!res.ok) {
        if (json.error === 'EMAIL_EXISTS') {
          setError(lang === 'ka' ? 'ეს ელ-ფოსტა უკვე რეგისტრირებულია' : 'This email is already registered')
        } else {
          setError(json.error || (lang === 'ka' ? 'შეცდომა. სცადეთ ხელახლა.' : 'Something went wrong. Please try again.'))
        }
        return
      }

      // Step 2: Sign in immediately — no confirmation needed
      const supabase = createClient()
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: email.trim().toLowerCase(),
        password,
      })

      if (signInError) {
        setError(lang === 'ka' ? 'ანგარიში შეიქმნა, მაგრამ შესვლა ვერ მოხერხდა. სცადე შესვლა.' : 'Account created but sign-in failed. Please sign in.')
        window.location.href = '/login'
        return
      }

      // Hard redirect to pick up fresh session cookies
      window.location.href = '/dashboard'
    } catch {
      setError(lang === 'ka' ? 'კავშირის შეცდომა. სცადეთ ხელახლა.' : 'Connection error. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex flex-col relative overflow-hidden">

      {/* Particles */}
      {[...Array(12)].map((_, i) => (
        <span key={i} className="auth-particle" style={{
          left: `${6 + i * 8}%`,
          width: i % 4 === 0 ? '2px' : '1px',
          height: i % 4 === 0 ? '2px' : '1px',
          '--dur': `${12 + i * 2}s`,
          '--delay': `${i * 0.6}s`,
          '--drift': `${(i % 2 === 0 ? 1 : -1) * (8 + i * 4)}px`,
        } as React.CSSProperties} />
      ))}

      {/* Background glows */}
      <div className="fixed top-[-18%] left-[-8%] w-[55vw] h-[55vw] rounded-full bg-[#6366F1]/12 blur-[140px] pointer-events-none z-0" />
      <div className="fixed bottom-[-18%] right-[-8%] w-[55vw] h-[55vw] rounded-full bg-[#8B5CF6]/8 blur-[150px] pointer-events-none z-0" />

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
              {lang === 'ka' ? 'უკვე გაქვს ანგარიში?' : 'Already have an account?'}
            </span>
            <Link href="/login" className="text-[11px] font-bold tracking-widest text-[#6366F1] hover:text-[#818CF8] transition-colors uppercase">
              {lang === 'ka' ? 'შესვლა' : 'Sign in'}
            </Link>
          </div>
        </div>
      </header>

      {/* Main */}
      <main className="relative z-10 flex flex-col items-center justify-center flex-1 py-6 px-4">
        <div className="w-full max-w-sm">

          {/* Logo */}
          <div className="flex justify-center mb-5 animate-auth-float">
            <div className="relative">
              <div className="absolute inset-0 rounded-full bg-[#6366F1]/20 blur-2xl scale-150" />
              <SaturnLogo width={52} height={52} />
            </div>
          </div>

          {/* Title */}
          <div className="text-center mb-5 animate-auth-slide-up-1">
            <h1 className="text-2xl sm:text-3xl font-bold text-white mb-1 leading-tight">
              {lang === 'ka' ? 'შექმენი ანგარიში' : 'Create account'}
            </h1>
            <p className="text-[#64748B] text-sm">
              {lang === 'ka' ? 'დაიწყე კოსმოსური მოგზაურობა' : 'Start your cosmic journey'}
            </p>
          </div>

          {/* Form card */}
          <div className="animate-auth-slide-up-2 animate-auth-glow bg-[#0A0E1A]/90 backdrop-blur-2xl border border-white/[0.08] rounded-2xl p-6 shadow-2xl">
            <form onSubmit={handleSubmit} className="space-y-3">

              <div className="animate-auth-slide-up-2">
                <AuthInput type="text" value={name} onChange={setName}
                  placeholder={lang === 'ka' ? 'შენი სახელი' : 'Your name'}
                  icon={User} label={lang === 'ka' ? 'სახელი' : 'Name'} />
              </div>

              <div className="animate-auth-slide-up-3">
                <AuthInput type="email" value={email} onChange={setEmail}
                  placeholder="example@mail.com"
                  icon={Mail} label={lang === 'ka' ? 'ელ-ფოსტა' : 'Email'} />
              </div>

              <div className="animate-auth-slide-up-4">
                <AuthInput type="password" value={password} onChange={setPassword}
                  placeholder="••••••••"
                  icon={Lock} label={lang === 'ka' ? 'პაროლი (მინ. 6 სიმბ.)' : 'Password (min. 6 chars)'} />
              </div>

              <div className="animate-auth-slide-up-5">
                <AuthInput type="password" value={confirmPassword} onChange={setConfirmPassword}
                  placeholder="••••••••"
                  icon={Lock} label={lang === 'ka' ? 'გაიმეორე პაროლი' : 'Confirm password'} />
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
                    ? (lang === 'ka' ? 'იქმნება ანგარიში...' : 'Creating account...')
                    : (lang === 'ka' ? 'ანგარიშის შექმნა' : 'Create account')}
                </button>
              </div>
            </form>

            <p className="text-center text-xs text-[#475569] mt-4">
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
