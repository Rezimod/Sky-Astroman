import Navigation from '@/components/layout/Navigation'
import DashboardGrid from '@/components/layout/DashboardGrid'
import TonightsSkyCard from '@/components/cards/TonightsSkyCard'
import ActiveMissionsCard from '@/components/cards/ActiveMissionsCard'
import TonightsChallengeCard from '@/components/cards/TonightsChallengeCard'
import RecommendedObjectCard from '@/components/cards/RecommendedObjectCard'
import LeaderboardSnapshotCard from '@/components/cards/LeaderboardSnapshotCard'
import UserStatsCard from '@/components/cards/UserStatsCard'
import type { Profile, Mission, MissionProgress, SkyConditions } from '@/lib/types'

// Mock data until Supabase is connected
const mockProfile: Profile = {
  id: 'mock-user',
  username: 'stargazer',
  display_name: 'Stargazer',
  avatar_url: null,
  level: 3,
  points: 720,
  observations_count: 12,
  missions_completed: 5,
  team_id: null,
  location_lat: 41.7151,
  location_lng: 44.8271,
  created_at: new Date().toISOString(),
}

const mockMissions: Mission[] = [
  { id: '1', title: 'Observe the Moon', description: null, object_name: 'Moon', reward_points: 50, difficulty: 'easy', is_daily: false, active: true, created_at: new Date().toISOString() },
  { id: '2', title: 'Find Jupiter', description: null, object_name: 'Jupiter', reward_points: 100, difficulty: 'medium', is_daily: false, active: true, created_at: new Date().toISOString() },
  { id: '3', title: 'Photograph the Pleiades', description: null, object_name: 'Pleiades', reward_points: 200, difficulty: 'hard', is_daily: false, active: true, created_at: new Date().toISOString() },
]

const mockProgress: MissionProgress[] = [
  { id: 'p1', user_id: 'mock-user', mission_id: '1', status: 'completed', completed_at: new Date().toISOString() },
]

const mockSkyConditions: SkyConditions = {
  cloudCover: 25,
  visibility: 15,
  temperature: 18,
  moonPhase: 0.3,
  moonIllumination: 0.55,
  sunrise: '06:28',
  sunset: '20:12',
  bestViewingStart: '22:00',
  bestViewingEnd: '02:00',
}

const mockLeaderboard: Profile[] = [
  { ...mockProfile, id: 'u1', username: 'astroKing', display_name: 'Astro King', points: 4200, level: 7 },
  { ...mockProfile, id: 'u2', username: 'nightsky', display_name: 'Night Sky', points: 3100, level: 6 },
  { ...mockProfile, id: 'u3', username: 'lunarObserver', display_name: 'Lunar Observer', points: 2400, level: 5 },
  { ...mockProfile, id: 'u4', username: 'deepField', display_name: 'Deep Field', points: 1800, level: 4 },
  { ...mockProfile, id: 'mock-user', username: 'stargazer', display_name: 'Stargazer', points: 720, level: 3 },
]

const mockChallenge = {
  title: 'Photograph the Moon tonight',
  description: 'Capture the Waxing Gibbous moon with any camera or telescope.',
  reward_points: 200,
  completed: false,
}

const mockRecommended = {
  name: 'Orion Nebula (M42)',
  type: 'Nebula',
  bestTime: '21:30 – 23:00',
  difficulty: 'easy' as const,
  constellation: 'Orion',
  guide: {
    howToFind: 'Look for the three stars of Orion\'s Belt, then find the "sword" hanging below. M42 is the fuzzy middle object.',
    equipment: 'Visible with naked eye, binoculars or any telescope will reveal more detail.',
    tips: 'Best viewed during winter months. Avoid nights with high moon illumination.',
  },
}

export default function DashboardPage() {
  return (
    <div className="min-h-screen bg-[var(--bg-void)]">
      <div className="max-w-5xl mx-auto px-4 py-6 pb-24 sm:pb-6">
        <header className="mb-6">
          <h1 className="text-2xl font-bold text-[var(--text-primary)]">Sky Astroman</h1>
          <p className="text-sm text-[var(--text-secondary)]">Tbilisi, Georgia · {new Date().toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' })}</p>
        </header>

        <Navigation />

        <DashboardGrid>
          <UserStatsCard profile={mockProfile} rank={5} />
          <TonightsSkyCard conditions={mockSkyConditions} />
          <ActiveMissionsCard missions={mockMissions} progress={mockProgress} />
          <TonightsChallengeCard challenge={mockChallenge} />
          <RecommendedObjectCard object={mockRecommended} />
          <LeaderboardSnapshotCard users={mockLeaderboard} currentUserId="mock-user" />
        </DashboardGrid>
      </div>
    </div>
  )
}
