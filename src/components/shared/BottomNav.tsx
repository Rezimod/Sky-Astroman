'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { LayoutDashboard, Satellite, Trophy, Cloud, User } from 'lucide-react'

const tabs = [
  { href: '/dashboard', label: 'Home', icon: <LayoutDashboard size={20} /> },
  { href: '/missions', label: 'Missions', icon: <Satellite size={20} /> },
  { href: '/leaderboard', label: 'Ranks', icon: <Trophy size={20} /> },
  { href: '/sky-tools/conditions', label: 'Sky', icon: <Cloud size={20} /> },
  { href: '/profile', label: 'Profile', icon: <User size={20} /> },
]

export default function BottomNav() {
  const pathname = usePathname()
  const isLanding = pathname === '/' || pathname === '/login'
  if (isLanding) return null

  return (
    <nav className="sm:hidden fixed bottom-0 left-0 right-0 z-50 bg-[rgba(7,11,20,0.95)] backdrop-blur-xl border-t border-white/10"
      style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}>
      <div className="flex items-stretch">
        {tabs.map(tab => (
          <Link
            key={tab.href}
            href={tab.href}
            className={`flex-1 flex flex-col items-center justify-center gap-1 py-3 transition-colors ${
              pathname === tab.href || pathname.startsWith(tab.href + '/')
                ? 'text-[#FFD166]'
                : 'text-[var(--text-secondary)] active:text-[var(--text-primary)]'
            }`}
          >
            {tab.icon}
            <span className="text-[10px] font-medium">{tab.label}</span>
          </Link>
        ))}
      </div>
    </nav>
  )
}
