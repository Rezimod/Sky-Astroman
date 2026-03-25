export interface Profile {
  id: string
  username: string
  display_name: string | null
  avatar_url: string | null
  level: number
  points: number
  observations_count: number
  missions_completed: number
  team_id: string | null
  location_lat: number | null
  location_lng: number | null
  created_at: string
}

export interface Observation {
  id: string
  user_id: string
  object_name: string
  description: string | null
  photo_url: string | null
  telescope_used: string | null
  location_lat: number | null
  location_lng: number | null
  observed_at: string
  status: 'pending' | 'approved' | 'rejected'
  reviewed_by: string | null
  reviewed_at: string | null
  points_awarded: number
  created_at: string
}

export interface Mission {
  id: string
  title: string
  description: string | null
  object_name: string | null
  reward_points: number
  difficulty: 'easy' | 'medium' | 'hard'
  is_daily: boolean
  active: boolean
  created_at: string
}

export interface MissionProgress {
  id: string
  user_id: string
  mission_id: string
  status: 'active' | 'completed'
  completed_at: string | null
}

export interface Team {
  id: string
  name: string
  description: string | null
  avatar_url: string | null
  total_points: number
  created_by: string | null
  created_at: string
}

export interface SkyConditions {
  cloudCover: number
  visibility: number
  temperature: number
  moonPhase: number
  moonIllumination: number
  sunrise: string
  sunset: string
  bestViewingStart: string
  bestViewingEnd: string
  planets?: import('./astronomy').VisibleObject[]
}

export type { VisibleObject, GeneratedMission } from './astronomy'
