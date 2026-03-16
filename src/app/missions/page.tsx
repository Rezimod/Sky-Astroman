import Navigation from '@/components/layout/Navigation'
import Badge from '@/components/ui/Badge'

export default function MissionsPage() {
  return (
    <div className="min-h-screen bg-[var(--bg-void)]">
      <div className="max-w-2xl mx-auto px-4 py-6 pb-24 sm:pb-6">
        <header className="mb-6">
          <h1 className="text-2xl font-bold text-[var(--text-primary)]">Missions</h1>
          <p className="text-sm text-[var(--text-secondary)]">Complete missions to earn points</p>
        </header>
        <Navigation />
        <div className="glass-card p-4">
          <p className="text-sm text-[var(--text-secondary)] text-center py-8">
            Connect Supabase to load missions.
          </p>
        </div>
      </div>
    </div>
  )
}
