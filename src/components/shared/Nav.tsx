'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Satellite, Trophy, Cloud, User, LayoutDashboard } from 'lucide-react'
import AstroLogo from './AstroLogo'

const tabs = [
  { href: '/dashboard', label: 'Dashboard', icon: <LayoutDashboard size={17} /> },
  { href: '/missions', label: 'Missions', icon: <Satellite size={17} /> },
  { href: '/leaderboard', label: 'Leaderboard', icon: <Trophy size={17} /> },
  { href: '/sky-tools/conditions', label: 'Sky', icon: <Cloud size={17} /> },
  { href: '/profile', label: 'Profile', icon: <User size={17} /> },
]

export default function Nav() {
  const pathname = usePathname()
  const isLanding = pathname === '/' || pathname === '/login'
  if (isLanding) return null

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
                <span>{tab.label}</span>
              </Link>
            ))}
          </div>
          <Link
            href="/login"
            className="text-xs text-[var(--text-secondary)] hover:text-[var(--text-primary)] border border-[var(--border-glass)] px-3 py-1.5 rounded-lg hover:bg-white/5 transition-all"
          >
            Sign out
          </Link>
        </div>
      </div>
    </nav>
  )
}
