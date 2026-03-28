'use client'
import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Crown, ArrowRight, User, Telescope, ChevronLeft, LayoutDashboard } from 'lucide-react'
import { useLanguage } from '@/contexts/LanguageContext'
import { createClient } from '@/lib/supabase/client'

type Period = 'all' | 'month' | 'week'

interface LeaderboardUser {
  id: string
  username: string
  display_name: string | null
  level: number
  points: number
  observations_count: number
}

function getRankTitle(level: number): string {
  if (level >= 9) return 'ვარსკვლავთმრიცხველი'
  if (level >= 7) return 'ასტროფოტოგრაფი'
  if (level >= 5) return 'მთვარის მაძიებელი'
  if (level >= 3) return 'ობზერვატორი'
  return 'დამწყები'
}

function getInitials(user: LeaderboardUser): string {
  const name = user.display_name ?? user.username
  const parts = name.trim().split(/\s+/)
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase()
  return name.slice(0, 2).toUpperCase()
}

export default function LeaderboardPage() {
  const { lang } = useLanguage()
  const router = useRouter()
  const [period, setPeriod]           = useState<Period>('week')
  const [users, setUsers]             = useState<LeaderboardUser[]>([])
  const [loading, setLoading]         = useState(true)
  const [currentUserId, setCurrentUserId] = useState<string | null>(null)

  const periodTabs: { key: Period; en: string; ka: string }[] = [
    { key: 'week',  en: 'WEEK',     ka: 'კვირა'  },
    { key: 'month', en: 'MONTH',    ka: 'თვე'    },
    { key: 'all',   en: 'ALL TIME', ka: 'საერთო' },
  ]

  // Get current logged-in user once
  useEffect(() => {
    createClient().auth.getUser().then(({ data }) => {
      setCurrentUserId(data.user?.id ?? null)
    })
  }, [])

  // Fetch leaderboard whenever period changes
  useEffect(() => {
    setLoading(true)
    fetch(`/api/leaderboard?period=${period}`)
      .then(r => r.json())
      .then(data => {
        setUsers(Array.isArray(data) ? data : [])
        setLoading(false)
      })
      .catch(() => { setUsers([]); setLoading(false) })
  }, [period])

  const top3    = users.slice(0, 3)
  const rest    = users.slice(3)
  const current = users.find(u => u.id === currentUserId) ?? null
  const currentRank = users.findIndex(u => u.id === currentUserId) + 1

  // Podium: 2nd left, 1st center, 3rd right
  const podiumOrder   = top3.length >= 3 ? [top3[1], top3[0], top3[2]] : top3.length === 2 ? [top3[1], top3[0]] : top3
  const podiumHeights = ['h-24', 'h-32', 'h-20']
  const podiumBorders = ['border-[#94A3B8]/30', 'border-[#FFD166]/50', 'border-[#CD7C3A]/40']
  const podiumColors  = ['text-[#94A3B8]',       'text-[#FFD166]',       'text-[#CD7C3A]']
  const podiumRanks   = top3.length >= 3 ? [2, 1, 3] : top3.length === 2 ? [2, 1] : [1]

  // ── Loading skeleton ──────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="max-w-4xl mx-auto px-3 sm:px-4 lg:px-6 py-4 sm:py-6 pb-28 sm:pb-10 animate-page-enter">
        {/* Header */}
        <div className="mb-5 space-y-3">
          <div className="relative flex items-center justify-center">
            <button
              onClick={() => router.back()}
              className="absolute left-0 w-9 h-9 rounded-full flex items-center justify-center transition-all hover:bg-white/[0.08]"
              style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}
            >
              <ChevronLeft size={16} className="text-[#94A3B8]" />
            </button>
            <h1
              className="text-base sm:text-lg font-bold text-white px-6 py-2 rounded-full"
              style={{ background: 'linear-gradient(135deg, rgba(99,102,241,0.18), rgba(168,85,247,0.12))', border: '1px solid rgba(99,102,241,0.28)' }}
            >
              {lang === 'ka' ? 'ლიდერბორდი' : 'Leaderboard'}
            </h1>
            <Link
              href="/dashboard"
              className="absolute right-0 w-9 h-9 rounded-full flex items-center justify-center transition-all hover:bg-white/[0.08]"
              style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}
            >
              <LayoutDashboard size={15} className="text-[#94A3B8]" />
            </Link>
          </div>
          <div className="flex justify-center">
            <div className="flex items-center gap-1 p-1 bg-white/[0.03] border border-white/[0.06] rounded-lg">
              {periodTabs.map(tab => (
                <button
                  key={tab.key}
                  onClick={() => setPeriod(tab.key)}
                  className={`px-4 py-1.5 rounded text-[11px] font-bold tracking-wider transition-all ${
                    period === tab.key ? 'bg-[#6366F1] text-white' : 'text-[#64748B] hover:text-white'
                  }`}
                >
                  {lang === 'ka' ? tab.ka : tab.en}
                </button>
              ))}
            </div>
          </div>
        </div>
        {/* Podium skeleton */}
        <div className="card p-5 sm:p-6 mb-4">
          <div className="flex items-end justify-center gap-3 sm:gap-6">
            {[0, 1, 2].map(i => (
              <div key={i} className="flex flex-col items-center gap-2 flex-1 max-w-[140px]">
                <div className={`w-12 h-12 sm:w-16 sm:h-16 rounded-full animate-pulse`} style={{ background: 'rgba(255,255,255,0.06)' }} />
                <div className={`${podiumHeights[i]} w-full rounded-t-lg animate-pulse`} style={{ background: 'rgba(255,255,255,0.03)' }} />
              </div>
            ))}
          </div>
        </div>
        {/* Rows skeleton */}
        <div className="card overflow-hidden mb-4">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="flex items-center gap-3 px-4 sm:px-5 py-3 border-b border-white/[0.04]">
              <div className="w-6 h-4 rounded animate-pulse" style={{ background: 'rgba(255,255,255,0.06)' }} />
              <div className="w-8 h-8 rounded-full animate-pulse" style={{ background: 'rgba(255,255,255,0.06)' }} />
              <div className="flex-1 h-4 rounded animate-pulse" style={{ background: 'rgba(255,255,255,0.06)' }} />
              <div className="w-12 h-4 rounded animate-pulse" style={{ background: 'rgba(255,255,255,0.06)' }} />
            </div>
          ))}
        </div>
      </div>
    )
  }

  // ── Empty state ───────────────────────────────────────────────────────────
  if (users.length === 0) {
    return (
      <div className="max-w-4xl mx-auto px-3 sm:px-4 lg:px-6 py-4 sm:py-6 pb-28 sm:pb-10 animate-page-enter">
        {/* Header */}
        <div className="mb-5 space-y-3">
          <div className="relative flex items-center justify-center">
            <button
              onClick={() => router.back()}
              className="absolute left-0 w-9 h-9 rounded-full flex items-center justify-center transition-all hover:bg-white/[0.08]"
              style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}
            >
              <ChevronLeft size={16} className="text-[#94A3B8]" />
            </button>
            <h1
              className="text-base sm:text-lg font-bold text-white px-6 py-2 rounded-full"
              style={{ background: 'linear-gradient(135deg, rgba(99,102,241,0.18), rgba(168,85,247,0.12))', border: '1px solid rgba(99,102,241,0.28)' }}
            >
              {lang === 'ka' ? 'ლიდერბორდი' : 'Leaderboard'}
            </h1>
            <Link
              href="/dashboard"
              className="absolute right-0 w-9 h-9 rounded-full flex items-center justify-center transition-all hover:bg-white/[0.08]"
              style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}
            >
              <LayoutDashboard size={15} className="text-[#94A3B8]" />
            </Link>
          </div>
          <div className="flex justify-center">
            <div className="flex items-center gap-1 p-1 bg-white/[0.03] border border-white/[0.06] rounded-lg">
              {periodTabs.map(tab => (
                <button
                  key={tab.key}
                  onClick={() => setPeriod(tab.key)}
                  className={`px-4 py-1.5 rounded text-[11px] font-bold tracking-wider transition-all ${
                    period === tab.key ? 'bg-[#6366F1] text-white' : 'text-[#64748B] hover:text-white'
                  }`}
                >
                  {lang === 'ka' ? tab.ka : tab.en}
                </button>
              ))}
            </div>
          </div>
        </div>
        <div className="card p-16 flex flex-col items-center gap-4 text-center">
          <Crown size={40} className="text-[#334155]" />
          <p className="text-base font-bold text-[#475569]">
            {lang === 'ka'
              ? 'ჯერ მომხმარებლები არ არის — იყავი პირველი!'
              : 'No users yet — be the first!'}
          </p>
          <Link
            href="/missions"
            className="text-sm font-bold px-5 py-2 rounded-lg"
            style={{ background: '#6366F1', color: 'white' }}
          >
            {lang === 'ka' ? 'მისიების დაწყება' : 'Start Missions'}
          </Link>
        </div>
      </div>
    )
  }

  // ── Loaded data ───────────────────────────────────────────────────────────
  return (
    <div className="max-w-4xl mx-auto px-3 sm:px-4 lg:px-6 py-4 sm:py-6 pb-28 sm:pb-10 animate-page-enter">

      {/* Header */}
      <div className="mb-5 space-y-3">
        <div className="relative flex items-center justify-center">
          <button
            onClick={() => router.back()}
            className="absolute left-0 w-9 h-9 rounded-full flex items-center justify-center transition-all hover:bg-white/[0.08]"
            style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}
          >
            <ChevronLeft size={16} className="text-[#94A3B8]" />
          </button>
          <h1
            className="text-base sm:text-lg font-bold text-white px-6 py-2 rounded-full"
            style={{ background: 'linear-gradient(135deg, rgba(99,102,241,0.18), rgba(168,85,247,0.12))', border: '1px solid rgba(99,102,241,0.28)' }}
          >
            {lang === 'ka' ? 'ლიდერბორდი' : 'Leaderboard'}
          </h1>
          <Link
            href="/dashboard"
            className="absolute right-0 w-9 h-9 rounded-full flex items-center justify-center transition-all hover:bg-white/[0.08]"
            style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}
          >
            <LayoutDashboard size={15} className="text-[#94A3B8]" />
          </Link>
        </div>
        <div className="flex justify-center">
          <div className="flex items-center gap-1 p-1 bg-white/[0.03] border border-white/[0.06] rounded-lg">
            {periodTabs.map(tab => (
              <button
                key={tab.key}
                onClick={() => setPeriod(tab.key)}
                className={`px-4 py-1.5 rounded text-[11px] font-bold tracking-wider transition-all ${
                  period === tab.key ? 'bg-[#6366F1] text-white' : 'text-[#64748B] hover:text-white'
                }`}
              >
                {lang === 'ka' ? tab.ka : tab.en}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Podium top 3 */}
      {top3.length > 0 && (
        <div className="card p-5 sm:p-6 mb-4">
          <div className="flex items-end justify-center gap-3 sm:gap-6">
            {podiumOrder.map((user, i) => {
              const rank    = podiumRanks[i]
              const isFirst = rank === 1
              const isMe    = user.id === currentUserId
              return (
                <div key={user.id} className="flex flex-col items-center gap-2 sm:gap-3 flex-1 max-w-[140px]">
                  {isFirst && <Crown size={20} className="text-[#FFD166]" />}
                  <div
                    className={`relative w-12 h-12 sm:w-16 sm:h-16 rounded-full border-2 ${podiumBorders[i]} flex items-center justify-center ${isFirst ? 'bg-gradient-to-br from-[#6366F1] to-[#A855F7]' : isMe ? 'bg-[#6366F1]' : 'bg-[#1E2235]'}`}
                    style={isMe && !isFirst ? { borderColor: 'rgba(99,102,241,0.5)' } : {}}
                  >
                    {isFirst || isMe ? <Telescope size={isFirst ? 20 : 16} className="text-white" /> : <User size={16} className="text-[#64748B]" />}
                    <div className={`absolute -bottom-2 left-1/2 -translate-x-1/2 w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-black ${isFirst ? 'bg-[#FFD166] text-[#0D1117]' : 'bg-[#1E2235] border border-white/10 text-white'}`}>
                      {rank}
                    </div>
                  </div>
                  <div
                    className={`${podiumHeights[i]} w-full rounded-t-lg flex flex-col items-center justify-start pt-4 text-center px-2`}
                    style={{
                      background: isFirst ? 'rgba(99,102,241,0.08)' : isMe ? 'rgba(99,102,241,0.05)' : 'rgba(255,255,255,0.02)',
                      border: '1px solid',
                      borderColor: isFirst ? 'rgba(99,102,241,0.2)' : isMe ? 'rgba(99,102,241,0.25)' : 'rgba(255,255,255,0.06)',
                      borderBottom: 'none',
                    }}
                  >
                    <p className="text-xs font-bold text-white truncate w-full">{user.display_name ?? user.username}</p>
                    <p className={`text-[11px] font-bold mt-1 ${podiumColors[i]}`}>{user.points.toLocaleString()}</p>
                    <p className="text-[9px] text-[#475569] uppercase tracking-wide hidden sm:block mt-0.5">XP</p>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Ranks 4+ */}
      {rest.length > 0 && (
        <div className="card overflow-hidden mb-4">
          <div className="hidden sm:grid grid-cols-12 px-5 py-3 border-b border-white/[0.06]">
            <span className="col-span-1 text-[10px] font-bold tracking-wider text-[#475569] uppercase">#</span>
            <span className="col-span-5 text-[10px] font-bold tracking-wider text-[#475569] uppercase">{lang === 'ka' ? 'მომხმარებელი' : 'User'}</span>
            <span className="col-span-3 text-[10px] font-bold tracking-wider text-[#475569] uppercase hidden sm:block">{lang === 'ka' ? 'წოდება' : 'Title'}</span>
            <span className="col-span-3 text-[10px] font-bold tracking-wider text-[#475569] uppercase text-right">{lang === 'ka' ? 'ქულა' : 'Points'}</span>
          </div>
          <div>
            {rest.map((user, idx) => {
              const rank = idx + 4
              const isMe = user.id === currentUserId
              return (
                <div
                  key={user.id}
                  className={`flex items-center gap-3 sm:gap-0 sm:grid sm:grid-cols-12 px-4 sm:px-5 py-3 border-b border-white/[0.04] transition-colors last:border-0 ${isMe ? 'bg-[#6366F1]/[0.05]' : 'hover:bg-white/[0.02]'}`}
                  style={isMe ? { boxShadow: 'inset 0 0 0 1px rgba(99,102,241,0.25)' } : {}}
                >
                  <span className={`sm:col-span-1 text-[11px] font-bold font-mono flex-shrink-0 ${isMe ? 'text-[#6366F1]' : 'text-[#475569]'}`}>
                    {String(rank).padStart(2, '0')}
                  </span>
                  <div className="sm:col-span-5 flex items-center gap-2.5 flex-1 min-w-0">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center border flex-shrink-0 ${isMe ? 'bg-[#6366F1] border-[#6366F1]/40' : 'bg-[#1E2235] border-white/[0.08]'}`}>
                      {isMe ? <Telescope size={13} className="text-white" /> : <User size={12} className="text-[#64748B]" />}
                    </div>
                    <div className="min-w-0">
                      <span className={`text-sm font-bold block truncate ${isMe ? 'text-[#818CF8]' : 'text-white'}`}>{user.display_name ?? user.username}</span>
                      {isMe && <span className="text-[9px] font-bold text-[#6366F1] uppercase tracking-wider">{lang === 'ka' ? 'შენ' : 'You'}</span>}
                    </div>
                  </div>
                  <span className="sm:col-span-3 text-xs text-[#475569] hidden sm:block">
                    <span className="bg-white/[0.04] border border-white/[0.06] px-2 py-0.5 rounded text-[10px]">
                      {getRankTitle(user.level)}
                    </span>
                  </span>
                  <span className="sm:col-span-3 text-sm font-bold text-white sm:text-right flex-shrink-0">
                    {user.points.toLocaleString()}
                  </span>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Sticky current user bar */}
      {current && (
        <div className="fixed bottom-14 sm:bottom-0 left-0 right-0 z-40 border-t border-[#6366F1]/20 backdrop-blur-xl"
          style={{ background: 'rgba(9,12,20,0.90)' }}
        >
          <div className="max-w-4xl mx-auto px-4 py-3 flex items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="text-center">
                <div className="text-[10px] font-bold text-[#6366F1] uppercase tracking-widest">{lang === 'ka' ? 'შენი ადგილი' : 'Your Rank'}</div>
                <div className="text-xl font-bold text-white">#{currentRank}</div>
              </div>
              <div className="w-px h-8 bg-white/10" />
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-full bg-[#6366F1] flex items-center justify-center"><Telescope size={15} className="text-white" /></div>
                <div>
                  <div className="text-sm font-bold text-white leading-none">{current.display_name ?? current.username}</div>
                  <div className="text-[10px] text-[#475569] mt-0.5">{current.points} XP</div>
                </div>
              </div>
            </div>
            <Link
              href="/missions"
              className="flex items-center gap-1.5 text-[11px] font-bold px-4 py-2 rounded-lg transition-all"
              style={{ background: '#6366F1', color: 'white' }}
            >
              {lang === 'ka' ? 'ქულების დაგროვება' : 'Earn Points'}
              <ArrowRight size={12} />
            </Link>
          </div>
        </div>
      )}
    </div>
  )
}
