'use client'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { Telescope, User, LogOut } from 'lucide-react'
import { useLanguage } from '@/contexts/LanguageContext'
import { createClient } from '@/lib/supabase/client'

export default function Nav() {
  const pathname = usePathname()
  const router = useRouter()
  const { t, lang, setLang } = useLanguage()
  const isLanding = pathname === '/' || pathname === '/login'
  if (isLanding) return null

  const tabs = [
    { href: '/dashboard',            label: { en: 'Home',       ka: 'მთავარი'  } },
    { href: '/missions',             label: { en: 'Missions',   ka: 'მისიები'  } },
    { href: '/sky-tools/conditions', label: { en: 'Sky',        ka: 'ღამის ცა' } },
    { href: '/leaderboard',          label: { en: 'Ranks',      ka: 'რეიტინგი' } },
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
    <header className="relative z-50 border-b border-white/10 bg-space-900/60 backdrop-blur-xl sticky top-0">
      <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">

        {/* Logo */}
        <Link href="/dashboard" className="flex items-center gap-2 shrink-0">
          <Telescope size={22} className="text-space-accent" />
          <span className="text-lg font-bold tracking-widest text-white uppercase">
            Sky<span className="text-space-accent">watcher</span>
          </span>
        </Link>

        {/* Desktop nav links */}
        <nav className="hidden md:flex items-center gap-8">
          {tabs.map(tab => (
            <Link
              key={tab.href}
              href={tab.href}
              className={`text-sm font-medium transition-colors ${
                isActive(tab.href)
                  ? 'text-white border-b-2 border-space-accent py-[30px]'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              {lang === 'ka' ? tab.label.ka : tab.label.en}
            </Link>
          ))}
        </nav>

        {/* Right: lang + profile + logout */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => setLang(lang === 'ka' ? 'en' : 'ka')}
            className="hidden sm:flex text-xs font-bold px-3 py-1.5 rounded-full border border-white/10 bg-white/5 text-slate-400 hover:text-white hover:bg-white/10 transition-all tracking-wider"
          >
            {lang === 'ka' ? 'EN' : 'ქარ'}
          </button>
          <Link
            href="/profile"
            className={`w-10 h-10 rounded-full flex items-center justify-center text-white transition-all ${
              isActive('/profile')
                ? 'bg-space-accent shadow-[0_0_15px_rgba(99,102,241,0.4)]'
                : 'bg-space-accent/20 border border-space-accent/40 hover:bg-space-accent/40'
            }`}
          >
            <User size={18} />
          </Link>
          <button
            onClick={handleLogout}
            className="w-10 h-10 rounded-full flex items-center justify-center text-slate-400 hover:text-red-400 bg-white/5 border border-white/10 hover:bg-red-500/10 hover:border-red-500/20 transition-all"
            title={lang === 'ka' ? 'გასვლა' : 'Sign out'}
          >
            <LogOut size={16} />
          </button>
        </div>
      </div>
    </header>
  )
}
