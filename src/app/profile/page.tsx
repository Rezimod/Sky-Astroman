'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import {
  Crown, MapPin, Wind, Thermometer, CheckCircle, Telescope, Camera, Satellite,
  Star, Flame, Award, LogOut, ChevronLeft, LayoutDashboard, Shield, Clock, CheckCircle2, XCircle,
} from 'lucide-react'
import Link from 'next/link'
import { getLevelForPoints, getProgressToNextLevel, BADGES } from '@/lib/gamification'
import { useLanguage } from '@/contexts/LanguageContext'
import { createClient } from '@/lib/supabase/client'
import Image from 'next/image'

const BADGE_UI: Record<string, { Icon: React.ComponentType<{ size?: number; className?: string }>; label_ka: string; label_en: string }> = {
  first_step:    { Icon: Star,      label_ka: 'პირველი ნაბიჯი',  label_en: 'First Step'   },
  observer:      { Icon: Telescope, label_ka: 'დამკვირვებელი',   label_en: 'Observer'     },
  photographer:  { Icon: Camera,    label_ka: 'ფოტოგრაფი',      label_en: 'Photographer' },
  nebula_hunter: { Icon: Star,      label_ka: 'ნებულა მონ.',     label_en: 'Nebula'       },
  planet_hunter: { Icon: Satellite, label_ka: 'პლანეტა მონ.',    label_en: 'Planets'      },
  streak_7:      { Icon: Flame,     label_ka: '7 დღე',           label_en: '7-Day'        },
  streak_30:     { Icon: Flame,     label_ka: '30 დღე',          label_en: '30-Day'       },
  team_player:   { Icon: Award,     label_ka: 'გუნდი',           label_en: 'Team'         },
  teacher:       { Icon: Award,     label_ka: 'მასწავლებელი',    label_en: 'Teacher'      },
}

const STATUS_CONFIG = {
  approved: { icon: CheckCircle2, color: '#34D399', bg: 'rgba(52,211,153,0.12)', border: 'rgba(52,211,153,0.25)', label_en: 'Approved', label_ka: 'დამტკიცდა' },
  pending:  { icon: Clock,        color: '#FFD166', bg: 'rgba(255,209,102,0.12)', border: 'rgba(255,209,102,0.25)', label_en: 'Pending',  label_ka: 'განხილვაში' },
  rejected: { icon: XCircle,      color: '#F87171', bg: 'rgba(248,113,113,0.12)', border: 'rgba(248,113,113,0.25)', label_en: 'Rejected', label_ka: 'უარყოფილია' },
}

interface ProfileData {
  id: string
  display_name: string | null
  username: string
  points: number
  level: number
  observations_count: number
  missions_completed: number
  rank: number
}

interface RecentObs {
  id: string
  object_name: string
  photo_url?: string
  status: string
  points_awarded: number
  observed_at: string
}

export default function ProfilePage() {
  const router = useRouter()
  const { lang } = useLanguage()
  const [profile, setProfile] = useState<ProfileData | null>(null)
  const [earnedBadgeIds, setEarnedBadgeIds] = useState<Set<string>>(new Set())
  const [streak, setStreak] = useState({ current: 0, max: 0 })
  const [recentObs, setRecentObs] = useState<RecentObs[]>([])
  const [loading, setLoading] = useState(true)
  const [isAdmin, setIsAdmin] = useState(false)

  useEffect(() => {
    async function load() {
      const [profileRes, badgesRes, streakRes, obsRes, { data: { user } }] = await Promise.all([
        fetch('/api/users/profile'),
        fetch('/api/badges'),
        fetch('/api/users/streak'),
        fetch('/api/observations?mine=true&status=all&limit=6'),
        createClient().auth.getUser(),
      ])

      if (!user) {
        window.location.href = '/login'
        return
      }

      const profileData = profileRes.ok ? await profileRes.json() : null
      const badgesData  = badgesRes.ok  ? await badgesRes.json()  : []
      const streakData  = streakRes.ok  ? await streakRes.json()  : { current: 0, max: 0 }
      const obsData     = obsRes.ok     ? await obsRes.json()     : []

      if (profileData && !profileData.error) setProfile(profileData)
      if (Array.isArray(badgesData)) setEarnedBadgeIds(new Set(badgesData.map((b: { badge_id: string }) => b.badge_id)))
      if (streakData) setStreak(streakData)
      if (Array.isArray(obsData)) setRecentObs(obsData.slice(0, 6))
      if (user?.app_metadata?.is_admin === true) setIsAdmin(true)
      setLoading(false)
    }
    load().catch(() => setLoading(false))
  }, [])

  async function handleSignOut() {
    await createClient().auth.signOut()
    window.location.href = '/'
  }

  const levelInfo = profile ? getLevelForPoints(profile.points) : null
  const levelProgress = profile ? getProgressToNextLevel(profile.points) : null
  const displayName = profile?.display_name ?? profile?.username ?? ''
  const initials = displayName ? displayName.slice(0, 2).toUpperCase() : '?'

  return (
    <div className="max-w-6xl mx-auto px-3 sm:px-4 lg:px-6 py-4 sm:py-6 animate-page-enter">

      {/* Header */}
      <div className="relative flex items-center justify-center mb-5">
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
          {lang === 'ka' ? 'ჩემი ანგარიში' : 'My Account'}
        </h1>
        <Link
          href="/dashboard"
          className="absolute right-0 w-9 h-9 rounded-full flex items-center justify-center transition-all hover:bg-white/[0.08]"
          style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}
        >
          <LayoutDashboard size={15} className="text-[#94A3B8]" />
        </Link>
      </div>

      <div className="grid lg:grid-cols-12 gap-3 sm:gap-4">

        {/* Left */}
        <div className="lg:col-span-4 space-y-3">

          {/* Avatar card */}
          <div className="card p-6 text-center">
            <div className="relative inline-flex items-center justify-center mb-5" style={{ width: 96, height: 96 }}>
              <svg width="96" height="96" viewBox="0 0 96 96" className="absolute inset-0">
                <circle cx="48" cy="48" r="44" fill="none" stroke="rgba(99,102,241,0.2)" strokeWidth="1.5" strokeDasharray="5 4" />
              </svg>
              <svg width="96" height="96" viewBox="0 0 96 96" className="absolute inset-0">
                <circle cx="48" cy="4" r="4" fill="#6366F1" />
              </svg>
              <div className="w-16 h-16 rounded-full relative z-10 flex items-center justify-center text-lg font-bold text-white" style={{ background: 'linear-gradient(135deg, rgba(99,102,241,0.3), rgba(168,85,247,0.2))', border: '1px solid rgba(99,102,241,0.35)' }}>
                {loading ? <Telescope size={26} className="text-[#818CF8]" /> : initials}
              </div>
              <div className="absolute bottom-0 right-0 w-8 h-8 rounded-full bg-[#FFD166] border-2 border-[#0D1117] flex items-center justify-center z-20">
                <Crown size={14} className="text-[#0D1117]" />
              </div>
            </div>

            {loading ? (
              <div className="space-y-2 mb-5">
                <div className="h-5 rounded-full mx-auto w-32 animate-pulse" style={{ background: 'rgba(255,255,255,0.06)' }} />
                <div className="h-3 rounded-full mx-auto w-24 animate-pulse" style={{ background: 'rgba(255,255,255,0.04)' }} />
                <div className="h-3 rounded-full mx-auto w-20 animate-pulse" style={{ background: 'rgba(255,255,255,0.03)' }} />
              </div>
            ) : (
              <>
                <h2 className="text-lg font-bold text-white mb-0.5">{displayName}</h2>
                <p className="text-[11px] font-bold tracking-[0.12em] text-[#6366F1] mb-1">
                  LVL {levelInfo?.level ?? 1} · {lang === 'ka' ? levelInfo?.title_ka : levelInfo?.title_en}
                </p>
                <p className="text-[11px] text-[#475569] mb-5">@{profile?.username ?? ''}</p>
              </>
            )}

            <div className="grid grid-cols-2 gap-2 mb-4">
              <div className="bg-white/[0.03] border border-white/[0.06] rounded-lg p-3 text-center">
                <div className="text-xs text-[#64748B] uppercase tracking-wide mb-1">{lang === 'ka' ? 'ქულა' : 'Total XP'}</div>
                <div className="text-xl font-bold text-white">{loading ? '...' : (profile?.points ?? 0).toLocaleString()}</div>
              </div>
              <div className="bg-white/[0.03] border border-white/[0.06] rounded-lg p-3 text-center">
                <div className="text-xs text-[#64748B] uppercase tracking-wide mb-1">{lang === 'ka' ? 'რეიტინგი' : 'Rank'}</div>
                <div className="text-xl font-bold text-white">{loading ? '...' : `#${profile?.rank ?? '-'}`}</div>
              </div>
            </div>

            <div className="text-left">
              <div className="flex justify-between items-center mb-1.5">
                <span className="text-[10px] text-[#64748B] uppercase tracking-wider font-bold">{lang === 'ka' ? 'XP პროგრესი' : 'XP Progress'}</span>
                <span className="text-[10px] text-[#475569]">{levelProgress?.current ?? 0} / {levelProgress?.needed ?? 200}</span>
              </div>
              <div className="h-1 bg-white/[0.05] rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-700"
                  style={{ width: `${levelProgress?.percentage ?? 0}%`, background: 'linear-gradient(90deg, #6366F1, #A855F7)' }}
                />
              </div>
              <p className="text-[10px] text-[#334155] mt-1.5">
                {(levelProgress?.needed ?? 0) - (levelProgress?.current ?? 0)} XP {lang === 'ka' ? `→ LVL ${(levelInfo?.level ?? 1) + 1}` : `to Level ${(levelInfo?.level ?? 1) + 1}`}
              </p>
            </div>
          </div>

          {/* Location */}
          <div className="card p-5">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <MapPin size={13} className="text-[#6366F1]" />
                <span className="text-[10px] font-bold tracking-[0.12em] text-[#64748B] uppercase">
                  {lang === 'ka' ? 'მდებარეობა' : 'Location'}
                </span>
              </div>
              <span className="text-[9px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 uppercase tracking-wider">
                {lang === 'ka' ? 'ლაივ' : 'Live'}
              </span>
            </div>
            <div className="flex justify-between items-center mb-3">
              <span className="text-sm text-[#94A3B8]">{lang === 'ka' ? 'თბილისი, საქართველო' : 'Tbilisi, Georgia'}</span>
              <span className="text-sm font-bold text-white">
                {new Date().toLocaleTimeString(lang === 'ka' ? 'ka-GE' : 'en-US', { hour: '2-digit', minute: '2-digit' })}
              </span>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div className="bg-white/[0.03] border border-white/[0.06] rounded-lg p-2.5 flex items-center gap-2">
                <Wind size={12} className="text-blue-400 flex-shrink-0" />
                <div>
                  <div className="text-[9px] text-[#475569] uppercase tracking-wide">{lang === 'ka' ? 'ქარი' : 'Wind'}</div>
                  <div className="text-xs font-bold text-white">4 km/h</div>
                </div>
              </div>
              <div className="bg-white/[0.03] border border-white/[0.06] rounded-lg p-2.5 flex items-center gap-2">
                <Thermometer size={12} className="text-orange-400 flex-shrink-0" />
                <div>
                  <div className="text-[9px] text-[#475569] uppercase tracking-wide">{lang === 'ka' ? 'ტემპ.' : 'Temp'}</div>
                  <div className="text-xs font-bold text-white">12°C</div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Right */}
        <div className="lg:col-span-8 space-y-3">

          {/* Stats row */}
          <div className="grid grid-cols-3 gap-3">
            {[
              { Icon: CheckCircle, val: loading ? '...' : profile?.missions_completed ?? 0, label_en: 'Missions', label_ka: 'მისიები', color: '#6366F1', bg: 'rgba(99,102,241,0.08)', sub_en: `${profile?.observations_count ?? 0} obs`, sub_ka: `${profile?.observations_count ?? 0} დაკვირ.` },
              { Icon: Flame,       val: loading ? '...' : streak.current, label_en: 'Day Streak', label_ka: 'სთრიქი', color: '#F97316', bg: 'rgba(249,115,22,0.08)', sub_en: `Best: ${streak.max}d`, sub_ka: `მაქს: ${streak.max}დ` },
              { Icon: Award,       val: loading ? '...' : earnedBadgeIds.size, label_en: 'Badges', label_ka: 'ბეიჯები', color: '#A855F7', bg: 'rgba(168,85,247,0.08)', sub_en: `${BADGES.length - earnedBadgeIds.size} to unlock`, sub_ka: `${BADGES.length - earnedBadgeIds.size} ლოდინშია` },
            ].map(s => (
              <div key={s.label_en} className="card p-4">
                <div className="w-9 h-9 rounded-lg flex items-center justify-center mb-3" style={{ background: s.bg }}>
                  <s.Icon size={18} style={{ color: s.color }} />
                </div>
                <div className="text-2xl font-bold text-white mb-0.5">{s.val}</div>
                <div className="text-[10px] text-[#64748B] uppercase tracking-wider">{lang === 'ka' ? s.label_ka : s.label_en}</div>
                <div className="text-[10px] text-[#475569] mt-1">{lang === 'ka' ? s.sub_ka : s.sub_en}</div>
              </div>
            ))}
          </div>

          {/* Achievements */}
          <div className="card p-5">
            <div className="flex items-center justify-between mb-4">
              <span className="text-[10px] font-bold tracking-[0.15em] text-[#64748B] uppercase">
                {lang === 'ka' ? 'მიღწევები' : 'Achievements'}
              </span>
              <span className="text-[10px] text-[#475569]">{earnedBadgeIds.size}/{BADGES.length}</span>
            </div>
            <div className="flex flex-wrap gap-5 sm:gap-6">
              {BADGES.map(badge => {
                const ui = BADGE_UI[badge.id]
                if (!ui) return null
                const earned = earnedBadgeIds.has(badge.id)
                return (
                  <div
                    key={badge.id}
                    className={`flex flex-col items-center gap-2 group ${!earned ? 'opacity-30 grayscale' : ''}`}
                    title={lang === 'ka' ? badge.title_ka : badge.title_en}
                  >
                    <div className="w-12 h-12 rounded-xl bg-white/[0.04] border border-white/[0.08] flex items-center justify-center group-hover:border-[#6366F1]/40 transition-all cursor-pointer relative overflow-hidden">
                      <ui.Icon size={20} className="text-[#6366F1] relative z-10" />
                      {earned && (
                        <div className="absolute inset-0 bg-[#6366F1]/10 opacity-0 group-hover:opacity-100 transition-opacity" />
                      )}
                    </div>
                    <span className="text-[9px] text-[#475569] font-bold uppercase tracking-wider text-center max-w-[56px] leading-tight">
                      {lang === 'ka' ? ui.label_ka : ui.label_en}
                    </span>
                  </div>
                )
              })}
            </div>
          </div>

          {/* Recent observations */}
          <div className="card p-5">
            <div className="flex items-center justify-between mb-4">
              <span className="text-[10px] font-bold tracking-[0.15em] text-[#64748B] uppercase block">
                {lang === 'ka' ? 'ბოლო დაკვირვებები' : 'Recent Observations'}
              </span>
              {recentObs.length > 0 && (
                <Link href="/gallery" className="text-[11px] font-bold text-[#6366F1] hover:text-[#818CF8] transition-colors">
                  {lang === 'ka' ? 'ყველა' : 'View all'}
                </Link>
              )}
            </div>

            {loading ? (
              <div className="space-y-2">
                {[...Array(3)].map((_, i) => (
                  <div key={i} className="h-14 rounded-xl animate-pulse" style={{ background: 'rgba(255,255,255,0.03)' }} />
                ))}
              </div>
            ) : recentObs.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 text-center">
                <Camera size={28} className="text-[#1E2235] mb-3" />
                <p className="text-sm text-[#475569] font-medium mb-1">
                  {lang === 'ka' ? 'დაკვირვება ჯერ არ არის' : 'No observations yet'}
                </p>
                <p className="text-xs text-[#334155] mb-4">
                  {lang === 'ka' ? 'მისიაზე გადი და პირველი ფოტო გაგზავნე' : 'Complete a mission to log your first observation'}
                </p>
                <Link
                  href="/missions"
                  className="text-xs font-bold px-4 py-2 rounded-xl transition-all"
                  style={{ background: '#6366F1', color: 'white' }}
                >
                  {lang === 'ka' ? 'მისიები →' : 'Go to Missions →'}
                </Link>
              </div>
            ) : (
              <div className="space-y-2">
                {recentObs.map(o => {
                  const cfg = STATUS_CONFIG[o.status as keyof typeof STATUS_CONFIG] ?? STATUS_CONFIG.pending
                  const StatusIcon = cfg.icon
                  return (
                    <div key={o.id} className="flex items-center gap-3 p-2.5 rounded-xl transition-all hover:bg-white/[0.03]"
                      style={{ border: '1px solid rgba(255,255,255,0.05)' }}>
                      {/* Thumbnail */}
                      <div className="w-10 h-10 rounded-lg overflow-hidden flex-shrink-0 bg-[#0D1117] relative">
                        {o.photo_url ? (
                          <Image src={o.photo_url} alt={o.object_name} fill sizes="40px" className="object-cover" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <Camera size={14} className="text-[#334155]" />
                          </div>
                        )}
                      </div>
                      {/* Info */}
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-bold text-white truncate">{o.object_name}</div>
                        <div className="text-[10px] text-[#475569]">
                          {new Date(o.observed_at).toLocaleDateString(lang === 'ka' ? 'ka-GE' : 'en-US', { day: 'numeric', month: 'short' })}
                        </div>
                      </div>
                      {/* Status + XP */}
                      <div className="flex flex-col items-end gap-1 flex-shrink-0">
                        <span className="flex items-center gap-1 text-[9px] font-bold px-1.5 py-0.5 rounded-full"
                          style={{ background: cfg.bg, color: cfg.color, border: `1px solid ${cfg.border}` }}>
                          <StatusIcon size={8} />
                          {lang === 'ka' ? cfg.label_ka : cfg.label_en}
                        </span>
                        {o.status === 'approved' && o.points_awarded > 0 && (
                          <span className="text-[9px] font-bold" style={{ color: '#F59E0B' }}>+{o.points_awarded} XP</span>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>

          {/* Admin link */}
          {isAdmin && (
            <div className="text-center py-1">
              <Link
                href="/admin"
                className="inline-flex items-center gap-2 text-xs font-bold px-4 py-2 rounded-xl transition-all"
                style={{ background: 'rgba(99,102,241,0.10)', color: '#818CF8', border: '1px solid rgba(99,102,241,0.25)' }}
              >
                <Shield size={13} /> Admin Panel
              </Link>
            </div>
          )}

          {/* Sign out */}
          <div className="text-center py-2">
            <button
              onClick={handleSignOut}
              className="inline-flex items-center gap-2 text-xs text-[#475569] hover:text-red-400 transition-colors font-medium"
            >
              <LogOut size={13} />
              {lang === 'ka' ? 'სისტემიდან გასვლა' : 'Sign out'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
