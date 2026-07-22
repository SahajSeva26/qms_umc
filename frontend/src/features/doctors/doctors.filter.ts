import type { Doctor } from '@/features/doctors/doctors.types'
import type { DoctorFilters } from '@/features/doctors/components/DoctorFilterBar'

// visibleDoctors() — applies all 4 filters (specialty/city/band/search) as AND
// filters. Band filtering needs each doctor's already-computed band, so the
// caller passes it in via bandOf rather than this module recomputing engagement.
export function visibleDoctors(docs: Doctor[], filters: DoctorFilters, bandOf: (d: Doctor) => string): Doctor[] {
  const q = filters.search.trim().toLowerCase()
  return docs.filter((d) => {
    if (filters.specialty !== 'ALL' && (d.specialty || 'Others') !== filters.specialty) return false
    if (filters.city !== 'ALL' && d.city !== filters.city) return false
    if (filters.band !== 'ALL' && bandOf(d) !== filters.band) return false
    if (q) {
      const hay = `${d.name} ${d.code} ${d.email} ${d.phone} ${d.city}`.toLowerCase()
      if (!hay.includes(q)) return false
    }
    return true
  })
}
