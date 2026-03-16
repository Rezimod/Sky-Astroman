'use client'
import { useState, useEffect } from 'react'
import { Satellite, CheckCircle2, Clock } from 'lucide-react'
import { MISSIONS, DIFFICULTY_CONFIG } from '@/lib/missions'
import { MissionIcon } from '@/components/shared/PlanetIcons'
import ObservationModal from '@/components/observations/ObservationModal'
import type { MissionDef } from '@/lib/missions'

export default function MissionsPage() {
  const [activeMission, setActiveMission] = useState<MissionDef | null>(null)
  const [completedIds, setCompletedIds] = useState<Set<string>>(new Set())
  const [pendingIds, setPendingIds] = useState<Set<string>>(new Set())

  useEffect(() => {
    try {
      const saved = localStorage.getItem('sky_pending_missions')
      if (saved) setPendingIds(new Set(JSON.parse(saved)))
    } catch {}
  }, [])

  function handleSuccess(missionId: string) {
    setPendingIds(prev => {
      const next = new Set(prev).add(missionId)
      localStorage.setItem('sky_pending_missions', JSON.stringify([...next]))
      return next
    })
  }

  const isNight = new Date().getHours() >= 18 || new Date().getHours() < 5

  return (
    <>
      {activeMission && (
        <ObservationModal
          mission={activeMission}
          onClose={() => setActiveMission(null)}
          onSuccess={() => handleSuccess(activeMission.id)}
        />
      )}

      <div className="max-w-2xl mx-auto px-4 py-4 sm:py-6 animate-page-enter flex flex-col gap-4">
        <section>
          <div className="flex items-center gap-2 mb-2">
            <Satellite size={16} strokeWidth={1.5} className="text-[#38F0FF]" />
            <h1 className="text-xl sm:text-2xl font-bold text-white">Missions</h1>
          </div>
          <div className="flex items-center gap-2 mb-4">
            <div className={`w-1.5 h-1.5 rounded-full ${isNight ? 'bg-[#34d399] animate-pulse' : 'bg-yellow-500'}`} />
            <span className="text-xs text-[var(--text-dim)]">
              {isNight ? 'Sky conditions: Observable tonight' : 'Daytime — missions available tonight'}
            </span>
          </div>

          <div className="glass-card p-3 flex items-center justify-around mb-4">
            <div className="text-center">
              <p className="text-lg font-bold text-[#FFD166]">{completedIds.size}</p>
              <p className="text-[10px] text-[var(--text-dim)] uppercase tracking-wide">Completed</p>
            </div>
            <div className="w-px h-8 bg-[var(--border-glass)]" />
            <div className="text-center">
              <p className="text-lg font-bold text-amber-400">{pendingIds.size}</p>
              <p className="text-[10px] text-[var(--text-dim)] uppercase tracking-wide">Pending</p>
            </div>
            <div className="w-px h-8 bg-[var(--border-glass)]" />
            <div className="text-center">
              <p className="text-lg font-bold text-[var(--text-secondary)]">{MISSIONS.length - completedIds.size - pendingIds.size}</p>
              <p className="text-[10px] text-[var(--text-dim)] uppercase tracking-wide">Available</p>
            </div>
          </div>
        </section>

        <div className="grid grid-cols-2 gap-2.5">
          {MISSIONS.map(mission => {
            const done = completedIds.has(mission.id)
            const pending = pendingIds.has(mission.id)
            const diffConfig = DIFFICULTY_CONFIG[mission.difficulty]

            return (
              <div
                key={mission.id}
                className="relative flex flex-col items-center text-center rounded-2xl px-3 pt-5 pb-4 transition-all duration-200"
                style={{
                  background: 'rgba(255,255,255,0.03)',
                  border: `1px solid ${done ? 'rgba(255,255,255,0.05)' : 'rgba(255,255,255,0.08)'}`,
                  opacity: done ? 0.45 : 1,
                }}
                onMouseEnter={e => { if (!done) { (e.currentTarget as HTMLDivElement).style.borderColor = 'rgba(255,209,102,0.25)'; (e.currentTarget as HTMLDivElement).style.boxShadow = '0 0 20px rgba(255,209,102,0.08)' } }}
                onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.borderColor = done ? 'rgba(255,255,255,0.05)' : 'rgba(255,255,255,0.08)'; (e.currentTarget as HTMLDivElement).style.boxShadow = 'none' }}
              >
                {(done || pending) && (
                  <div className="absolute top-2.5 right-2.5">
                    {done ? <CheckCircle2 size={13} className="text-slate-600" /> : <Clock size={13} className="text-amber-400/50" />}
                  </div>
                )}

                <div className="mb-3"><MissionIcon id={mission.id} size={44} /></div>

                <p className="text-white font-semibold text-[13px] leading-snug mb-1.5">{mission.name}</p>

                <div className="flex flex-col items-center gap-1 mb-3">
                  <div className="flex gap-1 justify-center">
                    {[1,2,3,4,5].map(d => (
                      <span key={d} className="w-1 h-1 rounded-full" style={{
                        backgroundColor: d <= diffConfig.dots ? diffConfig.color : 'rgba(255,255,255,0.1)'
                      }} />
                    ))}
                  </div>
                  <span className="text-[9px] text-slate-600 font-medium tracking-wide uppercase">{diffConfig.label}</span>
                </div>

                <p className="text-[#FFD166] text-[11px] font-bold mb-3">+{mission.points} pts</p>

                {done ? (
                  <div className="w-full py-2 rounded-lg text-[11px] text-slate-700 text-center" style={{ background: 'rgba(255,255,255,0.02)' }}>Complete</div>
                ) : pending ? (
                  <div className="w-full py-2 rounded-lg text-[11px] text-amber-400/50 text-center" style={{ background: 'rgba(251,191,36,0.04)' }}>Pending Review</div>
                ) : (
                  <button
                    onClick={() => setActiveMission(mission)}
                    className="w-full py-2.5 rounded-lg text-[12px] font-bold transition-all active:scale-95 hover:opacity-90"
                    style={{ background: 'linear-gradient(135deg, #FFD166, #CC9A33)', color: '#070B14' }}
                  >
                    Begin →
                  </button>
                )}
              </div>
            )
          })}
        </div>

        <div className="glass-card p-4">
          <p className="text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-widest mb-3">How Missions Work</p>
          <div className="flex flex-col gap-2">
            {[
              ['1', 'Go outside and observe the target object'],
              ['2', 'Photograph it through your telescope or naked eye'],
              ['3', 'Submit your photo via "Begin →"'],
              ['4', 'Admin verifies and awards your points'],
            ].map(([num, text]) => (
              <div key={num} className="flex items-start gap-3">
                <span className="w-5 h-5 rounded-full bg-[rgba(255,209,102,0.1)] border border-[rgba(255,209,102,0.2)] text-[#FFD166] text-[10px] font-bold flex items-center justify-center flex-shrink-0">{num}</span>
                <p className="text-xs text-[var(--text-secondary)] leading-relaxed">{text}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </>
  )
}
