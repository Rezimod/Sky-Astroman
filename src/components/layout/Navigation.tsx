'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { LayoutDashboard, Target, Trophy, Users, Cloud, User } from 'lucide-react'

const navItems = [
  { href: '/', icon: LayoutDashboard, label: 'Dashboard' },
  { href: '/missions', icon: Target, label: 'Missions' },
  { href: '/leaderboard', icon: Trophy, label: 'Leaderboard' },
  { href: '/teams', icon: Users, label: 'Teams' },
  { href: '/sky-tools/conditions', icon: Cloud, label: 'Sky' },
  { href: '/profile', icon: User, label: 'Profile' },
]

export default function Navigation() {
  const pathname = usePathname()
  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 glass-card rounded-none border-t border-[var(--border-glass)] px-2 pb-safe sm:relative sm:rounded-card sm:mb-4">
      <div className="flex items-center justify-around py-2 sm:py-3 max-w-2xl mx-auto">
        {navItems.map(({ href, icon: Icon, label }) => {
          const active = pathname === href || (href !== '/' && pathname.startsWith(href))
          return (
            <Link
              key={href}
              href={href}
              className={`flex flex-col items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-medium transition-colors ${
                active
                  ? 'text-[var(--accent-gold)]'
                  : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
              }`}
            >
              <Icon size={20} strokeWidth={active ? 2.5 : 1.8} />
              <span className="hidden sm:block">{label}</span>
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
