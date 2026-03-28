import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { SaturnLogo } from '@/components/shared/SaturnLogo'
import { LayoutDashboard, Users, Eye, LogOut, Shield } from 'lucide-react'

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user || user.app_metadata?.is_admin !== true) {
    redirect('/dashboard')
  }

  return (
    <div className="min-h-screen flex" style={{ background: '#07080f' }}>

      {/* Sidebar */}
      <aside className="w-56 flex-shrink-0 border-r border-white/[0.06] flex flex-col" style={{ background: '#0a0b14' }}>
        {/* Logo */}
        <div className="h-14 flex items-center gap-2 px-4 border-b border-white/[0.06]">
          <SaturnLogo width={28} height={21} />
          <div>
            <div className="text-[10px] font-bold tracking-[0.18em] text-white uppercase">
              Ste<span className="text-[#6366F1]">llar</span>
            </div>
            <div className="text-[8px] text-[#6366F1] font-bold tracking-widest uppercase flex items-center gap-1">
              <Shield size={8} /> Admin
            </div>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 p-3 space-y-1">
          {[
            { href: '/admin', label: 'Dashboard', icon: LayoutDashboard },
            { href: '/admin/users', label: 'Users', icon: Users },
            { href: '/admin/observations', label: 'Observations', icon: Eye },
          ].map(({ href, label, icon: Icon }) => (
            <Link
              key={href}
              href={href}
              className="flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-semibold text-[#64748B] hover:text-white hover:bg-white/[0.04] transition-all"
            >
              <Icon size={14} />
              {label}
            </Link>
          ))}
        </nav>

        {/* Footer */}
        <div className="p-3 border-t border-white/[0.06]">
          <div className="flex items-center gap-2 px-3 py-2 mb-2">
            <div className="w-6 h-6 rounded-full bg-[#6366F1]/20 border border-[#6366F1]/30 flex items-center justify-center flex-shrink-0">
              <Shield size={10} className="text-[#6366F1]" />
            </div>
            <span className="text-[10px] text-[#475569] truncate">admin@skywatcher.ge</span>
          </div>
          <form action="/auth/signout" method="POST">
            <Link
              href="/dashboard"
              className="flex items-center gap-2 px-3 py-2 rounded-lg text-xs text-[#64748B] hover:text-white hover:bg-white/[0.04] transition-all"
            >
              <LogOut size={13} /> Exit Admin
            </Link>
          </form>
        </div>
      </aside>

      {/* Content */}
      <div className="flex-1 flex flex-col min-h-screen overflow-auto">
        <div className="flex-1 p-6">
          {children}
        </div>
      </div>
    </div>
  )
}
