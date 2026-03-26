'use client'
import { useRouter } from 'next/navigation'
import { getPointsToNextLevel } from '@/lib/constants'
import { useLanguage } from '@/contexts/LanguageContext'

const mockProfile = {
  username: 'stargazer_tbilisi',
  display_name: 'გიორგი მაისურაძე',
  title: 'ვარსკვლავთმრიცხველი',
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
  { emoji: '🔭', label: 'დამკვირვებელი', labelEn: 'Observer',    earned: true  },
  { emoji: '📸', label: 'ფოტოგრაფი',     labelEn: 'Photographer', earned: true  },
  { emoji: '🌌', label: 'ნებულა',         labelEn: 'Nebula',       earned: true  },
  { emoji: '☄️', label: 'კომეტა',         labelEn: 'Comet',        earned: false },
  { emoji: '🛰️', label: 'სატელიტი',      labelEn: 'Satellite',    earned: false },
]

export default function ProfilePage() {
  const router = useRouter()
  const { t, lang } = useLanguage()
  const levelProgress = getPointsToNextLevel(mockProfile.points)

  return (
    <div className="max-w-7xl mx-auto px-6 py-12 animate-page-enter">
      <div className="grid lg:grid-cols-12 gap-8">

        {/* Left column */}
        <div className="lg:col-span-4 space-y-6">

          {/* Avatar card */}
          <div className="bg-space-800/40 backdrop-blur-xl border border-white/10 rounded-[2rem] p-8 text-center">
            <div className="relative inline-block mb-6">
              <div className="w-32 h-32 rounded-full border-4 border-space-accent p-1">
                <div className="w-full h-full rounded-full bg-gradient-to-br from-space-accent to-space-glow flex items-center justify-center text-white text-3xl font-bold">
                  {mockProfile.display_name.charAt(0)}
                </div>
              </div>
              <div className="absolute -bottom-2 -right-2 bg-yellow-400 text-space-900 w-10 h-10 rounded-full flex items-center justify-center border-4 border-space-800 shadow-lg text-lg">
                👑
              </div>
            </div>
            <h2 className="text-2xl font-bold text-white mb-1">{mockProfile.display_name}</h2>
            <p className="text-space-accent font-medium mb-6">{mockProfile.title} (LVL {mockProfile.level})</p>

            <div className="space-y-4">
              <div className="bg-white/5 rounded-2xl p-4 border border-white/5 flex justify-between items-center">
                <div className="text-left">
                  <span className="text-xs text-slate-400 block">{lang === 'ka' ? 'ჯამური XP' : 'Total XP'}</span>
                  <span className="text-xl font-bold text-white">{mockProfile.points.toLocaleString()}</span>
                </div>
                <div className="text-right">
                  <span className="text-xs text-slate-400 block">{lang === 'ka' ? 'რეიტინგი' : 'Rank'}</span>
                  <span className="text-xl font-bold text-white">#8</span>
                </div>
              </div>
              <div className="w-full bg-white/5 h-2 rounded-full overflow-hidden">
                <div
                  className="bg-gradient-to-r from-space-accent to-space-glow h-full transition-all duration-700"
                  style={{ width: `${levelProgress.progress}%` }}
                />
              </div>
              <p className="text-[10px] text-slate-500 text-center uppercase tracking-widest">
                {lang === 'ka'
                  ? `შემდეგ დონემდე დარჩა ${levelProgress.needed - levelProgress.current} XP`
                  : `${levelProgress.needed - levelProgress.current} XP to next level`}
              </p>
            </div>
          </div>

          {/* Location card */}
          <div className="bg-space-800/40 backdrop-blur-xl border border-white/10 rounded-[2rem] p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-white flex items-center gap-2">
                <span className="text-space-accent">📍</span>
                {lang === 'ka' ? 'ჩემი ლოკაცია' : 'My location'}
              </h3>
              <span className="text-[10px] bg-green-500/10 text-green-400 border border-green-500/20 px-2 py-0.5 rounded uppercase font-bold">
                {lang === 'ka' ? 'ლაივი' : 'Live'}
              </span>
            </div>
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm text-slate-400">{lang === 'ka' ? 'თბილისი, საქართველო' : 'Tbilisi, Georgia'}</span>
              <span className="text-sm font-bold text-white">
                {new Date().toLocaleTimeString(lang === 'ka' ? 'ka-GE' : 'en-US', { hour: '2-digit', minute: '2-digit' })}
              </span>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-white/5 p-3 rounded-xl border border-white/5">
                <div className="text-blue-400 mb-1">💨</div>
                <div className="text-xs text-slate-500">{lang === 'ka' ? 'ქარი' : 'Wind'}</div>
                <div className="text-sm font-bold text-white">4 {lang === 'ka' ? 'კმ/სთ' : 'km/h'}</div>
              </div>
              <div className="bg-white/5 p-3 rounded-xl border border-white/5">
                <div className="text-orange-400 mb-1">🌡️</div>
                <div className="text-xs text-slate-500">{lang === 'ka' ? 'ტემპ.' : 'Temp.'}</div>
                <div className="text-sm font-bold text-white">12°C</div>
              </div>
            </div>
          </div>
        </div>

        {/* Right column */}
        <div className="lg:col-span-8 space-y-6">

          {/* Stats row */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-white/5 border border-white/10 rounded-3xl p-6 hover:bg-white/10 transition-colors">
              <div className="flex items-center gap-4 mb-4">
                <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 flex items-center justify-center text-indigo-400 text-2xl">✅</div>
                <div>
                  <span className="text-xs text-slate-400 uppercase tracking-wider">{t('profile.missions')}</span>
                  <h4 className="text-2xl font-bold text-white">{mockProfile.missions_completed}</h4>
                </div>
              </div>
              <div className="text-xs text-green-400 font-medium">+2 {lang === 'ka' ? 'ამ თვეში' : 'this month'}</div>
            </div>
            <div className="bg-white/5 border border-white/10 rounded-3xl p-6 hover:bg-white/10 transition-colors">
              <div className="flex items-center gap-4 mb-4">
                <div className="w-12 h-12 rounded-2xl bg-orange-500/10 flex items-center justify-center text-orange-400 text-2xl">🔥</div>
                <div>
                  <span className="text-xs text-slate-400 uppercase tracking-wider">{lang === 'ka' ? 'სთრიქი' : 'Streak'}</span>
                  <h4 className="text-2xl font-bold text-white">7 {lang === 'ka' ? 'დღე' : 'days'}</h4>
                </div>
              </div>
              <div className="text-xs text-slate-500">{lang === 'ka' ? 'საუკეთესო: 14 დღე' : 'Best: 14 days'}</div>
            </div>
            <div className="bg-white/5 border border-white/10 rounded-3xl p-6 hover:bg-white/10 transition-colors">
              <div className="flex items-center gap-4 mb-4">
                <div className="w-12 h-12 rounded-2xl bg-purple-500/10 flex items-center justify-center text-purple-400 text-2xl">🏅</div>
                <div>
                  <span className="text-xs text-slate-400 uppercase tracking-wider">{lang === 'ka' ? 'ბეიჯები' : 'Badges'}</span>
                  <h4 className="text-2xl font-bold text-white">{achievements.filter(a => a.earned).length}</h4>
                </div>
              </div>
              <div className="text-xs text-slate-500">{achievements.filter(a => !a.earned).length} {lang === 'ka' ? 'მიღწევა ლოდინშია' : 'more to unlock'}</div>
            </div>
          </div>

          {/* Achievements */}
          <div className="bg-space-800/40 backdrop-blur-xl border border-white/10 rounded-[2rem] p-8">
            <div className="flex items-center justify-between mb-8">
              <h3 className="text-xl font-bold text-white">{lang === 'ka' ? 'მიღწევები' : 'Achievements'}</h3>
              <button className="text-sm font-medium text-space-accent hover:underline">
                {lang === 'ka' ? 'ყველას ნახვა' : 'View all'}
              </button>
            </div>
            <div className="flex flex-wrap gap-8">
              {achievements.map(a => (
                <div key={a.label} className={`flex flex-col items-center gap-3 group ${!a.earned ? 'opacity-40 grayscale' : ''}`}>
                  <div className="w-16 h-16 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-3xl group-hover:scale-110 transition-transform cursor-pointer relative">
                    {a.emoji}
                    {a.earned && (
                      <div className="absolute inset-0 bg-space-accent/20 rounded-full blur-lg opacity-0 group-hover:opacity-100 transition-opacity" />
                    )}
                  </div>
                  <span className="text-[10px] text-slate-400 font-bold uppercase tracking-widest text-center">
                    {lang === 'ka' ? a.label : a.labelEn}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Recent activity */}
          <div className="bg-space-800/40 backdrop-blur-xl border border-white/10 rounded-[2rem] p-8">
            <h3 className="text-xl font-bold text-white mb-8">{t('profile.recentObs')}</h3>
            <div className="space-y-6">
              {mockObservations.map((obs, idx) => (
                <div key={obs.id} className="flex gap-4 relative">
                  {idx < mockObservations.length - 1 && (
                    <div className="absolute left-5 top-10 bottom-[-24px] w-px bg-white/10" />
                  )}
                  <div
                    className="w-10 h-10 rounded-full border flex items-center justify-center shrink-0 z-10 text-sm"
                    style={{
                      background: `${STATUS_COLOR[obs.status]}20`,
                      borderColor: `${STATUS_COLOR[obs.status]}40`,
                      color: STATUS_COLOR[obs.status],
                    }}
                  >
                    {obs.status === 'approved' ? '✓' : '⏳'}
                  </div>
                  <div className="flex-1 pb-6">
                    <div className="flex items-center justify-between mb-1">
                      <h4 className="font-bold text-white">
                        {lang === 'ka' ? obs.object_name_ka : obs.object_name}
                      </h4>
                      <span className="text-xs text-slate-500">
                        {new Date(obs.created_at).toLocaleDateString(lang === 'ka' ? 'ka-GE' : 'en-US')}
                      </span>
                    </div>
                    <p className="text-sm text-slate-400">
                      {obs.status === 'approved'
                        ? (lang === 'ka' ? `მიღებულია +${obs.points_awarded} XP` : `Approved — +${obs.points_awarded} XP`)
                        : (lang === 'ka' ? 'მიმოხილვის მოლოდინში' : 'Awaiting review')}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Sign out */}
          <div className="text-center">
            <button
              onClick={() => router.push('/')}
              className="text-sm text-slate-500 hover:text-red-400 transition-colors"
            >
              {t('profile.signout')}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
