'use client'
import { useState } from 'react'
import { Trophy, Eye } from 'lucide-react'
import { useLanguage } from '@/contexts/LanguageContext'

type Period = 'all' | 'month' | 'week'

const mockUsers = [
  { id: '1', username: 'tbilisi_observer', display_name: 'Tbilisi Observer', level: 8, points: 2840, observations_count: 34 },
  { id: '2', username: 'night_sky_ge',     display_name: 'Night Sky GE',     level: 7, points: 2210, observations_count: 28 },
  { id: '3', username: 'stargazer_tbilisi',display_name: 'Stargazer',        level: 3, points: 720,  observations_count: 12 },
  { id: '4', username: 'cosmos_nika',      display_name: 'Cosmos Nika',      level: 5, points: 1150, observations_count: 19 },
  { id: '5', username: 'moon_watcher',     display_name: 'Moon Watcher',     level: 4, points: 890,  observations_count: 15 },
  { id: '6', username: 'deep_sky_tbilisi', display_name: 'Deep Sky',         level: 6, points: 1680, observations_count: 24 },
  { id: '7', username: 'stellar_giorgi',   display_name: 'Stellar Giorgi',   level: 2, points: 310,  observations_count: 6  },
  { id: '8', username: 'orion_hunter',     display_name: 'Orion Hunter',     level: 3, points: 560,  observations_count: 10 },
].sort((a, b) => b.points - a.points)

const medalEmojis = ['🥇', '🥈', '🥉']
const CURRENT_USER_ID = '3'

export default function LeaderboardPage() {
  const { t } = useLanguage()
  const [period, setPeriod] = useState<Period>('all')

  const periodTabs: { key: Period; labelKey: string }[] = [
    { key: 'all',   labelKey: 'leaderboard.allTime'   },
    { key: 'month', labelKey: 'leaderboard.thisMonth' },
    { key: 'week',  labelKey: 'leaderboard.thisWeek'  },
  ]

  return (
    <div className="max-w-2xl mx-auto px-4 py-6 animate-page-enter">
      <header className="mb-5">
        <div className="flex items-center gap-2 mb-1">
          <Trophy size={20} className="text-[#FFD166]" />
          <h1 className="text-2xl font-bold text-white">{t('leaderboard.title')}</h1>
        </div>
        <p className="text-sm text-[var(--text-secondary)]">{t('leaderboard.subtitle')}</p>
      </header>

      <div className="flex gap-1 p-1 glass-card mb-5">
        {periodTabs.map(tab => (
          <button
            key={tab.key}
            onClick={() => setPeriod(tab.key)}
            className={`flex-1 py-2 px-3 rounded-xl text-sm font-medium transition-all ${
              period === tab.key
                ? 'bg-[rgba(255,209,102,0.15)] text-[#FFD166]'
                : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
            }`}
          >
            {t(tab.labelKey)}
          </button>
        ))}
      </div>

      <div className="flex flex-col gap-2">
        {mockUsers.map((user, idx) => {
          const isCurrentUser = user.id === CURRENT_USER_ID
          const rank = idx + 1
          return (
            <div
              key={user.id}
              className={`glass-card px-4 py-3 flex items-center gap-4 transition-all ${
                isCurrentUser ? 'border-[rgba(255,209,102,0.3)] glow-gold' : ''
              }`}
            >
              <div className="w-8 text-center flex-shrink-0">
                {rank <= 3
                  ? <span className="text-xl">{medalEmojis[rank - 1]}</span>
                  : <span className="text-sm font-bold text-[var(--text-secondary)]">#{rank}</span>
                }
              </div>

              <div className="w-9 h-9 rounded-full bg-[rgba(255,209,102,0.1)] border border-[rgba(255,209,102,0.2)] flex items-center justify-center flex-shrink-0">
                <span className="text-[#FFD166] text-sm font-bold">{user.username[0].toUpperCase()}</span>
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className={`font-semibold text-sm truncate ${isCurrentUser ? 'text-[#FFD166]' : 'text-white'}`}>
                    {user.display_name}
                  </p>
                  {isCurrentUser && (
                    <span className="text-[10px] text-[#FFD166] bg-[rgba(255,209,102,0.1)] px-1.5 py-0.5 rounded font-medium flex-shrink-0">
                      {t('leaderboard.you')}
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-3 mt-0.5">
                  <span className="text-[11px] text-[var(--text-dim)]">Lv.{user.level}</span>
                  <span className="text-[11px] text-[var(--text-dim)]">
                    <Eye size={10} className="inline mr-1" />{user.observations_count}
                  </span>
                </div>
              </div>

              <div className="text-right flex-shrink-0">
                <p className={`font-bold text-sm ${rank === 1 ? 'text-[#FFD166]' : 'text-white'}`}>
                  {user.points.toLocaleString()}
                </p>
                <p className="text-[10px] text-[var(--text-dim)]">{t('leaderboard.pts')}</p>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
