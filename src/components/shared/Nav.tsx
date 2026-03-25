'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Satellite, Trophy, Cloud, User, LayoutDashboard } from 'lucide-react'
import AstroLogo from './AstroLogo'
import { useLanguage } from '@/contexts/LanguageContext'

export default function Nav() {
  const pathname = usePathname()
  const { t, lang, setLang } = useLanguage()
  const isLanding = pathname === '/' || pathname === '/login'
  if (isLanding) return null

  const tabs = [
    { href: '/dashboard',           labelKey: 'nav.dashboard',   icon: <LayoutDashboard size={17} /> },
    { href: '/missions',            labelKey: 'nav.missions',    icon: <Satellite size={17} /> },
    { href: '/leaderboard',         labelKey: 'nav.leaderboard', icon: <Trophy size={17} /> },
    { href: '/sky-tools/conditions',labelKey: 'nav.sky',         icon: <Cloud size={17} /> },
    { href: '/profile',             labelKey: 'nav.profile',     icon: <User size={17} /> },
  ]

  return (
    <nav className="glass-nav sticky top-0 z-40">
      <div className="max-w-5xl mx-auto px-3 sm:px-4">
        <div className="h-16 flex items-center justify-between gap-2">
          <Link href="/dashboard" className="flex-shrink-0">
            <AstroLogo heightClass="h-7" />
          </Link>
          <div className="hidden sm:flex items-center gap-0.5">
            {tabs.map(tab => (
              <Link
                key={tab.href}
                href={tab.href}
                className={`px-3 py-2 rounded-lg text-sm font-medium flex items-center gap-1.5 transition-all duration-200 ${
                  pathname === tab.href || pathname.startsWith(tab.href + '/')
                    ? 'text-[#FFD166] bg-[rgba(255,209,102,0.1)]'
                    : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-white/5'
                }`}
              >
                {tab.icon}
                <span>{t(tab.labelKey)}</span>
              </Link>
            ))}
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setLang(lang === 'ka' ? 'en' : 'ka')}
              className="text-[11px] font-bold px-2.5 py-1 rounded-md border border-[var(--border-glass)] text-[var(--text-secondary)] hover:text-white hover:bg-white/5 transition-all tracking-wider"
            >
              {lang === 'ka' ? 'EN' : 'ქარ'}
            </button>
            <Link
              href="/login"
              className="text-xs text-[var(--text-secondary)] hover:text-[var(--text-primary)] border border-[var(--border-glass)] px-3 py-1.5 rounded-lg hover:bg-white/5 transition-all"
            >
              {t('nav.signout')}
            </Link>
          </div>
        </div>
      </div>
    </nav>
  )
}
