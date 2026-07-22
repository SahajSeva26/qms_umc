import { FiSearch } from 'react-icons/fi'
import { Input } from '@/components/ui/input'
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select'
import type { HqFilters } from '@/features/hq/components/hqmapping/hqFilters'

interface HqFilterBarProps {
  filters: HqFilters
  onChange: (patch: Partial<HqFilters>) => void
  companies: string[]
  states: string[]
  cities: string[]
  divisions: string[]
  deviceTypes: string[]
}

const STATUS_OPTIONS = ['ALL', 'GREEN', 'YELLOW', 'ORANGE', 'RED'] as const
const DISTANCE_OPTIONS: { value: HqFilters['distance']; label: string }[] = [
  { value: 'ALL', label: 'All distance' },
  { value: '<10', label: '< 10 KM' },
  { value: '10-35', label: '10-35 KM' },
  { value: '35-50', label: '35-50 KM' },
  { value: '>50', label: '> 50 KM' },
]

// Exact port of hq-serviceability.js's renderFilters()/bindFilters() — 7
// filters (search, company, state, city, division, device type, status,
// distance) + reset link.
const HqFilterBar = ({ filters, onChange, companies, states, cities, divisions, deviceTypes }: HqFilterBarProps) => (
  <div className="rounded-xl border p-2.5 mb-3" style={{ background: 'var(--qms-surface)', borderColor: 'var(--qms-border)' }}>
    <div className="flex flex-wrap items-center gap-2">
      <div className="relative flex-1 min-w-[220px]">
        <FiSearch size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2" style={{ color: 'var(--qms-text-muted)' }} />
        <Input
          value={filters.q}
          onChange={(e) => onChange({ q: e.target.value })}
          placeholder="Search HQ / company / city / FO…"
          className="pl-7"
        />
      </div>

      <Select value={filters.company} onValueChange={(v) => onChange({ company: v ?? 'ALL' })}>
        <SelectTrigger className="w-[150px]"><SelectValue placeholder="Company" /></SelectTrigger>
        <SelectContent>
          <SelectItem value="ALL">All companies</SelectItem>
          {companies.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
        </SelectContent>
      </Select>

      <Select value={filters.state} onValueChange={(v) => onChange({ state: v ?? 'ALL' })}>
        <SelectTrigger className="w-[130px]"><SelectValue placeholder="State" /></SelectTrigger>
        <SelectContent>
          <SelectItem value="ALL">All states</SelectItem>
          {states.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
        </SelectContent>
      </Select>

      <Select value={filters.city} onValueChange={(v) => onChange({ city: v ?? 'ALL' })}>
        <SelectTrigger className="w-[140px]"><SelectValue placeholder="City" /></SelectTrigger>
        <SelectContent>
          <SelectItem value="ALL">All cities</SelectItem>
          {cities.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
        </SelectContent>
      </Select>

      <Select value={filters.division} onValueChange={(v) => onChange({ division: v ?? 'ALL' })}>
        <SelectTrigger className="w-[150px]"><SelectValue placeholder="Division" /></SelectTrigger>
        <SelectContent>
          <SelectItem value="ALL">All divisions</SelectItem>
          {divisions.map((d) => <SelectItem key={d} value={d}>{d}</SelectItem>)}
        </SelectContent>
      </Select>

      <Select value={filters.deviceType} onValueChange={(v) => onChange({ deviceType: v ?? 'ALL' })}>
        <SelectTrigger className="w-[160px]"><SelectValue placeholder="Device type" /></SelectTrigger>
        <SelectContent>
          <SelectItem value="ALL">All device types</SelectItem>
          {deviceTypes.map((d) => <SelectItem key={d} value={d}>{d}</SelectItem>)}
        </SelectContent>
      </Select>

      <Select value={filters.status} onValueChange={(v) => onChange({ status: (v as HqFilters['status']) ?? 'ALL' })}>
        <SelectTrigger className="w-[130px]"><SelectValue placeholder="Status" /></SelectTrigger>
        <SelectContent>
          {STATUS_OPTIONS.map((s) => <SelectItem key={s} value={s}>{s === 'ALL' ? 'All statuses' : s}</SelectItem>)}
        </SelectContent>
      </Select>

      <Select value={filters.distance} onValueChange={(v) => onChange({ distance: (v as HqFilters['distance']) ?? 'ALL' })}>
        <SelectTrigger className="w-[130px]"><SelectValue placeholder="Distance" /></SelectTrigger>
        <SelectContent>
          {DISTANCE_OPTIONS.map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
        </SelectContent>
      </Select>

      <button
        onClick={() => onChange({ ...structuredCloneFilters() })}
        className="text-[11px] font-bold underline shrink-0"
        style={{ color: 'var(--qms-text-muted)' }}
      >
        Reset
      </button>
    </div>
  </div>
)

// Kept as a tiny local helper (rather than importing EMPTY_HQ_FILTERS
// directly into the onChange callback above) so the Reset button's intent —
// "restore every filter to its default" — reads clearly at the call site.
function structuredCloneFilters(): HqFilters {
  return { company: 'ALL', state: 'ALL', city: 'ALL', division: 'ALL', status: 'ALL', deviceType: 'ALL', distance: 'ALL', q: '' }
}

export default HqFilterBar
