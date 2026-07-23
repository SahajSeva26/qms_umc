import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import type { GeoProfilesFilterState } from '@/features/geo-profile/hooks/useGeoProfilesFilters'
import type { GeoProfileStatus, GeoProfileType } from '@/types/geoProfile.types'

const TYPE_OPTIONS: { value: GeoProfileType; label: string }[] = [
  { value: 'fo', label: 'Field Officer' },
  { value: 'dietitian', label: 'Dietitian' },
]
const TYPE_LABEL_BY_VALUE = new Map(TYPE_OPTIONS.map((t) => [t.value, t.label]))

const STATUS_OPTIONS: { value: GeoProfileStatus; label: string }[] = [
  { value: 'active', label: 'Active' },
  { value: 'inactive', label: 'Inactive' },
]
const STATUS_LABEL_BY_VALUE = new Map(STATUS_OPTIONS.map((s) => [s.value, s.label]))

interface GeoProfilesFilterBarProps {
  filters: GeoProfilesFilterState
  setFilter: <K extends keyof GeoProfilesFilterState>(key: K, value: GeoProfilesFilterState[K]) => void
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
      <Select value={filters.type} onValueChange={(v) => setFilter('type', (v ?? 'ALL') as GeoProfilesFilterState['type'])}>
        <SelectTrigger className="text-[12px]">
          <SelectValue>{(v: string) => (v === 'ALL' ? 'Type' : (TYPE_LABEL_BY_VALUE.get(v as GeoProfileType) ?? 'Type'))}</SelectValue>
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="ALL">All</SelectItem>
          {TYPE_OPTIONS.map((t) => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
        </SelectContent>
      </Select>

      <Select value={filters.status} onValueChange={(v) => setFilter('status', (v ?? 'ALL') as GeoProfilesFilterState['status'])}>
        <SelectTrigger className="text-[12px]">
          <SelectValue>{(v: string) => (v === 'ALL' ? 'Status' : (STATUS_LABEL_BY_VALUE.get(v as GeoProfileStatus) ?? 'Status'))}</SelectValue>
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="ALL">All</SelectItem>
          {STATUS_OPTIONS.map((s) => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
        </SelectContent>
      </Select>

      <Button variant="outline" size="sm" onClick={reset}>
        Reset
      </Button>
    </div>
  )
}

export default GeoProfilesFilterBar
