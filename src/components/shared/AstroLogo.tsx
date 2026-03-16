'use client'
import { useState } from 'react'

export default function AstroLogo({ heightClass = 'h-8', className = '' }: { heightClass?: string; className?: string }) {
  const [err, setErr] = useState(false)
  if (err) return <span className="text-2xl leading-none">🔭</span>
  return (
    <img
      src="https://club.astroman.ge/logo.png"
      alt="Astroman"
      className={`${heightClass} w-auto object-contain ${className}`}
      onError={() => setErr(true)}
    />
  )
}
