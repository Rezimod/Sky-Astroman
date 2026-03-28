'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useLanguage } from '@/contexts/LanguageContext'

export default function Footer() {
  const { lang } = useLanguage()
  const pathname = usePathname()
  const hide = pathname === '/login' || pathname === '/register' || pathname === '/' || pathname.startsWith('/admin')
  if (hide) return null

  return (
    <footer className="hidden sm:block border-t border-white/[0.05] mt-auto relative z-10"
      style={{ background: 'rgba(6,8,15,0.7)' }}>
      <div className="max-w-7xl mx-auto px-6 py-5 flex flex-col sm:flex-row items-center justify-between gap-3">

        {/* Brand */}
        <div className="flex items-center gap-2">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
            <path d="M12 2L13.8 9.2L21 8L15.2 13.2L17.5 21L12 16.5L6.5 21L8.8 13.2L3 8L10.2 9.2Z"
              fill="url(#footerStellarGrad)" opacity="0.7" />
            <defs>
              <radialGradient id="footerStellarGrad" cx="38%" cy="32%" r="68%">
                <stop offset="0%" stopColor="#A5B4FC" />
                <stop offset="100%" stopColor="#6366F1" />
              </radialGradient>
            </defs>
          </svg>
          <span className="text-[11px] font-bold tracking-[0.14em] text-white/30 uppercase">Stellar</span>
        </div>

        <p className="text-[11px] text-[#334155]">
          © 2025 Stellar · {lang === 'ka' ? 'ვარსკვლავების ქვეყანა' : 'Georgia\'s Astronomy Platform'}
        </p>

        <nav className="flex items-center gap-4">
          <Link href="/dashboard"           className="text-[11px] text-[#475569] hover:text-white transition-colors">
            {lang === 'ka' ? 'მთავარი' : 'Home'}
          </Link>
          <Link href="/missions"            className="text-[11px] text-[#475569] hover:text-white transition-colors">
            {lang === 'ka' ? 'მისიები' : 'Missions'}
          </Link>
          <Link href="/sky-tools/conditions" className="text-[11px] text-[#475569] hover:text-white transition-colors">
            {lang === 'ka' ? 'ღამის ცა' : 'Sky'}
          </Link>
          <Link href="/leaderboard"          className="text-[11px] text-[#475569] hover:text-white transition-colors">
            {lang === 'ka' ? 'რეიტინგი' : 'Ranks'}
          </Link>
        </nav>
      </div>
    </footer>
  )
}
