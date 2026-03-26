'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { LayoutDashboard, Satellite, Trophy, Cloud, User } from 'lucide-react'
import { useLanguage } from '@/contexts/LanguageContext'

export default function BottomNav() {
  const pathname = usePathname()
  const { t } = useLanguage()
  const isLanding = pathname === '/' || pathname === '/login'
  if (isLanding) return null

  const tabs = [
    { href: '/dashboard',            labelKey: 'nav.home',     icon: <LayoutDashboard size={20} /> },
    { href: '/missions',             labelKey: 'nav.missions', icon: <Satellite size={20} /> },
    { href: '/leaderboard',          labelKey: 'nav.ranks',    icon: <Trophy size={20} /> },
    { href: '/sky-tools/conditions', labelKey: 'nav.sky',      icon: <Cloud size={20} /> },
    { href: '/profile',              labelKey: 'nav.profile',  icon: <User size={20} /> },
  ]

  return (
    <nav
      className="sm:hidden fixed bottom-0 left-0 right-0 z-50 bg-space-900/90 backdrop-blur-xl border-t border-white/10"
      style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
    >
      <div className="flex items-stretch">
        {tabs.map(tab => {
          const active = pathname === tab.href || pathname.startsWith(tab.href + '/')
          return (
            <Link
              key={tab.href}
              href={tab.href}
              className={`flex-1 flex flex-col items-center justify-center gap-1 py-3 transition-colors ${
                active ? 'text-space-accent' : 'text-slate-500 active:text-slate-300'
              }`}
            >
              {tab.icon}
              <span className="text-[10px] font-medium">{t(tab.labelKey)}</span>
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
