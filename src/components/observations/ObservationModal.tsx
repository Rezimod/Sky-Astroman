'use client'
import { useState, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { X, Upload, Loader2, CheckCircle, Camera } from 'lucide-react'
import { MissionIcon } from '@/components/shared/PlanetIcons'
import type { MissionDef } from '@/lib/missions'

interface ObservationModalProps {
  mission: MissionDef
  onClose: () => void
  onSuccess: () => void
}

export default function ObservationModal({ mission, onClose, onSuccess }: ObservationModalProps) {
  const [step, setStep] = useState<'form' | 'uploading' | 'done'>('form')
  const [photo, setPhoto] = useState<File | null>(null)
  const [photoPreview, setPhotoPreview] = useState<string | null>(null)
  const [telescope, setTelescope] = useState('')
  const [description, setDescription] = useState('')
  const [error, setError] = useState<string | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  const handlePhoto = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setPhoto(file)
    setPhotoPreview(URL.createObjectURL(file))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!photo) { setError('Please attach a photo of your observation'); return }
    setStep('uploading')
    setError(null)

    try {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Not logged in')

      // Upload photo
      const ext = photo.name.split('.').pop()
      const path = `${user.id}/${Date.now()}.${ext}`
      const { error: uploadError } = await supabase.storage
        .from('observations')
        .upload(path, photo, { contentType: photo.type })
      if (uploadError) throw uploadError

      const { data: { publicUrl } } = supabase.storage
        .from('observations')
        .getPublicUrl(path)

      // Create observation
      const { error: insertError } = await supabase.from('observations').insert({
        user_id: user.id,
        object_name: mission.name,
        description: description || null,
        photo_url: publicUrl,
        telescope_used: telescope || null,
        observed_at: new Date().toISOString(),
        status: 'pending',
      })
      if (insertError) throw insertError

      setStep('done')
      setTimeout(() => { onSuccess(); onClose() }, 2000)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Upload failed')
      setStep('form')
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-black/60 backdrop-blur-sm" onClick={onClose}>
      <div
        className="w-full max-w-md glass-card p-6 animate-page-enter"
        onClick={e => e.stopPropagation()}
      >
        {step === 'done' ? (
          <div className="flex flex-col items-center gap-4 py-8 text-center">
            <CheckCircle size={48} className="text-[#34d399]" />
            <p className="text-xl font-bold text-white">Observation submitted!</p>
            <p className="text-sm text-[var(--text-secondary)]">Awaiting admin review. Points will be added once verified.</p>
          </div>
        ) : (
          <>
            <div className="flex items-center justify-between mb-5">
              <div className="flex items-center gap-3">
                <MissionIcon id={mission.id} size={32} />
                <div>
                  <p className="font-bold text-white">{mission.name}</p>
                  <p className="text-xs text-[#FFD166]">+{mission.points} pts on approval</p>
                </div>
              </div>
              <button onClick={onClose} className="text-[var(--text-dim)] hover:text-white transition-colors">
                <X size={20} />
              </button>
            </div>

            <div className="glass-card p-3 mb-4 bg-[rgba(56,240,255,0.04)]">
              <p className="text-xs text-[var(--text-secondary)] leading-relaxed">{mission.desc}</p>
              <p className="text-xs text-[var(--text-dim)] mt-1">💡 {mission.hint}</p>
            </div>

            <form onSubmit={handleSubmit} className="flex flex-col gap-3">
              {/* Photo upload */}
              <div>
                <input ref={fileRef} type="file" accept="image/*" capture="environment" onChange={handlePhoto} className="hidden" />
                {photoPreview ? (
                  <div className="relative">
                    <img src={photoPreview} alt="preview" className="w-full h-40 object-cover rounded-xl border border-[var(--border-glass)]" />
                    <button type="button" onClick={() => { setPhoto(null); setPhotoPreview(null) }} className="absolute top-2 right-2 bg-black/60 rounded-full p-1 text-white hover:bg-black/80">
                      <X size={14} />
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => fileRef.current?.click()}
                    className="w-full h-32 rounded-xl border-2 border-dashed border-[var(--border-glass)] hover:border-[rgba(255,209,102,0.3)] flex flex-col items-center justify-center gap-2 text-[var(--text-dim)] hover:text-[var(--text-secondary)] transition-all"
                  >
                    <Camera size={24} />
                    <span className="text-sm">Tap to attach photo</span>
                  </button>
                )}
              </div>

              <input
                type="text"
                value={telescope}
                onChange={e => setTelescope(e.target.value)}
                placeholder="Telescope used (optional)"
                className="w-full bg-[rgba(15,31,61,0.6)] border border-[var(--border-glass)] rounded-xl px-4 py-2.5 text-sm text-white placeholder-[var(--text-dim)] focus:outline-none focus:border-[rgba(255,209,102,0.4)]"
              />

              <textarea
                value={description}
                onChange={e => setDescription(e.target.value)}
                placeholder="What did you see? (optional)"
                rows={2}
                className="w-full bg-[rgba(15,31,61,0.6)] border border-[var(--border-glass)] rounded-xl px-4 py-2.5 text-sm text-white placeholder-[var(--text-dim)] focus:outline-none focus:border-[rgba(255,209,102,0.4)] resize-none"
              />

              {error && <p className="text-red-400 text-xs">{error}</p>}

              <button
                type="submit"
                disabled={step === 'uploading'}
                className="w-full py-3 rounded-xl font-bold text-sm btn-primary flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {step === 'uploading' ? (
                  <><Loader2 size={16} className="animate-spin" /> Uploading...</>
                ) : (
                  <><Upload size={16} /> Submit Observation</>
                )}
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  )
}
