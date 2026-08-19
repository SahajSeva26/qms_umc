import SearchInput from '@/components/ui/SearchInput'
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select'
import { EMPTY_HQ_FILTERS, type HqFilters } from '@/features/hq/components/hqmapping/hqFilters'
import { HQ_CARD_STYLE } from '@/features/hq/components/hqmapping/hq.ui'

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

const HqFilterBar = ({ filters, onChange, companies, states, cities, divisions, deviceTypes }: HqFilterBarProps) => (
  <div className="rounded-xl border p-2.5 mb-3" style={HQ_CARD_STYLE}>
    <div className="flex flex-wrap items-center justify-between gap-2">
      <SearchInput
        value={filters.q}
        onChange={(v) => onChange({ q: v })}
        placeholder="Search HQ / company / city / FO…"
        wrapperClassName="min-w-[220px]"
      />

      <div className="flex flex-wrap items-center gap-2">
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
          onClick={() => onChange({ ...EMPTY_HQ_FILTERS })}
          className="text-[11px] font-bold underline shrink-0"
          style={{ color: 'var(--qms-text-muted)' }}
        >
          Reset
        </button>
      </div>
    </div>
  </div>
)

export default HqFilterBar
