'use client'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { LayoutDashboard, Satellite, Camera, Cloud, User, LogOut } from 'lucide-react'
import { useLanguage } from '@/contexts/LanguageContext'
import { createClient } from '@/lib/supabase/client'

function StellarIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
      <path d="M12 2L13.8 9.2L21 8L15.2 13.2L17.5 21L12 16.5L6.5 21L8.8 13.2L3 8L10.2 9.2Z"
        fill="url(#navStellarGrad)" />
      <defs>
        <radialGradient id="navStellarGrad" cx="38%" cy="32%" r="68%">
          <stop offset="0%" stopColor="#A5B4FC" />
          <stop offset="100%" stopColor="#6366F1" />
        </radialGradient>
      </defs>
    </svg>
  )
}

const desktopLinks = [
  { href: '/dashboard',            label: { en: 'HOME',    ka: 'მთავარი' } },
  { href: '/missions',             label: { en: 'MISSIONS',ka: 'მისიები' } },
  { href: '/gallery',              label: { en: 'GALLERY', ka: 'გალერეა' } },
  { href: '/sky-tools/conditions', label: { en: 'SKY',     ka: 'ცა'      } },
]

const mobileTabs = [
  { href: '/dashboard',            label: { en: 'HOME',    ka: 'მთავარი' }, icon: LayoutDashboard },
  { href: '/missions',             label: { en: 'MISSIONS',ka: 'მისიები' }, icon: Satellite       },
  { href: '/sky-tools/conditions', label: { en: 'SKY',     ka: 'ცა'      }, icon: Cloud           },
  { href: '/profile',              label: { en: 'PROFILE', ka: 'პროფილი' }, icon: User            },
]

export default function Navigation() {
  const pathname = usePathname()
  const { lang, setLang } = useLanguage()

  const hidden = pathname === '/' || pathname === '/login' || pathname === '/register' || pathname.startsWith('/admin')
  if (hidden) return null

  function isActive(href: string) {
    return pathname === href || pathname.startsWith(href + '/')
  }

  async function handleLogout() {
    const supabase = createClient()
    await supabase.auth.signOut()
    window.location.href = '/'
  }

  return (
    <>
      {/* Desktop top nav */}
      <header className="glass-nav sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between gap-4">

          <Link href="/dashboard" className="flex items-center gap-2 shrink-0">
            <StellarIcon />
            <span className="text-sm font-bold tracking-[0.14em] text-white uppercase">
              Ste<span className="text-[#6366F1]">llar</span>
            </span>
          </Link>

          <nav className="hidden md:flex items-center gap-0.5">
            {desktopLinks.map(link => (
              <Link
                key={link.href}
                href={link.href}
                className={`px-3 py-1.5 text-[11px] font-bold tracking-[0.1em] rounded-lg transition-all ${
                  isActive(link.href)
                    ? 'text-white bg-[#6366F1]/12 border border-[#6366F1]/25'
                    : 'text-[#64748B] hover:text-white hover:bg-white/[0.05]'
                }`}
              >
                {lang === 'ka' ? link.label.ka : link.label.en}
              </Link>
            ))}
          </nav>

          <div className="hidden lg:flex items-center gap-1.5 text-[10px] font-bold tracking-widest text-[#475569] uppercase">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            {lang === 'ka' ? 'ცოცხალი' : 'Live'}
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            <button
              onClick={() => setLang(lang === 'ka' ? 'en' : 'ka')}
              className="text-[10px] font-bold px-2 py-1 rounded-lg border border-white/[0.08] bg-white/[0.03] text-[#64748B] hover:text-white hover:bg-white/[0.06] transition-all tracking-widest"
            >
              {lang === 'ka' ? 'EN' : 'ქარ'}
            </button>
            <Link
              href="/profile"
              className={`w-8 h-8 rounded-full flex items-center justify-center transition-all ${
                isActive('/profile')
                  ? 'bg-[#6366F1] text-white'
                  : 'bg-white/[0.04] border border-white/[0.08] text-[#64748B] hover:text-white hover:bg-white/[0.08]'
              }`}
            >
              <User size={14} />
            </Link>
            <button
              onClick={handleLogout}
              className="w-8 h-8 rounded-full flex items-center justify-center text-[#64748B] hover:text-rose-400 bg-white/[0.03] border border-white/[0.06] hover:bg-rose-500/10 hover:border-rose-500/20 transition-all"
              title={lang === 'ka' ? 'გასვლა' : 'Sign out'}
            >
              <LogOut size={13} />
            </button>
          </div>
        </div>
      </header>

      {/* Mobile bottom tab bar */}
      <nav
        className="sm:hidden fixed bottom-0 left-0 right-0 z-50 border-t border-white/[0.06]"
        style={{ background: 'rgba(6,8,15,0.96)', backdropFilter: 'blur(20px)', paddingBottom: 'env(safe-area-inset-bottom)' }}
      >
        <div className="flex items-stretch">
          {/* First 2 tabs */}
          {mobileTabs.slice(0, 2).map(tab => {
            const active = isActive(tab.href)
            const Icon = tab.icon
            return (
              <Link
                key={tab.href}
                href={tab.href}
                className={`flex-1 flex flex-col items-center justify-center gap-1 py-2.5 transition-colors ${
                  active ? 'text-[#6366F1]' : 'text-[#475569]'
                }`}
              >
                <Icon size={17} />
                <span className="text-[9px] font-bold tracking-wide uppercase">
                  {lang === 'ka' ? tab.label.ka : tab.label.en}
                </span>
              </Link>
            )
          })}

          {/* Center upload button */}
          <div className="flex-1 flex items-center justify-center py-1.5">
            <Link
              href="/gallery"
              className="w-12 h-12 rounded-full flex items-center justify-center shadow-lg shadow-indigo-500/30 transition-all active:scale-95"
              style={{ background: 'linear-gradient(135deg, #6366F1, #7C3AED)', border: '2px solid rgba(99,102,241,0.4)' }}
            >
              <Camera size={20} className="text-white" />
            </Link>
          </div>

          {/* Last 2 tabs */}
          {mobileTabs.slice(2).map(tab => {
            const active = isActive(tab.href)
            const Icon = tab.icon
            return (
              <Link
                key={tab.href}
                href={tab.href}
                className={`flex-1 flex flex-col items-center justify-center gap-1 py-2.5 transition-colors ${
                  active ? 'text-[#6366F1]' : 'text-[#475569]'
                }`}
              >
                <Icon size={17} />
                <span className="text-[9px] font-bold tracking-wide uppercase">
                  {lang === 'ka' ? tab.label.ka : tab.label.en}
                </span>
              </Link>
            )
          })}
        </div>
      </nav>
    </>
  )
}
