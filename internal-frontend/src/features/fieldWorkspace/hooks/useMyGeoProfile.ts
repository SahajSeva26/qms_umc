import { useGeoProfiles } from '@/features/geo-profile/hooks/useGeoProfiles'
import { useSession } from '@/hooks/useSession'

// The logged-in FO's own geo-profile (one per role) — gives HQ city/state. The prototype shows a
// "states" array; the real model is one profile per role with a single city/state, so that's
// what's shown here, not a fabricated multi-state list.
export function useMyGeoProfile() {
  const { session } = useSession()
  const roleId = session?.role.id
  const { data, isLoading, error, refetch } = useGeoProfiles({ role: roleId, limit: '1' }, !!roleId)
  const geoProfile = data?.data?.items?.[0] ?? null
  return { geoProfile, isLoading, error, refetch }
}
