'use client'
import { useState } from 'react'
import Link from 'next/link'
import { Lock, User, Mail } from 'lucide-react'
import { SaturnLogo } from '@/components/shared/SaturnLogo'
import { useLanguage } from '@/contexts/LanguageContext'
import { createClient } from '@/lib/supabase/client'

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
      const supabase = createClient()
      const cleanEmail = email.trim().toLowerCase()
      const cleanName = name.trim()

      const { data, error: signUpError } = await supabase.auth.signUp({
        email: cleanEmail,
        password,
        options: {
          data: { full_name: cleanName, display_name: cleanName },
        },
      })

      if (signUpError) {
        const msg = signUpError.message.toLowerCase()
        if (msg.includes('already registered') || msg.includes('already been registered') || msg.includes('user already registered')) {
          setError(lang === 'ka' ? 'ეს ელ-ფოსტა უკვე რეგისტრირებულია' : 'This email is already registered')
        } else {
          setError(signUpError.message)
        }
        return
      }

      // If session is immediately available, user is auto-confirmed — go to dashboard
      if (data.session) {
        window.location.replace('/dashboard')
        return
      }

      // No session = email confirmation required
      setError(lang === 'ka'
        ? 'ელ-ფოსტაზე გაგზავნილია დადასტურების ბმული. შეამოწმე შენი ყუთი.'
        : 'A confirmation link was sent to your email. Please check your inbox.')
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
          <div className="flex justify-center mb-5">
            <div className="relative">
              <div className="absolute inset-0 rounded-full bg-[#6366F1]/20 blur-2xl scale-150" />
              <SaturnLogo width={52} height={52} />
            </div>
          </div>

          {/* Title */}
          <div className="text-center mb-5">
            <h1 className="text-2xl sm:text-3xl font-bold text-white mb-1 leading-tight">
              {lang === 'ka' ? 'შექმენი ანგარიში' : 'Create account'}
            </h1>
            <p className="text-[#64748B] text-sm">
              {lang === 'ka' ? 'დაიწყე კოსმოსური მოგზაურობა' : 'Start your cosmic journey'}
            </p>
          </div>

          {/* Form card */}
          <div className="bg-[#0A0E1A]/90 backdrop-blur-2xl border border-white/[0.08] rounded-2xl p-6 shadow-2xl">
            <form onSubmit={handleSubmit} className="space-y-3">

              <AuthInput type="text" value={name} onChange={setName}
                placeholder={lang === 'ka' ? 'შენი სახელი' : 'Your name'}
                icon={User} label={lang === 'ka' ? 'სახელი' : 'Name'} />

              <AuthInput type="email" value={email} onChange={setEmail}
                placeholder="example@mail.com"
                icon={Mail} label={lang === 'ka' ? 'ელ-ფოსტა' : 'Email'} />

              <AuthInput type="password" value={password} onChange={setPassword}
                placeholder="••••••••"
                icon={Lock} label={lang === 'ka' ? 'პაროლი (მინ. 6 სიმბ.)' : 'Password (min. 6 chars)'} />

              <AuthInput type="password" value={confirmPassword} onChange={setConfirmPassword}
                placeholder="••••••••"
                icon={Lock} label={lang === 'ka' ? 'გაიმეორე პაროლი' : 'Confirm password'} />

              {error && (
                <div className={`border rounded-xl px-4 py-2.5 ${error.includes('დადასტურების') || error.includes('confirmation') ? 'bg-emerald-500/10 border-emerald-500/20' : 'bg-rose-500/10 border-rose-500/20'}`}>
                  <p className={`text-sm text-center ${error.includes('დადასტურების') || error.includes('confirmation') ? 'text-emerald-400' : 'text-rose-400'}`}>{error}</p>
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
