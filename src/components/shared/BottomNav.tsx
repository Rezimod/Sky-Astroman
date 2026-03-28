'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { LayoutDashboard, Satellite, Images, Cloud, User } from 'lucide-react'
import { useLanguage } from '@/contexts/LanguageContext'

export default function BottomNav() {
  const pathname = usePathname()
  const { lang } = useLanguage()
  const isLanding = pathname === '/' || pathname === '/login' || pathname === '/register' || pathname.startsWith('/admin')
  if (isLanding) return null

  const tabs = [
    { href: '/dashboard',            label: { en: 'HOME',    ka: 'მთავ.' }, icon: LayoutDashboard },
    { href: '/missions',             label: { en: 'MISSIONS',ka: 'მისია' }, icon: Satellite       },
    { href: '/gallery',              label: { en: 'GALLERY', ka: 'გალ.'  }, icon: Images          },
    { href: '/sky-tools/conditions', label: { en: 'SKY',     ka: 'ცა'    }, icon: Cloud           },
    { href: '/profile',              label: { en: 'PROFILE', ka: 'ანგარ.'}, icon: User            },
  ]

  return (
    <nav
      className="sm:hidden fixed bottom-0 left-0 right-0 z-50 border-t border-white/[0.06]"
      style={{ background: 'rgba(6,8,15,0.96)', backdropFilter: 'blur(20px)', paddingBottom: 'env(safe-area-inset-bottom)' }}
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
  )
}
