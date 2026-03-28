'use client'
import { useState, useEffect, useRef, useCallback, Suspense } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { ChevronLeft, Camera, Upload, MapPin, CheckCircle, Loader2, X } from 'lucide-react'
import { useLanguage } from '@/contexts/LanguageContext'

interface Mission {
  id: string
  object_name: string | null
  reward_points: number
}

const EQUIPMENT_OPTIONS = [
  { label: 'შეუიარ. თვალი', value: 'შეუიარაღებელი თვალი' },
  { label: 'ბინოკლი',       value: 'ბინოკლი'              },
  { label: 'ტელესკოპი',     value: 'ტელესკოპი'            },
  { label: 'კამერა',        value: 'კამერა'               },
]

function NewObservationContent() {
  const { lang } = useLanguage()
  const router = useRouter()
  const searchParams = useSearchParams()
  const prefilledObject = searchParams.get('object') ?? ''
  const prefilledPoints = Number(searchParams.get('points') ?? 0)

  const [file, setFile]           = useState<File | null>(null)
  const [preview, setPreview]     = useState<string | null>(null)
  const [objectName, setObjectName] = useState(prefilledObject)
  const [description, setDescription] = useState('')
  const [telescope, setTelescope] = useState('')
  const [observedAt, setObservedAt] = useState(() => new Date().toISOString().slice(0, 16))
  const [lat, setLat]             = useState<number | null>(null)
  const [lng, setLng]             = useState<number | null>(null)
  const [geoStatus, setGeoStatus] = useState<'detecting' | 'done' | 'error'>('detecting')
  const [missions, setMissions]   = useState<Mission[]>([])
  const [step, setStep]           = useState<'form' | 'uploading' | 'done'>('form')
  const [error, setError]         = useState<string | null>(null)
  const [dragOver, setDragOver]   = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    fetch('/api/missions').then(r => r.json()).then(data => {
      if (Array.isArray(data)) setMissions(data)
    }).catch(() => {})
  }, [])

  useEffect(() => {
    navigator.geolocation.getCurrentPosition(
      pos => { setLat(pos.coords.latitude); setLng(pos.coords.longitude); setGeoStatus('done') },
      ()  => setGeoStatus('error'),
      { timeout: 6000 }
    )
  }, [])

  const handleFile = useCallback((f: File) => {
    if (!f.type.startsWith('image/')) {
      setError(lang === 'ka' ? 'მხოლოდ სურათის ფაილია დაშვებული' : 'Only image files allowed')
      return
    }
    if (f.size > 10 * 1024 * 1024) {
      setError(lang === 'ka' ? 'მაქსიმუმი 10MB' : 'Max file size is 10MB')
      return
    }
    setError(null)
    setFile(f)
    setPreview(URL.createObjectURL(f))
  }, [lang])

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setDragOver(false)
    const f = e.dataTransfer.files?.[0]
    if (f) handleFile(f)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!objectName.trim()) {
      setError(lang === 'ka' ? 'ობიექტის სახელი სავალდებულოა' : 'Object name is required')
      return
    }
    setStep('uploading')
    setError(null)

    try {
      let photo_url: string | null = null

      if (file) {
        const fd = new FormData()
        fd.append('file', file)
        const up = await fetch('/api/observations/upload', { method: 'POST', body: fd })
        if (!up.ok) throw new Error(lang === 'ka' ? 'ფოტოს ატვირთვა ვერ მოხდა' : 'Photo upload failed')
        const { url } = await up.json()
        photo_url = url
      }

      const res = await fetch('/api/observations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          object_name:    objectName.trim(),
          description:    description.trim() || null,
          photo_url,
          telescope_used: telescope.trim() || null,
          location_lat:   lat,
          location_lng:   lng,
          observed_at:    new Date(observedAt).toISOString(),
        }),
      })

      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        throw new Error(body.error ?? 'Submission failed')
      }

      setStep('done')
      setTimeout(() => router.push('/gallery'), 3000)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong')
      setStep('form')
    }
  }

  if (step === 'done') {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center px-6 text-center animate-page-enter">
        <div className="w-20 h-20 rounded-full flex items-center justify-center mb-6"
          style={{ background: 'rgba(52,211,153,0.12)', border: '1px solid rgba(52,211,153,0.25)' }}>
          <CheckCircle size={40} className="text-[#34D399]" />
        </div>
        <h2 className="text-2xl font-bold text-white mb-2">
          {lang === 'ka' ? 'ფოტო გაგზავნილია!' : 'Photo Submitted!'}
        </h2>
        <p className="text-[#64748B] text-sm mb-5">
          {lang === 'ka' ? 'ადმინი შეამოწმებს და დაგირიცხავს XP-ს.' : 'Admin will review and award XP.'}
        </p>
        {prefilledPoints > 0 && (
          <div className="text-5xl font-bold mb-6" style={{ color: '#F59E0B' }}>
            +{prefilledPoints} <span className="text-3xl">✦</span>
          </div>
        )}
        <p className="text-xs text-[#334155]">
          {lang === 'ka' ? 'გადამისამართება გალერეაში...' : 'Redirecting to gallery...'}
        </p>
      </div>
    )
  }

  const missionObjects = [...new Set(
    missions.map(m => m.object_name).filter(Boolean) as string[]
  )]

  return (
    <div className="max-w-md mx-auto px-4 sm:px-6 py-5 pb-32 sm:pb-10 animate-page-enter">

      {/* Header */}
      <div className="relative flex items-center justify-center mb-6">
        <button
          onClick={() => router.back()}
          className="absolute left-0 rounded-full flex items-center justify-center transition-all hover:bg-white/[0.08]"
          style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', width: 44, height: 44 }}
        >
          <ChevronLeft size={16} className="text-[#94A3B8]" />
        </button>
        <h1 className="text-xl font-bold text-white">
          {lang === 'ka' ? 'ახალი დაკვირვება' : 'New Observation'}
        </h1>
      </div>

      <form onSubmit={handleSubmit} className="flex flex-col gap-5">

        {/* Photo drop zone */}
        <div>
          <label className="block text-[10px] font-bold tracking-[0.15em] text-[#64748B] uppercase mb-2">
            {lang === 'ka' ? 'ფოტო' : 'Photo'}
          </label>
          <input
            ref={fileRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            capture="environment"
            className="hidden"
            onChange={e => { const f = e.target.files?.[0]; if (f) handleFile(f) }}
          />
          {preview ? (
            <div className="relative rounded-2xl overflow-hidden" style={{ height: 220 }}>
              <img src={preview} alt="preview" className="w-full h-full object-cover" />
              <button
                type="button"
                onClick={() => { setFile(null); setPreview(null) }}
                className="absolute top-3 right-3 rounded-full bg-black/60 flex items-center justify-center hover:bg-black/80 transition-colors"
                style={{ width: 32, height: 32 }}
              >
                <X size={14} className="text-white" />
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              onDragOver={e => { e.preventDefault(); setDragOver(true) }}
              onDragLeave={() => setDragOver(false)}
              onDrop={handleDrop}
              className="w-full rounded-2xl flex flex-col items-center justify-center gap-3 transition-all"
              style={{
                height: 160,
                border: `2px dashed ${dragOver ? 'rgba(99,102,241,0.6)' : 'rgba(255,255,255,0.12)'}`,
                background: dragOver ? 'rgba(99,102,241,0.06)' : 'rgba(255,255,255,0.02)',
              }}
            >
              <div className="w-12 h-12 rounded-full flex items-center justify-center"
                style={{ background: 'rgba(99,102,241,0.10)' }}>
                <Camera size={22} className="text-[#6366F1]" />
              </div>
              <div className="text-center">
                <p className="text-sm text-[#94A3B8] font-medium">
                  {lang === 'ka' ? 'ფოტოს ატვირთვა' : 'Upload Photo'}
                </p>
                <p className="text-xs text-[#475569] mt-0.5">
                  {lang === 'ka' ? 'JPG, PNG, WebP • მაქს. 10MB' : 'JPG, PNG, WebP • Max 10MB'}
                </p>
              </div>
            </button>
          )}
        </div>

        {/* Object name */}
        <div>
          <label className="block text-[10px] font-bold tracking-[0.15em] text-[#64748B] uppercase mb-2">
            {lang === 'ka' ? 'ობიექტის სახელი' : 'Object Name'} *
          </label>
          {missionObjects.length > 0 && (
            <select
              value=""
              onChange={e => { if (e.target.value) setObjectName(e.target.value) }}
              className="w-full rounded-xl px-4 py-3 text-sm text-[#94A3B8] focus:outline-none mb-2"
              style={{ background: 'rgba(15,31,61,0.6)', border: '1px solid rgba(255,255,255,0.10)', minHeight: 44 }}
            >
              <option value="">{lang === 'ka' ? '— მისიებიდან —' : '— From missions —'}</option>
              {missionObjects.map(o => <option key={o} value={o}>{o}</option>)}
            </select>
          )}
          <input
            type="text"
            value={objectName}
            onChange={e => setObjectName(e.target.value)}
            placeholder={lang === 'ka' ? 'მაგ. მთვარე, M31, NGC 6992...' : 'e.g. Moon, M31, NGC 6992...'}
            required
            className="w-full rounded-xl px-4 py-3 text-sm text-white placeholder-[#475569] focus:outline-none"
            style={{ background: 'rgba(15,31,61,0.6)', border: '1px solid rgba(255,255,255,0.10)', minHeight: 44 }}
          />
        </div>

        {/* Description */}
        <div>
          <label className="block text-[10px] font-bold tracking-[0.15em] text-[#64748B] uppercase mb-2">
            {lang === 'ka' ? 'აღწერა' : 'Description'}
          </label>
          <textarea
            value={description}
            onChange={e => setDescription(e.target.value)}
            placeholder={lang === 'ka' ? 'რა დაინახე? პირობები, ადგილი...' : 'What did you see? Conditions, location...'}
            rows={3}
            className="w-full rounded-xl px-4 py-3 text-sm text-white placeholder-[#475569] focus:outline-none resize-none"
            style={{ background: 'rgba(15,31,61,0.6)', border: '1px solid rgba(255,255,255,0.10)' }}
          />
        </div>

        {/* Equipment quick-select */}
        <div>
          <label className="block text-[10px] font-bold tracking-[0.15em] text-[#64748B] uppercase mb-2">
            {lang === 'ka' ? 'აღჭურვილობა' : 'Equipment'}
          </label>
          <div className="flex flex-wrap gap-2 mb-2">
            {EQUIPMENT_OPTIONS.map(opt => (
              <button
                key={opt.value}
                type="button"
                onClick={() => setTelescope(prev => prev === opt.value ? '' : opt.value)}
                className="px-3 py-2.5 rounded-xl text-xs font-bold tracking-wide transition-all"
                style={{
                  minHeight: 44,
                  background: telescope === opt.value ? 'rgba(99,102,241,0.20)' : 'rgba(255,255,255,0.04)',
                  border: `1px solid ${telescope === opt.value ? 'rgba(99,102,241,0.50)' : 'rgba(255,255,255,0.08)'}`,
                  color: telescope === opt.value ? '#818CF8' : '#64748B',
                }}
              >
                {opt.label}
              </button>
            ))}
          </div>
          <input
            type="text"
            value={telescope}
            onChange={e => setTelescope(e.target.value)}
            placeholder={lang === 'ka' ? 'ან შეიყვანე სახელი...' : 'Or type equipment name...'}
            className="w-full rounded-xl px-4 py-3 text-sm text-white placeholder-[#475569] focus:outline-none"
            style={{ background: 'rgba(15,31,61,0.6)', border: '1px solid rgba(255,255,255,0.10)', minHeight: 44 }}
          />
        </div>

        {/* Date & time */}
        <div>
          <label className="block text-[10px] font-bold tracking-[0.15em] text-[#64748B] uppercase mb-2">
            {lang === 'ka' ? 'თარიღი და დრო' : 'Date & Time'}
          </label>
          <input
            type="datetime-local"
            value={observedAt}
            onChange={e => setObservedAt(e.target.value)}
            className="w-full rounded-xl px-4 py-3 text-sm text-white focus:outline-none"
            style={{ background: 'rgba(15,31,61,0.6)', border: '1px solid rgba(255,255,255,0.10)', minHeight: 44, colorScheme: 'dark' }}
          />
        </div>

        {/* Location */}
        <div>
          <label className="block text-[10px] font-bold tracking-[0.15em] text-[#64748B] uppercase mb-2">
            {lang === 'ka' ? 'მდებარეობა' : 'Location'}
          </label>
          <div className="rounded-xl px-4 flex items-center gap-3"
            style={{ background: 'rgba(15,31,61,0.6)', border: '1px solid rgba(255,255,255,0.10)', minHeight: 44 }}>
            <MapPin size={15} className="text-[#6366F1] shrink-0" />
            {geoStatus === 'detecting' && (
              <span className="text-xs text-[#64748B] py-3">
                {lang === 'ka' ? 'მდებარეობის განსაზღვრა...' : 'Detecting location...'}
              </span>
            )}
            {geoStatus === 'done' && lat !== null && (
              <span className="text-xs text-[#94A3B8] py-3">{lat.toFixed(4)}, {lng?.toFixed(4)}</span>
            )}
            {geoStatus === 'error' && (
              <div className="flex items-center gap-2 flex-1 py-2">
                <span className="text-xs text-[#475569]">{lang === 'ka' ? 'ვერ განისაზღვრა' : 'Not detected'}</span>
                <button
                  type="button"
                  onClick={() => { setLat(41.6941); setLng(44.8337); setGeoStatus('done') }}
                  className="ml-auto text-xs font-bold px-3 py-1.5 rounded-lg transition-all"
                  style={{ background: 'rgba(99,102,241,0.12)', color: '#818CF8', border: '1px solid rgba(99,102,241,0.25)', minHeight: 32 }}
                >
                  Tbilisi
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Error */}
        {error && (
          <p className="text-sm text-[#F87171] text-center rounded-xl px-4 py-3"
            style={{ background: 'rgba(248,113,113,0.08)', border: '1px solid rgba(248,113,113,0.20)' }}>
            {error}
          </p>
        )}

        {/* Submit */}
        <button
          type="submit"
          disabled={step === 'uploading'}
          className="w-full rounded-2xl font-bold text-base flex items-center justify-center gap-2 transition-all disabled:opacity-60 active:scale-[0.98]"
          style={{ background: 'linear-gradient(135deg, #6366F1, #818CF8)', color: 'white', minHeight: 54 }}
        >
          {step === 'uploading' ? (
            <><Loader2 size={18} className="animate-spin" /> {lang === 'ka' ? 'იგზავნება...' : 'Submitting...'}</>
          ) : (
            <><Upload size={18} /> {lang === 'ka' ? 'გაგზავნა' : 'Submit Observation'}</>
          )}
        </button>

      </form>
    </div>
  )
}

export default function NewObservationPage() {
  return (
    <Suspense>
      <NewObservationContent />
    </Suspense>
  )
}
