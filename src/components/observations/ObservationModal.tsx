'use client'
import { useState, useRef } from 'react'
import { X, Upload, CheckCircle, Camera } from 'lucide-react'
import { MissionIcon } from '@/components/shared/PlanetIcons'
import { useLanguage } from '@/contexts/LanguageContext'
import type { MissionDef } from '@/lib/missions'

interface ObservationModalProps {
  mission: MissionDef
  onClose: () => void
  onSuccess: () => void
}

export default function ObservationModal({ mission, onClose, onSuccess }: ObservationModalProps) {
  const { t } = useLanguage()
  const [step, setStep] = useState<'form' | 'uploading' | 'done'>('form')
  const [photoPreview, setPhotoPreview] = useState<string | null>(null)
  const [telescope, setTelescope] = useState('')
  const [description, setDescription] = useState('')
  const fileRef = useRef<HTMLInputElement>(null)

  const handlePhoto = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setPhotoPreview(URL.createObjectURL(file))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setStep('uploading')
    await new Promise(r => setTimeout(r, 1500))
    setStep('done')
    setTimeout(() => { onSuccess(); onClose() }, 2000)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-black/60 backdrop-blur-sm" onClick={onClose}>
      <div className="w-full max-w-md glass-card p-6 animate-page-enter" onClick={e => e.stopPropagation()}>
        {step === 'done' ? (
          <div className="flex flex-col items-center gap-4 py-8 text-center">
            <CheckCircle size={48} className="text-[#34d399]" />
            <p className="text-xl font-bold text-white">{t('modal.successTitle')}</p>
            <p className="text-sm text-[var(--text-secondary)]">{t('modal.successDesc')}</p>
          </div>
        ) : (
          <>
            <div className="flex items-center justify-between mb-5">
              <div className="flex items-center gap-3">
                <MissionIcon id={mission.id} size={32} />
                <div>
                  <p className="font-bold text-white">{mission.name}</p>
                  <p className="text-xs text-[#FFD166]">+{mission.points} {t('modal.ptsOnApproval')}</p>
                </div>
              </div>
              <button onClick={onClose} className="text-[var(--text-dim)] hover:text-white transition-colors"><X size={20} /></button>
            </div>

            <div className="glass-card p-3 mb-4 bg-[rgba(56,240,255,0.04)]">
              <p className="text-xs text-[var(--text-secondary)] leading-relaxed">{mission.desc}</p>
              <p className="text-xs text-[var(--text-dim)] mt-1">💡 {mission.hint}</p>
            </div>

            <form onSubmit={handleSubmit} className="flex flex-col gap-3">
              <input ref={fileRef} type="file" accept="image/*" capture="environment" onChange={handlePhoto} className="hidden" />
              {photoPreview ? (
                <div className="relative">
                  <img src={photoPreview} alt="preview" className="w-full h-40 object-cover rounded-xl border border-[var(--border-glass)]" />
                  <button type="button" onClick={() => setPhotoPreview(null)} className="absolute top-2 right-2 bg-black/60 rounded-full p-1 text-white hover:bg-black/80"><X size={14} /></button>
                </div>
              ) : (
                <button type="button" onClick={() => fileRef.current?.click()} className="w-full h-32 rounded-xl border-2 border-dashed border-[var(--border-glass)] hover:border-[rgba(255,209,102,0.3)] flex flex-col items-center justify-center gap-2 text-[var(--text-dim)] hover:text-[var(--text-secondary)] transition-all">
                  <Camera size={24} />
                  <span className="text-sm">{t('modal.attach')}</span>
                </button>
              )}

              <input
                type="text"
                value={telescope}
                onChange={e => setTelescope(e.target.value)}
                placeholder={t('modal.telescope')}
                className="w-full bg-[rgba(15,31,61,0.6)] border border-[var(--border-glass)] rounded-xl px-4 py-2.5 text-sm text-white placeholder-[var(--text-dim)] focus:outline-none focus:border-[rgba(255,209,102,0.4)]"
              />

              <textarea
                value={description}
                onChange={e => setDescription(e.target.value)}
                placeholder={t('modal.whatSee')}
                rows={2}
                className="w-full bg-[rgba(15,31,61,0.6)] border border-[var(--border-glass)] rounded-xl px-4 py-2.5 text-sm text-white placeholder-[var(--text-dim)] focus:outline-none focus:border-[rgba(255,209,102,0.4)] resize-none"
              />

              <button type="submit" disabled={step === 'uploading'} className="w-full py-3 rounded-xl font-bold text-sm btn-primary flex items-center justify-center gap-2 disabled:opacity-50">
                {step === 'uploading' ? (
                  <><span className="w-4 h-4 border-2 border-black/30 border-t-black rounded-full animate-spin" /> {t('modal.submitting')}</>
                ) : (
                  <><Upload size={16} /> {t('modal.submit')}</>
                )}
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  )
}
