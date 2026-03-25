import { NextResponse } from 'next/server'

export async function GET() {
  try {
    const key = process.env.NASA_API_KEY ?? 'DEMO_KEY'
    const res = await fetch(
      `https://api.nasa.gov/planetary/apod?api_key=${key}`,
      { next: { revalidate: 86400 } } // cache 24h
    )
    if (!res.ok) throw new Error('NASA APOD fetch failed')
    const data = await res.json()
    return NextResponse.json({
      title: data.title ?? '',
      url: data.url ?? '',
      hdurl: data.hdurl ?? data.url ?? '',
      explanation: data.explanation ?? '',
      date: data.date ?? '',
      media_type: data.media_type ?? 'image',
    })
  } catch {
    return NextResponse.json({ error: 'APOD unavailable' }, { status: 500 })
  }
}
