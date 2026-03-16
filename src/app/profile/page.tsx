'use client'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { User, Star, Eye, Target, LogOut } from 'lucide-react'
import { useRouter } from 'next/navigation'
import type { Profile, Observation } from '@/lib/types'
import { getPointsToNextLevel } from '@/lib/constants'

export default function ProfilePage() {
  const [profile, setProfile] = useState<Profile | null>(null)
  const [observations, setObservations] = useState<Observation[]>([])
  const [loading, setLoading] = useState(true)
  const router = useRouter()

  useEffect(() => {
    loadProfile()
  }, [])

  async function loadProfile() {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { router.push('/login'); return }

    const [profileRes, obsRes] = await Promise.all([
      supabase.from('profiles').select('*').eq('id', user.id).single(),
      supabase.from('observations').select('*').eq('user_id', user.id).order('created_at', { ascending: false }).limit(20),
    ])

    setProfile(profileRes.data)
    setObservations(obsRes.data ?? [])
    setLoading(false)
  }

  async function handleSignOut() {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/')
  }

  if (loading) return <div className="max-w-2xl mx-auto px-4 py-12 text-center text-[var(--text-secondary)]">Loading...</div>
  if (!profile) return null

  const levelProgress = getPointsToNextLevel(profile.points)

  const statusColors: Record<string, string> = {
    approved: '#34d399',
    pending: '#FFD166',
    rejected: '#f87171',
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-6 animate-page-enter">
      {/* Profile header */}
      <div className="glass-card p-6 mb-4">
        <div className="flex items-start gap-4">
          <div className="w-14 h-14 rounded-full bg-[rgba(255,209,102,0.1)] border-2 border-[rgba(255,209,102,0.3)] flex items-center justify-center flex-shrink-0">
            {profile.avatar_url ? (
              <img src={profile.avatar_url} alt={profile.username} className="w-full h-full rounded-full object-cover" />
            ) : (
              <User size={24} className="text-[#FFD166]" />
            )}
          </div>
          <div className="flex-1">
            <p className="font-bold text-white text-lg">{profile.display_name ?? profile.username}</p>
            <p className="text-sm text-[var(--text-secondary)]">@{profile.username}</p>
            <div className="flex items-center gap-3 mt-2 flex-wrap">
              <span className="text-xs bg-[rgba(255,209,102,0.1)] border border-[rgba(255,209,102,0.2)] text-[#FFD166] px-2 py-0.5 rounded-lg font-medium">Level {profile.level}</span>
              <span className="text-xs text-[var(--text-dim)]">{profile.points.toLocaleString()} pts</span>
            </div>
          </div>
          <button onClick={handleSignOut} className="text-[var(--text-dim)] hover:text-red-400 transition-colors p-2" title="Sign out">
            <LogOut size={18} />
          </button>
        </div>

        {/* Level progress bar */}
        <div className="mt-4">
          <div className="flex justify-between text-xs text-[var(--text-dim)] mb-1.5">
            <span>Level {profile.level}</span>
            <span>{levelProgress.current} / {levelProgress.needed} pts to Level {profile.level + 1}</span>
          </div>
          <div className="w-full h-2 rounded-full bg-[rgba(255,255,255,0.05)]">
            <div
              className="h-full rounded-full transition-all duration-700"
              style={{ width: `${levelProgress.progress}%`, background: 'linear-gradient(90deg, #FFD166, #38F0FF)' }}
            />
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3 mb-4">
        {[
          { icon: Star, label: 'Points', value: profile.points.toLocaleString(), color: '#FFD166' },
          { icon: Eye, label: 'Observations', value: profile.observations_count.toString(), color: '#38F0FF' },
          { icon: Target, label: 'Missions', value: profile.missions_completed.toString(), color: '#34d399' },
        ].map(({ icon: Icon, label, value, color }) => (
          <div key={label} className="glass-card p-4 text-center">
            <Icon size={18} style={{ color }} className="mx-auto mb-2" />
            <p className="text-xl font-bold text-white">{value}</p>
            <p className="text-[10px] text-[var(--text-dim)] uppercase tracking-wide mt-0.5">{label}</p>
          </div>
        ))}
      </div>

      {/* Observation history */}
      <div className="glass-card p-4">
        <p className="text-xs text-[var(--text-secondary)] uppercase tracking-widest mb-3 font-medium">Observation History</p>
        {observations.length === 0 ? (
          <p className="text-sm text-[var(--text-dim)] text-center py-6">No observations yet. Go to Missions to start!</p>
        ) : (
          <div className="flex flex-col gap-2">
            {observations.map(obs => (
              <div key={obs.id} className="flex items-center gap-3 py-2 border-b border-[var(--border-glass)] last:border-0">
                {obs.photo_url && (
                  <img src={obs.photo_url} alt={obs.object_name} className="w-10 h-10 rounded-lg object-cover flex-shrink-0" />
                )}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-white truncate">{obs.object_name}</p>
                  <p className="text-xs text-[var(--text-dim)]">{new Date(obs.created_at).toLocaleDateString()}</p>
                </div>
                <div className="flex flex-col items-end gap-1">
                  <span className="text-[10px] font-medium px-2 py-0.5 rounded-full" style={{
                    color: statusColors[obs.status],
                    background: statusColors[obs.status] + '15',
                  }}>
                    {obs.status}
                  </span>
                  {obs.status === 'approved' && obs.points_awarded > 0 && (
                    <span className="text-[10px] text-[#FFD166]">+{obs.points_awarded} pts</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
