import { createServiceClient } from '@/lib/supabase/service'
import { Users, Shield, Star } from 'lucide-react'

export const dynamic = 'force-dynamic'

export default async function AdminUsersPage() {
  const supabase = createServiceClient()

  const { data: users, error } = await supabase
    .from('profiles')
    .select('id, username, display_name, level, points, observations_count, missions_completed, created_at')
    .order('points', { ascending: false })
    .limit(100)

  return (
    <div className="max-w-5xl animate-page-enter">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-white flex items-center gap-2">
            <Users size={18} className="text-[#6366F1]" /> All Users
          </h1>
          <p className="text-xs text-[#475569] mt-0.5">{users?.length ?? 0} registered members</p>
        </div>
      </div>

      {error && (
        <div className="card p-4 mb-4 border-red-500/20">
          <p className="text-red-400 text-sm">Failed to load users: {error.message}</p>
        </div>
      )}

      <div className="card overflow-hidden">
        <div className="grid grid-cols-[auto_1fr_auto_auto_auto_auto] items-center gap-4 px-4 py-2.5 border-b border-white/[0.06] text-[10px] font-bold tracking-wider text-[#475569] uppercase">
          <span>#</span>
          <span>User</span>
          <span className="text-right">Level</span>
          <span className="text-right">Points</span>
          <span className="text-right hidden sm:block">Obs.</span>
          <span className="text-right hidden sm:block">Joined</span>
        </div>

        {!users?.length ? (
          <div className="px-4 py-10 text-center text-xs text-[#475569]">No users found</div>
        ) : (
          <div className="divide-y divide-white/[0.04]">
            {users.map((u, i) => (
              <div
                key={u.id}
                className="grid grid-cols-[auto_1fr_auto_auto_auto_auto] items-center gap-4 px-4 py-3 hover:bg-white/[0.02] transition-colors"
              >
                <span className="text-[11px] font-mono text-[#334155] w-5 text-center">{i + 1}</span>

                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="w-7 h-7 rounded-full bg-[#6366F1]/15 border border-[#6366F1]/20 flex items-center justify-center flex-shrink-0">
                    <span className="text-[9px] font-bold text-[#6366F1]">
                      {((u.display_name || u.username || '?')[0]).toUpperCase()}
                    </span>
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-semibold text-white truncate">{u.display_name || u.username}</p>
                    <p className="text-[10px] text-[#475569] truncate">@{u.username}</p>
                  </div>
                </div>

                <div className="text-right">
                  <span className="text-[10px] font-bold text-[#6366F1] bg-[#6366F1]/10 px-2 py-0.5 rounded-full">
                    LVL {u.level}
                  </span>
                </div>

                <div className="text-right">
                  <span className="text-sm font-bold text-white">{(u.points ?? 0).toLocaleString()}</span>
                  <span className="text-[9px] text-[#475569] ml-0.5">pts</span>
                </div>

                <div className="text-right hidden sm:block">
                  <span className="text-xs text-[#64748B]">{u.observations_count ?? 0}</span>
                </div>

                <div className="text-right hidden sm:block">
                  <span className="text-[10px] text-[#334155]">
                    {new Date(u.created_at).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
