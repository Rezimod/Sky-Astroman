import { createServiceClient } from '@/lib/supabase/service'
import AdminObsClient from './AdminObsClient'

export const dynamic = 'force-dynamic'

export default async function AdminObservationsPage() {
  const supabase = createServiceClient()

  const [{ data: observations, error }, { data: missions }] = await Promise.all([
    supabase
      .from('observations')
      .select('id, user_id, object_name, description, telescope_used, photo_url, location_lat, location_lng, observed_at, created_at, status, points_awarded, profiles(username, display_name)')
      .order('created_at', { ascending: false })
      .limit(100),
    supabase
      .from('missions')
      .select('id, object_name, reward_points')
      .eq('active', true),
  ])

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return <AdminObsClient observations={(observations ?? []) as any[]} missions={(missions ?? []) as any[]} error={error?.message} />
}
