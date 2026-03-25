'use client'
import { User, Star, Eye, Target, LogOut } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { getPointsToNextLevel } from '@/lib/constants'
import { useLanguage } from '@/contexts/LanguageContext'

const mockProfile = {
  username: 'stargazer_tbilisi',
  display_name: 'Stargazer',
  level: 3,
  points: 720,
  observations_count: 12,
  missions_completed: 5,
}

const mockObservations = [
  { id: '1', object_name: 'Moon',    object_name_ka: 'მთვარე',   status: 'approved', points_awarded: 50, created_at: new Date(Date.now() - 86400000 * 2).toISOString() },
  { id: '2', object_name: 'Jupiter', object_name_ka: 'იუპიტერი', status: 'pending',  points_awarded: 0,  created_at: new Date(Date.now() - 86400000).toISOString() },
]

const STATUS_COLOR: Record<string, string> = {
  approved: '#34d399',
  pending:  '#FFD166',
  rejected: '#f87171',
}

export default function ProfilePage() {
  const router = useRouter()
  const { t, lang } = useLanguage()
  const levelProgress = getPointsToNextLevel(mockProfile.points)

  return (
    <div className="max-w-2xl mx-auto px-4 py-6 animate-page-enter">
      {/* Avatar + name + level */}
      <div className="glass-card p-6 mb-4">
        <div className="flex items-start gap-4">
          <div className="w-14 h-14 rounded-full bg-[rgba(255,209,102,0.1)] border-2 border-[rgba(255,209,102,0.3)] flex items-center justify-center flex-shrink-0">
            <User size={24} className="text-[#FFD166]" />
          </div>
          <div className="flex-1">
            <p className="font-bold text-white text-lg">{mockProfile.display_name}</p>
            <p className="text-sm text-[var(--text-secondary)]">@{mockProfile.username}</p>
            <div className="flex items-center gap-3 mt-2">
              <span className="text-xs bg-[rgba(255,209,102,0.1)] border border-[rgba(255,209,102,0.2)] text-[#FFD166] px-2 py-0.5 rounded-lg font-medium">
                {t('profile.level')} {mockProfile.level}
              </span>
              <span className="text-xs text-[var(--text-dim)]">{mockProfile.points.toLocaleString()} {t('leaderboard.pts')}</span>
            </div>
          </div>
          <button
            onClick={() => router.push('/')}
            className="text-[var(--text-dim)] hover:text-red-400 transition-colors p-2"
            title={t('profile.signout')}
          >
            <LogOut size={18} />
          </button>
        </div>

        {/* Level progress bar */}
        <div className="mt-4">
          <div className="flex justify-between text-xs text-[var(--text-dim)] mb-1.5">
            <span>{t('profile.level')} {mockProfile.level}</span>
            <span>{levelProgress.current} / {levelProgress.needed} {t('profile.ptsToNext')} {mockProfile.level + 1}</span>
          </div>
          <div className="w-full h-2 rounded-full bg-[rgba(255,255,255,0.05)]">
            <div
              className="h-full rounded-full transition-all duration-700"
              style={{ width: `${levelProgress.progress}%`, background: 'linear-gradient(90deg, #FFD166, #38F0FF)' }}
            />
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3 mb-4">
        {[
          { icon: Star,   labelKey: 'profile.points',       value: mockProfile.points.toLocaleString(), color: '#FFD166' },
          { icon: Eye,    labelKey: 'profile.observations',  value: mockProfile.observations_count.toString(), color: '#38F0FF' },
          { icon: Target, labelKey: 'profile.missions',      value: mockProfile.missions_completed.toString(), color: '#34d399' },
        ].map(({ icon: Icon, labelKey, value, color }) => (
          <div key={labelKey} className="glass-card p-4 text-center">
            <Icon size={18} style={{ color }} className="mx-auto mb-2" />
            <p className="text-xl font-bold text-white">{value}</p>
            <p className="text-[10px] text-[var(--text-dim)] uppercase tracking-wide mt-0.5">{t(labelKey)}</p>
          </div>
        ))}
      </div>

      {/* Recent observations */}
      <div className="glass-card p-4">
        <p className="text-xs text-[var(--text-secondary)] uppercase tracking-widest mb-3 font-medium">
          {t('profile.recentObs')}
        </p>
        {mockObservations.length === 0 ? (
          <p className="text-sm text-[var(--text-secondary)]">{t('profile.noObs')}</p>
        ) : (
          <div className="flex flex-col gap-2">
            {mockObservations.map(obs => (
              <div key={obs.id} className="flex items-center gap-3 py-2 border-b border-[var(--border-glass)] last:border-0">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-white">
                    {lang === 'ka' ? obs.object_name_ka : obs.object_name}
                  </p>
                  <p className="text-xs text-[var(--text-dim)]">
                    {new Date(obs.created_at).toLocaleDateString(lang === 'ka' ? 'ka-GE' : 'en-US')}
                  </p>
                </div>
                <div className="flex flex-col items-end gap-1">
                  <span
                    className="text-[10px] font-medium px-2 py-0.5 rounded-full"
                    style={{ color: STATUS_COLOR[obs.status], background: STATUS_COLOR[obs.status] + '15' }}
                  >
                    {t(`profile.${obs.status}`)}
                  </span>
                  {obs.status === 'approved' && obs.points_awarded > 0 && (
                    <span className="text-[10px] text-[#FFD166]">+{obs.points_awarded} {t('leaderboard.pts')}</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
