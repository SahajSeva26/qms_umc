import type { Camp } from '@/types/camp.types'
import type { CampsFilterState } from '@/features/camps/hooks/useCampsFilters'
import { clientName } from '@/features/camps/camps.refs'
import { getDoctor } from '@/features/camps/camps.utils'

// Mirrors the prototype's inFilter() — every field here actually filters,
// unlike some of the dashboard's cosmetic-only filters.
export function matchesFilters(camp: Camp, filters: CampsFilterState): boolean {
  if (filters.from && camp.date < filters.from) return false
  if (filters.to && camp.date > filters.to) return false
  if (filters.status !== 'ALL' && camp.status !== filters.status) return false
  if (filters.type !== 'ALL' && camp.type !== filters.type) return false
  if (filters.client !== 'ALL' && camp.clientId !== filters.client) return false
  if (filters.doctor !== 'ALL' && camp.doctorId !== filters.doctor) return false
  if (filters.fo !== 'ALL') {
    if (filters.fo === '__none__') {
      if (camp.foId) return false
    } else if (camp.foId !== filters.fo) {
      return false
    }
  }
  if (filters.search) {
    const q = filters.search.toLowerCase()
    const doctor = getDoctor(camp.doctorId)
    const haystack = `${camp.id} ${camp.city} ${clientName(camp.clientId)} ${doctor?.name ?? ''}`.toLowerCase()
    if (!haystack.includes(q)) return false
  }
  return true
}
