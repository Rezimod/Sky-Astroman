'use client'
import Link from 'next/link'
import CardWrapper from '@/components/layout/CardWrapper'
import LevelIndicator from '@/components/ui/LevelIndicator'
import { useLanguage } from '@/contexts/LanguageContext'
import type { Profile } from '@/lib/types'

interface LeaderboardSnapshotCardProps {
  users: Profile[]
  currentUserId?: string
}

export default function LeaderboardSnapshotCard({ users, currentUserId }: LeaderboardSnapshotCardProps) {
  const { t } = useLanguage()

  return (
    <CardWrapper>
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wider">
          {t('leaderboard.title')}
        </h3>
        <Link
          href="/leaderboard"
          className="text-xs text-[var(--accent-cyan)] hover:text-[var(--accent-gold)] transition-colors"
        >
          {t('dashboard.viewAll')}
        </Link>
      </div>
      <div className="space-y-2.5">
        {users.slice(0, 5).map((user, i) => (
          <div
            key={user.id}
            className={`flex items-center gap-3 ${user.id === currentUserId ? 'opacity-100' : 'opacity-90'}`}
          >
            <span className="text-xs font-mono text-[var(--text-dim)] w-4 text-center">{i + 1}</span>
            <LevelIndicator level={user.level} size="sm" />
            <div className="flex-1 min-w-0">
              <p className={`text-sm font-medium truncate ${user.id === currentUserId ? 'text-[var(--accent-gold)]' : 'text-[var(--text-primary)]'}`}>
                {user.display_name ?? user.username}
              </p>
            </div>
            <span className="text-sm font-bold text-[var(--accent-gold)] shrink-0">
              {user.points.toLocaleString()}
            </span>
          </div>
        ))}
      </div>
    </CardWrapper>
  )
}
