'use client'
import { useEffect, useState } from 'react'
import DashboardGrid from '@/components/layout/DashboardGrid'
import TonightsSkyCard from '@/components/cards/TonightsSkyCard'
import ActiveMissionsCard from '@/components/cards/ActiveMissionsCard'
import TonightsChallengeCard from '@/components/cards/TonightsChallengeCard'
import RecommendedObjectCard from '@/components/cards/RecommendedObjectCard'
import LeaderboardSnapshotCard from '@/components/cards/LeaderboardSnapshotCard'
import UserStatsCard from '@/components/cards/UserStatsCard'
import { useLanguage } from '@/contexts/LanguageContext'
import type { Profile, Mission, MissionProgress, SkyConditions, GeneratedMission } from '@/lib/types'

const mockProfile: Profile = {
  id: 'demo', username: 'stargazer_tbilisi', display_name: 'Stargazer',
  avatar_url: null, level: 3, points: 720, observations_count: 12,
  missions_completed: 5, team_id: null, location_lat: 41.7151,
  location_lng: 44.8271, created_at: new Date().toISOString(),
}

// Convert GeneratedMission → Mission shape for ActiveMissionsCard
function toMission(m: GeneratedMission): Mission {
  return {
    id: m.id,
    title: m.title,
    description: m.description,
    object_name: m.objectName,
    reward_points: m.points,
    difficulty: m.difficulty === 'expert' ? 'hard' : m.difficulty,
    is_daily: false,
    active: true,
    created_at: new Date().toISOString(),
  }
}

export default function DashboardPage() {
  const [sky, setSky] = useState<SkyConditions | null>(null)
  const [missions, setMissions] = useState<GeneratedMission[]>([])
  const { t, lang } = useLanguage()

  useEffect(() => {
    fetch('/api/sky/conditions')
      .then(r => r.json())
      .then(setSky)
      .catch(() => setSky({
        cloudCover: 30, visibility: 12, temperature: 16,
        moonPhase: 0.35, moonIllumination: 0.62,
        sunrise: '06:45', sunset: '19:55',
        bestViewingStart: '21:30', bestViewingEnd: '02:00',
      }))
  }, [])

  useEffect(() => {
    fetch('/api/missions')
      .then(r => r.json())
      .then(data => { if (Array.isArray(data)) setMissions(data) })
      .catch(() => {})
  }, [])

  // Top 3 easy/medium missions for the active missions card
  const topMissions = missions.slice(0, 3)

  // Best easy object for the recommended card (first easy visible object)
  const recommended = sky?.planets?.find(p => p.difficulty === 'easy' && p.isVisible)
  const topMission = missions.find(m => m.difficulty === 'easy')

  return (
    <div className="max-w-5xl mx-auto px-4 py-6 animate-page-enter">
      <header className="mb-6">
        <h1 className="text-2xl font-bold text-white">{t('dashboard.title')}</h1>
        <p className="text-sm text-[var(--text-secondary)]">
          {t('dashboard.location')} · {new Date().toLocaleDateString(lang === 'ka' ? 'ka-GE' : 'en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
        </p>
      </header>
      <DashboardGrid>
        <UserStatsCard profile={mockProfile} />
        <TonightsSkyCard conditions={sky} loading={!sky} />

        <ActiveMissionsCard
          missions={topMissions.map(toMission)}
          progress={[]}
        />

        <TonightsChallengeCard challenge={topMission ? {
          title: lang === 'ka' ? topMission.titleGe : topMission.title,
          description: lang === 'ka' ? topMission.descriptionGe : topMission.description,
          reward_points: topMission.points,
          completed: false,
        } : {
          title: lang === 'ka' ? 'ობიექტი ჯერ ჩაიტვირთება' : 'Loading tonight\'s challenge...',
          description: '',
          reward_points: 0,
          completed: false,
        }} />

        <RecommendedObjectCard object={recommended ? {
          name: lang === 'ka' ? recommended.nameGe : recommended.name,
          type: recommended.type,
          bestTime: recommended.bestTime,
          difficulty: recommended.difficulty,
          constellation: recommended.constellation,
          guide: {
            howToFind: lang === 'ka' ? recommended.hintGe : recommended.hint,
            equipment: EQUIPMENT_LABEL[recommended.equipment],
            tips: `Peak altitude: ${recommended.maxAltitude}° at ${recommended.bestTime}`,
          },
        } : {
          name: lang === 'ka' ? 'იტვირთება...' : 'Loading...',
          type: 'planet',
          bestTime: '--:--',
          difficulty: 'easy',
          constellation: '',
          guide: { howToFind: '', equipment: '', tips: '' },
        }} />

        <LeaderboardSnapshotCard users={[mockProfile]} currentUserId={mockProfile.id} />
      </DashboardGrid>
    </div>
  )
}

const EQUIPMENT_LABEL: Record<string, string> = {
  naked_eye: 'Naked eye — no equipment needed',
  binoculars: 'Binoculars recommended',
  small_telescope: 'Small telescope (60–80mm)',
  telescope: 'Telescope required (100mm+)',
}
