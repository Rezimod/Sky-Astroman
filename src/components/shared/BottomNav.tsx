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
    { href: '/dashboard',            labelKey: 'nav.home',     icon: LayoutDashboard },
    { href: '/missions',             labelKey: 'nav.missions', icon: Satellite       },
    { href: '/leaderboard',          labelKey: 'nav.ranks',    icon: Trophy          },
    { href: '/sky-tools/conditions', labelKey: 'nav.sky',      icon: Cloud           },
    { href: '/profile',              labelKey: 'nav.profile',  icon: User            },
  ]

  return (
    <nav
      className="sm:hidden fixed bottom-0 left-0 right-0 z-50 border-t border-white/[0.06]"
      style={{ background: 'rgba(9,12,20,0.95)', backdropFilter: 'blur(20px)', paddingBottom: 'env(safe-area-inset-bottom)' }}
    >
      <div className="flex items-stretch">
        {tabs.map(tab => {
          const active = pathname === tab.href || pathname.startsWith(tab.href + '/')
          const Icon = tab.icon
          return (
            <Link
              key={tab.href}
              href={tab.href}
              className={`flex-1 flex flex-col items-center justify-center gap-1 py-2.5 transition-colors ${
                active ? 'text-[#6366F1]' : 'text-[#475569] active:text-[#94A3B8]'
              }`}
            >
              <Icon size={18} />
              <span className="text-[9px] font-bold tracking-wider uppercase">{t(tab.labelKey)}</span>
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
