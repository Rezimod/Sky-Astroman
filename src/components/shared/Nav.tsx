'use client'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { User, LogOut } from 'lucide-react'
import { useLanguage } from '@/contexts/LanguageContext'
import { createClient } from '@/lib/supabase/client'

function SaturnLogo() {
  // Planet with rings + sparkle stars — matches the Saturn icon reference
  return (
    <svg width="34" height="28" viewBox="0 0 36 30" fill="none" xmlns="http://www.w3.org/2000/svg">
      {/* Ring — back arc (top half, hidden behind planet) */}
      <ellipse cx="18" cy="18" rx="17" ry="5"
        stroke="#6366F1" strokeWidth="1.6" fill="none" opacity="0.45"
        strokeDasharray="37.2 37.2" strokeDashoffset="-37.2"
      />
      {/* Planet body */}
      <circle cx="18" cy="13" r="9" fill="#0D1117" stroke="#6366F1" strokeWidth="1.4"/>
      <circle cx="18" cy="13" r="9" fill="url(#satGrad)" />
      {/* Ring — front arc (bottom half, over planet) */}
      <ellipse cx="18" cy="18" rx="17" ry="5"
        stroke="#6366F1" strokeWidth="1.6" fill="none"
        strokeDasharray="37.2 37.2" strokeDashoffset="0"
      />
      {/* Sparkle top-left */}
      <path d="M4,2 L4.5,3.5 L6,4 L4.5,4.5 L4,6 L3.5,4.5 L2,4 L3.5,3.5Z" fill="#818CF8"/>
      {/* Sparkle top-right */}
      <path d="M32,2 L32.4,3.1 L33.5,3.5 L32.4,3.9 L32,5 L31.6,3.9 L30.5,3.5 L31.6,3.1Z" fill="#A855F7" opacity="0.9"/>
      {/* Sparkle bottom-right */}
      <path d="M33,23 L33.3,23.9 L34.2,24.2 L33.3,24.5 L33,25.4 L32.7,24.5 L31.8,24.2 L32.7,23.9Z" fill="#818CF8" opacity="0.75"/>
      {/* Sparkle bottom-left tiny */}
      <path d="M2,22.5 L2.25,23.25 L3,23.5 L2.25,23.75 L2,24.5 L1.75,23.75 L1,23.5 L1.75,23.25Z" fill="#A855F7" opacity="0.6"/>
      <defs>
        <radialGradient id="satGrad" cx="38%" cy="32%" r="65%">
          <stop offset="0%" stopColor="#818CF8" stopOpacity="0.7"/>
          <stop offset="100%" stopColor="#4338CA" stopOpacity="0.4"/>
        </radialGradient>
      </defs>
    </svg>
  )
}

export default function Nav() {
  const pathname = usePathname()
  const router = useRouter()
  const { lang, setLang } = useLanguage()
  const isLanding = pathname === '/' || pathname === '/login'
  if (isLanding) return null

  const tabs = [
    { href: '/dashboard',            label: { en: 'HOME',       ka: 'მთავარი'  } },
    { href: '/missions',             label: { en: 'MISSIONS',   ka: 'მისიები'  } },
    { href: '/sky-tools/conditions', label: { en: 'NIGHT SKY',  ka: 'ღამის ცა' } },
    { href: '/leaderboard',          label: { en: 'RANKS',      ka: 'რეიტინგი' } },
  ]

  function isActive(href: string) {
    return pathname === href || pathname.startsWith(href + '/')
  }

  async function handleLogout() {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/')
  }

  return (
    <header className="glass-nav sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 h-14 sm:h-16 flex items-center justify-between gap-4">

        {/* Logo */}
        <Link href="/dashboard" className="flex items-center gap-2.5 shrink-0">
          <SaturnLogo />
          <span className="text-sm font-bold tracking-[0.15em] text-white uppercase">
            Sky<span className="text-[#6366F1]">watcher</span>
          </span>
        </Link>

        {/* Desktop nav */}
        <nav className="hidden md:flex items-center gap-1">
          {tabs.map(tab => (
            <Link
              key={tab.href}
              href={tab.href}
              className={`px-3 py-1.5 text-[11px] font-bold tracking-[0.12em] transition-colors rounded ${
                isActive(tab.href)
                  ? 'text-white bg-white/5'
                  : 'text-[#64748B] hover:text-white'
              }`}
            >
              {lang === 'ka' ? tab.label.ka : tab.label.en}
            </Link>
          ))}
        </nav>

        {/* Status indicator — desktop */}
        <div className="hidden lg:flex items-center gap-1.5 text-[10px] font-bold tracking-widest text-[#64748B] uppercase">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
          {lang === 'ka' ? 'ობსერვ. აქტიური' : 'Observatory Active'}
        </div>

        {/* Right actions */}
        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={() => setLang(lang === 'ka' ? 'en' : 'ka')}
            className="text-[10px] font-bold px-2.5 py-1 rounded border border-white/10 bg-white/[0.03] text-[#64748B] hover:text-white hover:bg-white/[0.06] transition-all tracking-widest"
          >
            {lang === 'ka' ? 'EN' : 'ქარ'}
          </button>
          <Link
            href="/profile"
            className={`w-8 h-8 rounded-full flex items-center justify-center text-white transition-all ${
              isActive('/profile')
                ? 'bg-[#6366F1]'
                : 'bg-white/[0.06] border border-white/10 hover:bg-white/[0.1]'
            }`}
          >
            <User size={14} />
          </Link>
          <button
            onClick={handleLogout}
            className="w-8 h-8 rounded-full flex items-center justify-center text-[#64748B] hover:text-red-400 bg-white/[0.03] border border-white/[0.06] hover:bg-red-500/10 hover:border-red-500/20 transition-all"
            title={lang === 'ka' ? 'გასვლა' : 'Sign out'}
          >
            <LogOut size={14} />
          </button>
        </div>
      </div>
    </header>
  )
}
