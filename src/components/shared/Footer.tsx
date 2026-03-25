'use client'
import { useLanguage } from '@/contexts/LanguageContext'

export default function Footer() {
  const { t } = useLanguage()
  return (
    <footer className="hidden sm:block border-t border-[var(--border-glass)] mt-auto py-6 px-4">
      <div className="max-w-5xl mx-auto flex items-center justify-between text-xs text-[var(--text-dim)]">
        <span>{t('footer.tagline')}</span>
        <span>{t('footer.location')} 🌌</span>
      </div>
    </footer>
  )
}
