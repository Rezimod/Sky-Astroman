import Navigation from '@/components/layout/Navigation'
import LevelIndicator from '@/components/ui/LevelIndicator'

export default function LeaderboardPage() {
  return (
    <div className="min-h-screen bg-[var(--bg-void)]">
      <div className="max-w-2xl mx-auto px-4 py-6 pb-24 sm:pb-6">
        <header className="mb-6">
          <h1 className="text-2xl font-bold text-[var(--text-primary)]">Leaderboard</h1>
          <p className="text-sm text-[var(--text-secondary)]">Top stargazers by points</p>
        </header>
        <Navigation />
        <div className="glass-card p-4">
          <p className="text-sm text-[var(--text-secondary)] text-center py-8">
            Connect Supabase to load real leaderboard data.
          </p>
        </div>
      </div>
    </div>
  )
}
