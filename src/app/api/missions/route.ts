import { NextResponse } from 'next/server'
import { getTonightsObjects, generateMissions } from '@/lib/astronomy'

// Cache missions for 10 minutes — astronomy positions don't change meaningfully faster
export const revalidate = 600

export async function GET() {
  try {
    const objects = getTonightsObjects()
    const missions = generateMissions(objects)
    return NextResponse.json(missions, {
      headers: { 'Cache-Control': 's-maxage=600, stale-while-revalidate=120' },
    })
  } catch {
    return NextResponse.json({ error: 'Failed to generate missions' }, { status: 500 })
  }
}
