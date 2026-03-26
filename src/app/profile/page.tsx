'use client'
import { useRouter } from 'next/navigation'
import { Crown, MapPin, Wind, Thermometer, CheckCircle, Clock, Telescope, Camera, Satellite, Star, Flame, Award, LogOut } from 'lucide-react'
import { getPointsToNextLevel } from '@/lib/constants'
import { useLanguage } from '@/contexts/LanguageContext'
import { createClient } from '@/lib/supabase/client'

const mockProfile = {
  initials: 'SG',
  display_name: 'Stargazer',
  username: 'stargazer_tbilisi',
  title_en: 'NOVICE STARGAZER',
  title_ka: 'დამწყები',
  level: 3,
  points: 720,
  observations_count: 12,
  missions_completed: 5,
}

const mockObservations = [
  { id: '1', object_name: 'Moon',    object_name_ka: 'მთვარე',   status: 'approved', points_awarded: 50,  created_at: new Date(Date.now() - 86400000 * 2).toISOString() },
  { id: '2', object_name: 'Jupiter', object_name_ka: 'იუპიტერი', status: 'pending',  points_awarded: 0,   created_at: new Date(Date.now() - 86400000).toISOString() },
]

const STATUS_COLOR: Record<string, string> = {
  approved: '#34d399',
  pending:  '#FFD166',
  rejected: '#f87171',
}

const achievements = [
  { Icon: Telescope, label: 'დამკვირვებელი', labelEn: 'Observer',    earned: true  },
  { Icon: Camera,    label: 'ფოტოგრაფი',     labelEn: 'Photographer', earned: true  },
  { Icon: Star,      label: 'ნებულა',         labelEn: 'Nebula',       earned: true  },
  { Icon: Satellite, label: 'კომეტა',         labelEn: 'Comet',        earned: false },
  { Icon: Award,     label: 'სატელიტი',      labelEn: 'Satellite',    earned: false },
]

export default function ProfilePage() {
  const router = useRouter()
  const { lang } = useLanguage()
  const levelProgress = getPointsToNextLevel(mockProfile.points)

  async function handleSignOut() {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/')
  }

  return (
    <div className="max-w-6xl mx-auto px-3 sm:px-4 lg:px-6 py-4 sm:py-6 animate-page-enter">

      {/* Header */}
      <div className="mb-5">
        <span className="text-[10px] font-bold tracking-[0.15em] text-[#64748B] uppercase block mb-1">
          {lang === 'ka' ? 'პილოტის პროფილი' : 'Pilot Profile'}
        </span>
        <h1 className="text-xl sm:text-2xl font-bold text-white">
          {lang === 'ka' ? 'ჩემი ანგარიში' : 'My Account'}
        </h1>
      </div>

      <div className="grid lg:grid-cols-12 gap-3 sm:gap-4">

        {/* Left */}
        <div className="lg:col-span-4 space-y-3">

          {/* Avatar card */}
          <div className="card p-6 text-center">
            {/* Avatar with orbit ring */}
            <div className="relative inline-flex items-center justify-center mb-5" style={{ width: 96, height: 96 }}>
              <svg width="96" height="96" viewBox="0 0 96 96" className="absolute inset-0">
                <circle cx="48" cy="48" r="44" fill="none" stroke="rgba(99,102,241,0.2)" strokeWidth="1.5" strokeDasharray="5 4" />
              </svg>
              <svg width="96" height="96" viewBox="0 0 96 96" className="absolute inset-0 orbit-ring">
                <circle cx="48" cy="4" r="4" fill="#6366F1" />
              </svg>
              <div className="w-16 h-16 rounded-full relative z-10 flex items-center justify-center" style={{ background: 'linear-gradient(135deg, rgba(99,102,241,0.3), rgba(168,85,247,0.2))', border: '1px solid rgba(99,102,241,0.35)' }}>
                <Telescope size={26} className="text-[#818CF8]" />
              </div>
              <div className="absolute bottom-0 right-0 w-8 h-8 rounded-full bg-[#FFD166] border-2 border-[#0D1117] flex items-center justify-center z-20">
                <Crown size={14} className="text-[#0D1117]" />
              </div>
            </div>

            <h2 className="text-lg font-bold text-white mb-0.5">{mockProfile.display_name}</h2>
            <p className="text-[11px] font-bold tracking-[0.12em] text-[#6366F1] mb-1">
              LVL {mockProfile.level} · {lang === 'ka' ? mockProfile.title_ka : mockProfile.title_en}
            </p>
            <p className="text-[11px] text-[#475569] mb-5">@{mockProfile.username}</p>

            <div className="grid grid-cols-2 gap-2 mb-4">
              <div className="bg-white/[0.03] border border-white/[0.06] rounded-lg p-3 text-center">
                <div className="text-xs text-[#64748B] uppercase tracking-wide mb-1">{lang === 'ka' ? 'ქულა' : 'Total XP'}</div>
                <div className="text-xl font-bold text-white">{mockProfile.points}</div>
              </div>
              <div className="bg-white/[0.03] border border-white/[0.06] rounded-lg p-3 text-center">
                <div className="text-xs text-[#64748B] uppercase tracking-wide mb-1">{lang === 'ka' ? 'რეიტინგი' : 'Rank'}</div>
                <div className="text-xl font-bold text-white">#8</div>
              </div>
            </div>

            <div className="text-left">
              <div className="flex justify-between items-center mb-1.5">
                <span className="text-[10px] text-[#64748B] uppercase tracking-wider font-bold">{lang === 'ka' ? 'XP პროგრესი' : 'XP Progress'}</span>
                <span className="text-[10px] text-[#475569]">{mockProfile.points} / {levelProgress.needed}</span>
              </div>
              <div className="h-1 bg-white/[0.05] rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-700"
                  style={{ width: `${levelProgress.progress}%`, background: 'linear-gradient(90deg, #6366F1, #A855F7)' }}
                />
              </div>
              <p className="text-[10px] text-[#334155] mt-1.5">
                {levelProgress.needed - levelProgress.current} XP {lang === 'ka' ? `→ LVL ${mockProfile.level + 1}` : `to Level ${mockProfile.level + 1}`}
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
              { Icon: CheckCircle, val: mockProfile.missions_completed, label_en: 'Missions', label_ka: 'მისიები', color: '#6366F1', bg: 'rgba(99,102,241,0.08)', sub_en: '+2 this month', sub_ka: '+2 ამ თვეში' },
              { Icon: Flame,       val: 7, label_en: 'Day Streak', label_ka: 'სთრიქი',    color: '#F97316', bg: 'rgba(249,115,22,0.08)', sub_en: 'Best: 14 days', sub_ka: 'მაქს: 14 დღე' },
              { Icon: Award,       val: achievements.filter(a => a.earned).length, label_en: 'Badges', label_ka: 'ბეიჯები', color: '#A855F7', bg: 'rgba(168,85,247,0.08)', sub_en: `${achievements.filter(a=>!a.earned).length} to unlock`, sub_ka: `${achievements.filter(a=>!a.earned).length} ლოდინშია` },
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
              <button className="text-[11px] font-bold text-[#6366F1] hover:text-[#818CF8] transition-colors">
                {lang === 'ka' ? 'ყველა' : 'View all'}
              </button>
            </div>
            <div className="flex flex-wrap gap-5 sm:gap-8">
              {achievements.map(a => (
                <div
                  key={a.label}
                  className={`flex flex-col items-center gap-2 group ${!a.earned ? 'opacity-30 grayscale' : ''}`}
                >
                  <div className="w-12 h-12 rounded-xl bg-white/[0.04] border border-white/[0.08] flex items-center justify-center group-hover:border-[#6366F1]/40 transition-all cursor-pointer relative overflow-hidden">
                    <a.Icon size={20} className="text-[#6366F1] relative z-10" />
                    {a.earned && (
                      <div className="absolute inset-0 bg-[#6366F1]/10 opacity-0 group-hover:opacity-100 transition-opacity" />
                    )}
                  </div>
                  <span className="text-[9px] text-[#475569] font-bold uppercase tracking-wider text-center max-w-[56px] leading-tight">
                    {lang === 'ka' ? a.label : a.labelEn}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Recent activity */}
          <div className="card p-5">
            <span className="text-[10px] font-bold tracking-[0.15em] text-[#64748B] uppercase block mb-4">
              {lang === 'ka' ? 'ბოლო დაკვირვებები' : 'Recent Observations'}
            </span>
            <div className="space-y-4">
              {mockObservations.map((obs, idx) => (
                <div key={obs.id} className="flex gap-3 relative">
                  {idx < mockObservations.length - 1 && (
                    <div className="absolute left-4 top-9 bottom-[-16px] w-px bg-white/[0.06]" />
                  )}
                  <div
                    className="w-8 h-8 rounded-full border flex items-center justify-center flex-shrink-0 z-10"
                    style={{ background: `${STATUS_COLOR[obs.status]}15`, borderColor: `${STATUS_COLOR[obs.status]}30`, color: STATUS_COLOR[obs.status] }}
                  >
                    {obs.status === 'approved' ? <CheckCircle size={14} /> : <Clock size={14} />}
                  </div>
                  <div className="flex-1 pb-4">
                    <div className="flex items-center justify-between mb-0.5">
                      <h4 className="text-sm font-bold text-white">
                        {lang === 'ka' ? obs.object_name_ka : obs.object_name}
                      </h4>
                      <span className="text-[10px] text-[#475569]">
                        {new Date(obs.created_at).toLocaleDateString(lang === 'ka' ? 'ka-GE' : 'en-US')}
                      </span>
                    </div>
                    <p className="text-xs text-[#64748B]">
                      {obs.status === 'approved'
                        ? (lang === 'ka' ? `დამტკიცდა · +${obs.points_awarded} XP` : `Approved · +${obs.points_awarded} XP`)
                        : (lang === 'ka' ? 'განხილვის მოლოდინში' : 'Awaiting review')}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>

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
