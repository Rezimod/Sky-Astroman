import Link from 'next/link'
import AstroLogo from '@/components/shared/AstroLogo'
import { Telescope, Camera, CheckCircle, Star, Cloud, Trophy } from 'lucide-react'

const features = [
  { icon: Telescope, title: 'Log Observations', desc: 'Photograph celestial objects and submit for verification' },
  { icon: CheckCircle, title: 'Admin Verified', desc: 'Admins confirm your sighting and award points' },
  { icon: Star, title: 'Earn & Rank', desc: 'Climb the leaderboard, complete missions, unlock badges' },
  { icon: Cloud, title: 'Sky Conditions', desc: 'Real-time Tbilisi sky data — cloud cover, moon phase, best viewing window' },
  { icon: Trophy, title: 'Compete', desc: 'Weekly and monthly leaderboards for Georgian astronomers' },
  { icon: Camera, title: 'Gallery', desc: 'Build your personal observation archive' },
]

const missions = [
  { emoji: '🌕', name: 'The Moon', pts: 50, diff: 'Beginner' },
  { emoji: '🪐', name: 'Jupiter', pts: 75, diff: 'Beginner' },
  { emoji: '✨', name: 'Orion Nebula', pts: 100, diff: 'Intermediate' },
  { emoji: '🪐', name: 'Saturn', pts: 100, diff: 'Intermediate' },
  { emoji: '💫', name: 'Pleiades', pts: 60, diff: 'Beginner' },
  { emoji: '🌌', name: 'Andromeda Galaxy', pts: 175, diff: 'Hard' },
]

export default function LandingPage() {
  return (
    <div className="max-w-3xl mx-auto px-4 py-10 sm:py-20 flex flex-col items-center gap-16 animate-page-enter">

      {/* Hero */}
      <section className="text-center flex flex-col items-center gap-6">
        <AstroLogo heightClass="h-12" />
        <p className="text-[#FFD166] text-xs tracking-widest uppercase font-mono">✦ SKY ASTROMAN ✦</p>
        <h1 className="text-4xl sm:text-5xl md:text-6xl font-bold leading-tight">
          <span className="text-[#FFD166]">Observe.</span>{' '}
          <span className="text-white">Verify.</span>{' '}
          <span className="text-[#38F0FF]">Rank.</span>
        </h1>
        <p className="text-[var(--text-secondary)] max-w-md text-base leading-relaxed">
          The free social platform for stargazers. Log your observations, earn points, and compete with astronomers across Georgia.
        </p>
        <div className="flex flex-col sm:flex-row items-center gap-3">
          <Link
            href="/login"
            className="px-10 py-4 rounded-xl font-bold text-base tracking-wide btn-primary"
          >
            Start Observing →
          </Link>
          <Link
            href="/leaderboard"
            className="px-8 py-4 rounded-xl font-medium text-sm btn-ghost"
          >
            View Leaderboard
          </Link>
        </div>
        <div className="flex items-center gap-6 text-xs text-[var(--text-dim)] flex-wrap justify-center">
          <span className="flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-[#34d399]" />
            Free forever
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-[#FFD166]" />
            Tbilisi, Georgia
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-[#38F0FF]" />
            No crypto, no payments
          </span>
        </div>
      </section>

      <div className="ornament-line w-full" />

      {/* Mission preview */}
      <section className="w-full">
        <h2 className="text-xl font-bold text-center mb-6 text-[var(--text-primary)]">Available Missions</h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {missions.map(m => (
            <div key={m.name} className="glass-card p-4 flex flex-col items-center text-center gap-2">
              <span className="text-3xl">{m.emoji}</span>
              <p className="text-sm font-semibold text-white">{m.name}</p>
              <p className="text-[#FFD166] text-xs font-bold">+{m.pts} pts</p>
              <span className="text-[10px] text-[var(--text-dim)] uppercase tracking-wide">{m.diff}</span>
            </div>
          ))}
        </div>
      </section>

      <div className="ornament-line w-full" />

      {/* Features */}
      <section className="w-full">
        <h2 className="text-xl font-bold text-center mb-6 text-[var(--text-primary)]">How It Works</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {features.map(({ icon: Icon, title, desc }) => (
            <div key={title} className="glass-card p-5 flex flex-col gap-3">
              <div className="w-9 h-9 rounded-xl bg-[rgba(255,209,102,0.1)] border border-[rgba(255,209,102,0.15)] flex items-center justify-center">
                <Icon size={18} className="text-[#FFD166]" />
              </div>
              <p className="font-semibold text-sm text-white">{title}</p>
              <p className="text-xs text-[var(--text-secondary)] leading-relaxed">{desc}</p>
            </div>
          ))}
        </div>
      </section>

      <div className="ornament-line w-full" />

      {/* CTA */}
      <section className="text-center flex flex-col items-center gap-4">
        <p className="text-[var(--text-secondary)] text-sm">Ready to explore the Georgian sky?</p>
        <Link
          href="/login"
          className="px-12 py-4 rounded-xl font-bold text-base btn-primary animate-pulse-glow"
        >
          Join Sky Astroman →
        </Link>
      </section>

    </div>
  )
}
