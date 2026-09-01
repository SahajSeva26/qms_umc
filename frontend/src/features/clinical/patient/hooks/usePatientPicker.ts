import { useDebouncedValue } from '@/hooks/useDebouncedValue'
import { useEntityQuery } from '@/hooks/useEntityQuery'
import { patientKeys } from '@/features/clinical/patient/hooks/usePatients'
import { patientService } from '@/features/clinical/patient/patient.service'
import type { SearchPatientQuery } from '@/features/clinical/patient/patient.types'

const PAGE_SIZE = 10

// Debounced search-as-you-type against the global patient registry. No
// pagination "load more" — the query is name/mobile scoped, so results are
// already narrow; if a genuinely large result set ever becomes an issue,
// migrate to the same accumulation shape as useInventoryMasterPicker.ts.
export const usePatientPicker = (query: string, enabled: boolean) => {
  const debouncedQuery = useDebouncedValue(query, 300)
  const trimmed = debouncedQuery.trim()
  const hasQuery = trimmed.length > 0

  // A pure-digit query searches by mobile; otherwise by name — mirrors how a
  // field officer would actually search (patients are usually found by
  // phone number at a camp, or by name if the mobile isn't at hand).
  const isMobileQuery = /^\d+$/.test(trimmed)
  const searchQuery: SearchPatientQuery = {
    ...(isMobileQuery ? { mobile: trimmed } : { name: trimmed || undefined }),
    limit: String(PAGE_SIZE),
  }

  const { data, isFetching, error, refetch } = useEntityQuery(
    patientKeys,
    (q) => patientService.searchPatients(q),
    searchQuery,
    { enabled: enabled && hasQuery },
  )

  return {
    items: data?.data?.items ?? [],
    isFetching,
    error,
    refetch,
  }
}
