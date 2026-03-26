'use client'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { User, LogOut } from 'lucide-react'
import { useLanguage } from '@/contexts/LanguageContext'
import { createClient } from '@/lib/supabase/client'

function OrbitLogo() {
  return (
    <div className="relative flex items-center justify-center" style={{ width: 32, height: 32 }}>
      <svg width="32" height="32" viewBox="0 0 32 32" className="absolute inset-0">
        <circle cx="16" cy="16" r="12" fill="none" stroke="rgba(99,102,241,0.2)" strokeWidth="1" />
      </svg>
      {/* Orbiting dot */}
      <svg width="32" height="32" viewBox="0 0 32 32" className="absolute inset-0 orbit-ring">
        <circle cx="16" cy="4" r="2.5" fill="#6366F1" />
      </svg>
      {/* Center icon */}
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#6366F1" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="relative z-10">
        <circle cx="12" cy="12" r="3"/>
        <path d="M12 2v2M12 20v2M2 12h2M20 12h2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41"/>
      </svg>
    </div>
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
          <OrbitLogo />
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
