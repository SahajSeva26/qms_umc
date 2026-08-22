import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import type { GeoProfilesFilterState } from '@/features/geo-profile/hooks/useGeoProfilesFilters'
import {
  GEO_PROFILE_TYPE_OPTIONS,
  GEO_PROFILE_TYPE_LABEL,
  GEO_PROFILE_STATUS_OPTIONS,
  GEO_PROFILE_STATUS_LABEL,
} from '@/features/geo-profile/geoProfile.constants'
import type { GeoProfileStatus, GeoProfileType } from '@/features/geo-profile/geoProfile.types'

interface GeoProfilesFilterBarProps {
  filters: GeoProfilesFilterState
  setFilter: <K extends keyof GeoProfilesFilterState>(key: K, value: string | null | undefined) => void
  reset: () => void
}

// Mirrors `@/features/access-management/role/components/RolesFilterBar.tsx`'s
// convention exactly (trigger shows the dimension name at "ALL", the picked
// label otherwise). No search/city/state filters — SearchGeoProfileQuerySchema
// only supports type/role/status/page/limit; role is picked via the detail
// page, not filtered by free text here.
const GeoProfilesFilterBar = ({ filters, setFilter, reset }: GeoProfilesFilterBarProps) => {
  return (
    <div
      className="flex flex-wrap items-center gap-2 p-2.5 mb-3 rounded-xl border"
      style={{ background: 'var(--qms-surface)', borderColor: 'var(--qms-border)' }}
    >
      <Select value={filters.type} onValueChange={(v) => setFilter('type', v)}>
        <SelectTrigger className="text-[12px]">
          <SelectValue>{(v: string) => (v === 'ALL' ? 'Type' : (GEO_PROFILE_TYPE_LABEL[v as GeoProfileType] ?? 'Type'))}</SelectValue>
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="ALL">All</SelectItem>
          {GEO_PROFILE_TYPE_OPTIONS.map((t) => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
        </SelectContent>
      </Select>

      <Select value={filters.status} onValueChange={(v) => setFilter('status', v)}>
        <SelectTrigger className="text-[12px]">
          <SelectValue>{(v: string) => (v === 'ALL' ? 'Status' : (GEO_PROFILE_STATUS_LABEL[v as GeoProfileStatus] ?? 'Status'))}</SelectValue>
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="ALL">All</SelectItem>
          {GEO_PROFILE_STATUS_OPTIONS.map((s) => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
        </SelectContent>
      </Select>

      <Button variant="outline" size="sm" onClick={reset}>
        Reset
      </Button>
    </div>
  )
}

export default GeoProfilesFilterBar
