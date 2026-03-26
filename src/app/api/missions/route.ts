import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'
import { getTonightsObjects, generateMissions } from '@/lib/astronomy'

export async function GET() {
  try {
    const objects = getTonightsObjects()
    const missions = generateMissions(objects)
    return NextResponse.json(missions)
  } catch (err) {
    return NextResponse.json({ error: 'Failed to generate missions' }, { status: 500 })
  }
}
