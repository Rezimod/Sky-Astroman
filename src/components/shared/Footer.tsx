'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useLanguage } from '@/contexts/LanguageContext'

export default function Footer() {
  const { t } = useLanguage()
  const pathname = usePathname()
  const hide = pathname === '/login' || pathname === '/register' || pathname.startsWith('/admin')
  if (hide) return null
  return (
    <footer className="hidden sm:block border-t border-white/[0.06] mt-auto relative z-10" style={{ background: 'rgba(9,12,20,0.6)' }}>
      <div className="max-w-7xl mx-auto px-6 py-8 flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <div className="w-5 h-5 rounded-full border border-[#6366F1]/40 flex items-center justify-center">
            <div className="w-1.5 h-1.5 rounded-full bg-[#6366F1]" />
          </div>
          <span className="text-xs font-bold tracking-[0.15em] text-white/30 uppercase">Skywatcher</span>
        </div>
        <p className="text-xs text-[#334155]">© 2024 Skywatcher · {t('footer.tagline')}</p>
        <div className="flex items-center gap-4">
          <Link href="/dashboard"  className="text-[11px] text-[#475569] hover:text-white transition-colors">{t('nav.home')}</Link>
          <Link href="/missions"   className="text-[11px] text-[#475569] hover:text-white transition-colors">{t('nav.missions')}</Link>
          <Link href="/leaderboard"className="text-[11px] text-[#475569] hover:text-white transition-colors">{t('nav.ranks')}</Link>
        </div>
      </div>
    </footer>
  )
}
