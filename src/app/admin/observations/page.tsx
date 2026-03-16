import Navigation from '@/components/layout/Navigation'

export default function AdminObservationsPage() {
  return (
    <div className="min-h-screen bg-[var(--bg-void)]">
      <div className="max-w-4xl mx-auto px-4 py-6 pb-24 sm:pb-6">
        <header className="mb-6">
          <h1 className="text-2xl font-bold text-[var(--text-primary)]">Admin — Pending Observations</h1>
          <p className="text-sm text-[var(--text-secondary)]">Review and approve user submissions</p>
        </header>
        <Navigation />
        <div className="glass-card p-4">
          <p className="text-sm text-[var(--text-secondary)] text-center py-8">
            Supabase required. Connect your database to review pending observations.
          </p>
        </div>
      </div>
    </div>
  )
}
