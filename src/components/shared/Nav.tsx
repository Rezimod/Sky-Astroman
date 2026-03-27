'use client'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { User, LogOut } from 'lucide-react'
import { useLanguage } from '@/contexts/LanguageContext'
import { createClient } from '@/lib/supabase/client'
import { SaturnLogo } from '@/components/shared/SaturnLogo'

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
        <Link href="/dashboard" className="flex items-center gap-2 shrink-0">
          <SaturnLogo width={34} height={26} />
          <span className="text-xs font-bold tracking-[0.18em] text-white uppercase">
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
