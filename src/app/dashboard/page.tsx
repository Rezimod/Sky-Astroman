'use client'
import DashboardGrid from '@/components/layout/DashboardGrid'
import TonightsSkyCard from '@/components/cards/TonightsSkyCard'
import ActiveMissionsCard from '@/components/cards/ActiveMissionsCard'
import TonightsChallengeCard from '@/components/cards/TonightsChallengeCard'
import RecommendedObjectCard from '@/components/cards/RecommendedObjectCard'
import LeaderboardSnapshotCard from '@/components/cards/LeaderboardSnapshotCard'
import UserStatsCard from '@/components/cards/UserStatsCard'
import type { Profile, Mission, MissionProgress, SkyConditions } from '@/lib/types'

const mockProfile: Profile = {
  id: 'mock-user', username: 'stargazer', display_name: 'Stargazer',
  avatar_url: null, level: 3, points: 720, observations_count: 12,
  missions_completed: 5, team_id: null, location_lat: 41.7151,
  location_lng: 44.8271, created_at: new Date().toISOString(),
}

const mockMissions: Mission[] = [
  { id: 'moon', title: 'Observe the Moon', description: 'Identify 3 craters', object_name: 'Moon', reward_points: 50, difficulty: 'easy', is_daily: false, active: true, created_at: new Date().toISOString() },
  { id: 'jupiter', title: 'Find Jupiter', description: 'Observe Galilean moons', object_name: 'Jupiter', reward_points: 100, difficulty: 'medium', is_daily: false, active: true, created_at: new Date().toISOString() },
  { id: 'pleiades', title: 'Photograph the Pleiades', description: 'Capture M45', object_name: 'Pleiades', reward_points: 200, difficulty: 'hard', is_daily: false, active: true, created_at: new Date().toISOString() },
]

const mockProgress: MissionProgress[] = [
  { id: 'p1', user_id: 'mock-user', mission_id: 'moon', status: 'completed', completed_at: new Date().toISOString() },
]

const mockSkyConditions: SkyConditions = {
  cloudCover: 25, visibility: 15, temperature: 18,
  moonPhase: 0.3, moonIllumination: 0.59,
  sunrise: '06:48', sunset: '19:52',
  bestViewingStart: '22:00', bestViewingEnd: '02:00',
}

export default function DashboardPage() {
  return (
    <div className="max-w-5xl mx-auto px-4 py-6 animate-page-enter">
      <header className="mb-6">
        <h1 className="text-2xl font-bold text-white">Tonight&apos;s Sky</h1>
        <p className="text-sm text-[var(--text-secondary)]">Tbilisi, Georgia · {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}</p>
      </header>
      <DashboardGrid>
        <UserStatsCard profile={mockProfile} />
        <TonightsSkyCard conditions={mockSkyConditions} />
        <ActiveMissionsCard missions={mockMissions} progress={mockProgress} />
        <TonightsChallengeCard challenge={{
          title: 'Photograph the Moon tonight',
          description: 'Capture a clear shot of the lunar surface and identify at least 2 craters.',
          reward_points: 200,
          completed: false,
        }} />
        <RecommendedObjectCard object={{
          name: 'Jupiter',
          type: 'Planet',
          bestTime: '22:00–01:00',
          difficulty: 'easy',
          constellation: 'Taurus',
          guide: {
            howToFind: 'Look for the brightest non-twinkling point in the eastern sky after 10pm.',
            equipment: 'Any telescope 60mm+. Even binoculars show the Galilean moons.',
            tips: 'Use 100–200x magnification to see cloud bands clearly.',
          },
        }} />
        <LeaderboardSnapshotCard users={[mockProfile]} currentUserId={mockProfile.id} />
      </DashboardGrid>
    </div>
  )
}
