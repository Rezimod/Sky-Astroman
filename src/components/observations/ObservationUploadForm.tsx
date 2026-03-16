'use client'
import { useState, useRef } from 'react'

interface FormState {
  object_name: string
  description: string
  telescope_used: string
  observed_at: string
}

export default function ObservationUploadForm() {
  const [form, setForm] = useState<FormState>({
    object_name: '',
    description: '',
    telescope_used: '',
    observed_at: new Date().toISOString().slice(0, 16),
  })
  const [file, setFile] = useState<File | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.object_name) return
    setSubmitting(true)
    setError(null)

    try {
      let photo_url: string | null = null

      if (file) {
        const fd = new FormData()
        fd.append('file', file)
        const uploadRes = await fetch('/api/observations/upload', { method: 'POST', body: fd })
        if (!uploadRes.ok) throw new Error('Photo upload failed')
        const uploadData = await uploadRes.json()
        photo_url = uploadData.url
      }

      const res = await fetch('/api/observations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, photo_url, observed_at: new Date(form.observed_at).toISOString() }),
      })
      if (!res.ok) throw new Error('Submission failed')

      setSuccess(true)
      setForm({ object_name: '', description: '', telescope_used: '', observed_at: new Date().toISOString().slice(0, 16) })
      setFile(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong')
    } finally {
      setSubmitting(false)
    }
  }

  if (success) {
    return (
      <div className="glass-card p-6 text-center">
        <p className="text-[var(--accent-emerald)] font-semibold mb-2">Observation submitted!</p>
        <p className="text-sm text-[var(--text-secondary)] mb-4">Awaiting admin review. You&apos;ll earn points once approved.</p>
        <button onClick={() => setSuccess(false)} className="text-xs text-[var(--accent-cyan)]">Submit another</button>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="glass-card p-5 space-y-4">
      <h2 className="text-base font-bold text-[var(--text-primary)]">Log Observation</h2>

      <div>
        <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">Object Name *</label>
        <input
          type="text"
          required
          value={form.object_name}
          onChange={e => setForm(f => ({ ...f, object_name: e.target.value }))}
          placeholder="e.g. Orion Nebula, Jupiter, Moon"
          className="w-full bg-[var(--bg-cosmos)] border border-[var(--border-glass)] rounded-xl px-3 py-2 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-dim)] focus:outline-none focus:border-[var(--accent-cyan)]"
        />
      </div>

      <div>
        <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">Description</label>
        <textarea
          rows={3}
          value={form.description}
          onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
          placeholder="Describe what you observed..."
          className="w-full bg-[var(--bg-cosmos)] border border-[var(--border-glass)] rounded-xl px-3 py-2 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-dim)] focus:outline-none focus:border-[var(--accent-cyan)] resize-none"
        />
      </div>

      <div>
        <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">Telescope / Equipment</label>
        <input
          type="text"
          value={form.telescope_used}
          onChange={e => setForm(f => ({ ...f, telescope_used: e.target.value }))}
          placeholder="e.g. Celestron 8-inch SCT"
          className="w-full bg-[var(--bg-cosmos)] border border-[var(--border-glass)] rounded-xl px-3 py-2 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-dim)] focus:outline-none focus:border-[var(--accent-cyan)]"
        />
      </div>

      <div>
        <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">Date & Time *</label>
        <input
          type="datetime-local"
          required
          value={form.observed_at}
          onChange={e => setForm(f => ({ ...f, observed_at: e.target.value }))}
          className="w-full bg-[var(--bg-cosmos)] border border-[var(--border-glass)] rounded-xl px-3 py-2 text-sm text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent-cyan)]"
        />
      </div>

      <div>
        <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">Photo</label>
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          onChange={e => setFile(e.target.files?.[0] ?? null)}
          className="w-full text-xs text-[var(--text-secondary)] file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-medium file:bg-[rgba(56,240,255,0.12)] file:text-[var(--accent-cyan)] hover:file:bg-[rgba(56,240,255,0.2)]"
        />
      </div>

      {error && <p className="text-xs text-red-400">{error}</p>}

      <button
        type="submit"
        disabled={submitting}
        className="w-full py-2.5 rounded-xl text-sm font-semibold bg-[rgba(255,209,102,0.15)] text-[var(--accent-gold)] border border-[rgba(255,209,102,0.3)] hover:bg-[rgba(255,209,102,0.25)] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
      >
        {submitting ? 'Submitting...' : 'Submit Observation'}
      </button>
    </form>
  )
}
