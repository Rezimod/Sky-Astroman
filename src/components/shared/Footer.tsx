'use client'
import Link from 'next/link'
import { useLanguage } from '@/contexts/LanguageContext'

export default function Footer() {
  const { t } = useLanguage()
  return (
    <footer className="hidden sm:block border-t border-white/10 bg-space-900 mt-auto relative z-10">
      <div className="max-w-7xl mx-auto px-6 py-10 flex flex-col md:flex-row items-center justify-between gap-6">
        <div className="flex items-center gap-2">
          <span className="text-xl opacity-50">🪐</span>
          <span className="text-base font-bold tracking-widest text-white/50 uppercase">Sky Astroman</span>
        </div>
        <p className="text-sm text-slate-500">© 2024 Sky Astroman. {t('footer.tagline')}</p>
        <div className="flex items-center gap-3">
          <Link href="/dashboard" className="text-xs text-slate-500 hover:text-white transition-colors">{t('nav.home')}</Link>
          <Link href="/missions" className="text-xs text-slate-500 hover:text-white transition-colors">{t('nav.missions')}</Link>
          <Link href="/leaderboard" className="text-xs text-slate-500 hover:text-white transition-colors">{t('nav.ranks')}</Link>
        </div>
      </div>
    </footer>
  )
}
