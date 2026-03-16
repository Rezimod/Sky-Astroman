'use client'
import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Trophy, Star, Eye } from 'lucide-react'
import type { Profile } from '@/lib/types'

type Period = 'all' | 'month' | 'week'

export default function LeaderboardPage() {
  const [period, setPeriod] = useState<Period>('all')
  const [users, setUsers] = useState<Profile[]>([])
  const [currentUserId, setCurrentUserId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadLeaderboard()
  }, [period])

  async function loadLeaderboard() {
    setLoading(true)
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    setCurrentUserId(user?.id ?? null)

    const { data } = await supabase
      .from('profiles')
      .select('*')
      .order('points', { ascending: false })
      .limit(50)

    setUsers(data ?? [])
    setLoading(false)
  }

  const tabs: { key: Period; label: string }[] = [
    { key: 'all', label: 'All Time' },
    { key: 'month', label: 'This Month' },
    { key: 'week', label: 'This Week' },
  ]

  const medalColors = ['text-[#FFD166]', 'text-[#94a3b8]', 'text-amber-600']
  const medalEmojis = ['🥇', '🥈', '🥉']

  return (
    <div className="max-w-2xl mx-auto px-4 py-6 animate-page-enter">
      <header className="mb-5">
        <div className="flex items-center gap-2 mb-1">
          <Trophy size={20} className="text-[#FFD166]" />
          <h1 className="text-2xl font-bold text-white">Leaderboard</h1>
        </div>
        <p className="text-sm text-[var(--text-secondary)]">Top stargazers by observation points</p>
      </header>

      {/* Tabs */}
      <div className="flex gap-1 p-1 glass-card mb-5">
        {tabs.map(tab => (
          <button
            key={tab.key}
            onClick={() => setPeriod(tab.key)}
            className={`flex-1 py-2 px-3 rounded-xl text-sm font-medium transition-all ${
              period === tab.key
                ? 'bg-[rgba(255,209,102,0.15)] text-[#FFD166]'
                : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {loading && (
        <div className="glass-card p-8 text-center text-[var(--text-secondary)] text-sm">Loading...</div>
      )}

      {!loading && users.length === 0 && (
        <div className="glass-card p-12 text-center">
          <Star size={32} className="text-[var(--text-dim)] mx-auto mb-3" />
          <p className="text-[var(--text-secondary)]">No observers yet. Be the first!</p>
        </div>
      )}

      <div className="flex flex-col gap-2">
        {users.map((user, idx) => {
          const isCurrentUser = user.id === currentUserId
          const rank = idx + 1

          return (
            <div
              key={user.id}
              className={`glass-card px-4 py-3 flex items-center gap-4 transition-all ${
                isCurrentUser ? 'border-[rgba(255,209,102,0.3)] glow-gold' : ''
              }`}
            >
              {/* Rank */}
              <div className="w-8 text-center flex-shrink-0">
                {rank <= 3 ? (
                  <span className="text-xl">{medalEmojis[rank - 1]}</span>
                ) : (
                  <span className={`text-sm font-bold ${rank <= 10 ? 'text-[var(--text-secondary)]' : 'text-[var(--text-dim)]'}`}>
                    #{rank}
                  </span>
                )}
              </div>

              {/* Avatar */}
              <div className="w-9 h-9 rounded-full bg-[rgba(255,209,102,0.1)] border border-[rgba(255,209,102,0.2)] flex items-center justify-center flex-shrink-0">
                {user.avatar_url ? (
                  <img src={user.avatar_url} alt={user.username} className="w-full h-full rounded-full object-cover" />
                ) : (
                  <span className="text-[#FFD166] text-sm font-bold">{user.username[0].toUpperCase()}</span>
                )}
              </div>

              {/* Name + stats */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className={`font-semibold text-sm truncate ${isCurrentUser ? 'text-[#FFD166]' : 'text-white'}`}>
                    {user.display_name ?? user.username}
                  </p>
                  {isCurrentUser && <span className="text-[10px] text-[#FFD166] bg-[rgba(255,209,102,0.1)] px-1.5 py-0.5 rounded font-medium flex-shrink-0">You</span>}
                </div>
                <div className="flex items-center gap-3 mt-0.5">
                  <span className="text-[11px] text-[var(--text-dim)]">Lv.{user.level}</span>
                  <span className="text-[11px] text-[var(--text-dim)]">
                    <Eye size={10} className="inline mr-1" />{user.observations_count}
                  </span>
                </div>
              </div>

              {/* Points */}
              <div className="text-right flex-shrink-0">
                <p className={`font-bold text-sm ${rank === 1 ? 'text-[#FFD166]' : rank <= 3 ? medalColors[rank-1] : 'text-white'}`}>
                  {user.points.toLocaleString()}
                </p>
                <p className="text-[10px] text-[var(--text-dim)]">pts</p>
              </div>
            </div>
          )
        })}
      </div>

      {period !== 'all' && (
        <p className="text-center text-xs text-[var(--text-dim)] mt-4">
          Period filtering coming soon — showing all-time for now
        </p>
      )}
    </div>
  )
}
