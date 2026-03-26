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

const OPEN_METEO = 'https://api.open-meteo.com/v1/forecast?latitude=41.7151&longitude=44.8271&hourly=cloud_cover,visibility,temperature_2m&daily=sunrise,sunset,moon_phase&current=cloud_cover,temperature_2m&timezone=Asia%2FTbilisi&forecast_days=1'

const mockProfile: Profile = {
  id: 'demo', username: 'stargazer_tbilisi', display_name: 'Stargazer',
  avatar_url: null, level: 3, points: 720, observations_count: 12,
  missions_completed: 5, team_id: null, location_lat: 41.7151,
  location_lng: 44.8271, created_at: new Date().toISOString(),
}

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
    // Fetch planets from server, then overlay real weather from browser (correct clock, no server cache)
    Promise.all([
      fetch('/api/sky/conditions').then(r => r.json()).catch(() => null),
      fetch(OPEN_METEO).then(r => r.json()).catch(() => null),
    ]).then(([skyData, meteo]) => {
      if (!skyData) return
      if (meteo && !meteo.error) {
        const hour = new Date().getHours() // browser clock = correct local time
        skyData.cloudCover    = meteo.current?.cloud_cover       ?? meteo.hourly?.cloud_cover?.[hour]     ?? skyData.cloudCover
        skyData.temperature   = meteo.current?.temperature_2m    ?? meteo.hourly?.temperature_2m?.[hour]  ?? skyData.temperature
        skyData.visibility    = Math.round((meteo.hourly?.visibility?.[hour] ?? (skyData.visibility * 1000)) / 1000)
        const mp              = meteo.daily?.moon_phase?.[0]
        if (mp !== undefined) {
          skyData.moonPhase        = mp
          skyData.moonIllumination = Math.sin(mp * Math.PI)
        }
        skyData.sunrise = meteo.daily?.sunrise?.[0]?.slice(11, 16) ?? skyData.sunrise
        skyData.sunset  = meteo.daily?.sunset?.[0]?.slice(11, 16)  ?? skyData.sunset
      }
      setSky(skyData)
    })
  }, [])

  useEffect(() => {
    fetch('/api/missions')
      .then(r => r.json())
      .then(data => { if (Array.isArray(data)) setMissions(data) })
      .catch(() => {})
  }, [])

  const topMissions = missions.slice(0, 3)
  const recommended = sky?.planets?.find(p => p.difficulty === 'easy' && p.isVisible)
  const topMission  = missions.find(m => m.difficulty === 'easy')

  const equipmentLabel: Record<string, string> = {
    naked_eye:       lang === 'ka' ? 'შეუიარაღებელი თვალი'         : 'Naked eye — no equipment needed',
    binoculars:      lang === 'ka' ? 'ბინოკლი საჭიროა'              : 'Binoculars recommended',
    small_telescope: lang === 'ka' ? 'პატარა ტელესკოპი (60–80მმ)'  : 'Small telescope (60–80mm)',
    telescope:       lang === 'ka' ? 'ტელესკოპი (100მმ+)'           : 'Telescope required (100mm+)',
  }

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

        <ActiveMissionsCard missions={topMissions.map(toMission)} progress={[]} />

        <TonightsChallengeCard challenge={topMission ? {
          title:         lang === 'ka' ? topMission.titleGe       : topMission.title,
          description:   lang === 'ka' ? topMission.descriptionGe : topMission.description,
          reward_points: topMission.points,
          completed:     false,
        } : null} />

        <RecommendedObjectCard object={recommended ? {
          name:          lang === 'ka' ? recommended.nameGe : recommended.name,
          type:          recommended.type,
          bestTime:      recommended.bestTime,
          difficulty:    recommended.difficulty,
          constellation: recommended.constellation,
          guide: {
            howToFind: lang === 'ka' ? recommended.hintGe : recommended.hint,
            equipment: equipmentLabel[recommended.equipment] ?? recommended.equipment,
            tips:      lang === 'ka'
              ? `მაქს. სიმაღლე: ${recommended.maxAltitude}° · საუკეთესო: ${recommended.bestTime}`
              : `Peak altitude: ${recommended.maxAltitude}° at ${recommended.bestTime}`,
          },
        } : null} />

        <LeaderboardSnapshotCard users={[mockProfile]} currentUserId={mockProfile.id} />
      </DashboardGrid>
    </div>
  )
}
