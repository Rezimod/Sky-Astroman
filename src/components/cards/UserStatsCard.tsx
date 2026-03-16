import CardWrapper from '@/components/layout/CardWrapper'
import ProgressBar from '@/components/ui/ProgressBar'
import LevelIndicator from '@/components/ui/LevelIndicator'
import { getPointsToNextLevel } from '@/lib/constants'
import type { Profile } from '@/lib/types'

interface UserStatsCardProps {
  profile: Profile
  rank?: number
}

export default function UserStatsCard({ profile, rank }: UserStatsCardProps) {
  const { current, needed, progress } = getPointsToNextLevel(profile.points)

  return (
    <CardWrapper glow="gold" className="col-span-1 sm:col-span-2">
      <div className="flex items-start gap-4">
        <LevelIndicator level={profile.level} size="lg" />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-0.5">
            <h2 className="text-lg font-bold text-[var(--text-primary)] truncate">
              {profile.display_name ?? profile.username}
            </h2>
            {rank && (
              <span className="text-xs text-[var(--text-secondary)] shrink-0">#{rank}</span>
            )}
          </div>
          <p className="text-xs text-[var(--text-secondary)] mb-3">@{profile.username}</p>

          <div className="grid grid-cols-3 gap-3 mb-4">
            <Stat label="Points" value={profile.points.toLocaleString()} />
            <Stat label="Observations" value={profile.observations_count.toString()} />
            <Stat label="Missions" value={profile.missions_completed.toString()} />
          </div>

          <div>
            <div className="flex justify-between text-xs text-[var(--text-secondary)] mb-1.5">
              <span>Level {profile.level}</span>
              <span>{current} / {needed} pts to Level {profile.level + 1}</span>
            </div>
            <ProgressBar value={progress} color="gold" />
          </div>
        </div>
      </div>
    </CardWrapper>
  )
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-base font-bold text-[var(--accent-gold)]">{value}</div>
      <div className="text-xs text-[var(--text-secondary)]">{label}</div>
    </div>
  )
}
