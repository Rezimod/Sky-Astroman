import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'
import { Users, Eye, Star, TrendingUp } from 'lucide-react'

export const dynamic = 'force-dynamic'

export default async function AdminDashboard() {
  const supabase = await createClient()
  const adminSupabase = createServiceClient()

  const [
    { count: userCount },
    { count: obsCount },
    { count: pendingCount },
    { data: recentUsers },
    { data: recentObs },
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
  ] = await Promise.all([
    adminSupabase.from('profiles').select('*', { count: 'exact', head: true }),
    adminSupabase.from('observations').select('*', { count: 'exact', head: true }),
    adminSupabase.from('observations').select('*', { count: 'exact', head: true }).eq('status', 'pending'),
    adminSupabase.from('profiles').select('id, username, display_name, level, points, created_at').order('created_at', { ascending: false }).limit(5),
    adminSupabase.from('observations').select('id, object_name, status, created_at, profiles(username)').order('created_at', { ascending: false }).limit(5),
  ])

  const stats = [
    { label: 'Total Users', value: userCount ?? 0, icon: Users, color: '#6366F1' },
    { label: 'Observations', value: obsCount ?? 0, icon: Eye, color: '#34D399' },
    { label: 'Pending Review', value: pendingCount ?? 0, icon: Star, color: '#FFD166' },
    { label: 'Active Today', value: '—', icon: TrendingUp, color: '#38F0FF' },
  ]

  return (
    <div className="max-w-5xl animate-page-enter">
      <div className="mb-6">
        <h1 className="text-xl font-bold text-white">Admin Dashboard</h1>
        <p className="text-xs text-[#475569] mt-0.5">Real-time overview · Stellar</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
        {stats.map(s => {
          const Icon = s.icon
          return (
            <div key={s.label} className="card p-4">
              <div className="flex items-center gap-2 mb-3">
                <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: `${s.color}18` }}>
                  <Icon size={13} style={{ color: s.color }} />
                </div>
                <span className="text-[10px] font-bold tracking-wider text-[#64748B] uppercase">{s.label}</span>
              </div>
              <div className="text-2xl font-bold text-white">{s.value.toLocaleString()}</div>
            </div>
          )
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Recent users */}
        <div className="card p-4">
          <h2 className="text-xs font-bold tracking-wider text-[#64748B] uppercase mb-4">Recent Registrations</h2>
          {!recentUsers?.length ? (
            <p className="text-xs text-[#475569] text-center py-4">No users yet</p>
          ) : (
            <div className="space-y-2">
              {recentUsers.map(u => (
                <div key={u.id} className="flex items-center gap-3 py-2 border-b border-white/[0.04] last:border-0">
                  <div className="w-7 h-7 rounded-full bg-[#6366F1]/15 border border-[#6366F1]/20 flex items-center justify-center flex-shrink-0">
                    <span className="text-[9px] font-bold text-[#6366F1]">
                      {(u.display_name || u.username || '?')[0].toUpperCase()}
                    </span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold text-white truncate">{u.display_name || u.username}</p>
                    <p className="text-[10px] text-[#475569]">@{u.username} · LVL {u.level} · {u.points} pts</p>
                  </div>
                  <span className="text-[10px] text-[#334155] flex-shrink-0">
                    {new Date(u.created_at).toLocaleDateString()}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Recent observations */}
        <div className="card p-4">
          <h2 className="text-xs font-bold tracking-wider text-[#64748B] uppercase mb-4">Recent Observations</h2>
          {!recentObs?.length ? (
            <p className="text-xs text-[#475569] text-center py-4">No observations yet</p>
          ) : (
            <div className="space-y-2">
              {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
            {(recentObs as any[]).map((o) => (
                <div key={o.id} className="flex items-center gap-3 py-2 border-b border-white/[0.04] last:border-0">
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold text-white truncate">{o.object_name}</p>
                    <p className="text-[10px] text-[#475569]">
                      @{(Array.isArray(o.profiles) ? o.profiles[0] : o.profiles)?.username ?? '?'} · {new Date(o.created_at).toLocaleDateString()}
                    </p>
                  </div>
                  <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full ${
                    o.status === 'approved'
                      ? 'bg-[#34D399]/10 text-[#34D399]'
                      : o.status === 'pending'
                      ? 'bg-[#FFD166]/10 text-[#FFD166]'
                      : 'bg-red-500/10 text-red-400'
                  }`}>
                    {o.status.toUpperCase()}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
