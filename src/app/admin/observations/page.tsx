import { createServiceClient } from '@/lib/supabase/service'
import AdminObsClient from './AdminObsClient'

export const dynamic = 'force-dynamic'

export default async function AdminObservationsPage() {
  const supabase = createServiceClient()

  const { data: observations, error } = await supabase
    .from('observations')
    .select('id, object_name, description, telescope_used, photo_url, created_at, status, points_awarded, profiles(username, display_name)')
    .order('created_at', { ascending: false })
    .limit(50)

  return <AdminObsClient observations={observations ?? []} error={error?.message} />
}
