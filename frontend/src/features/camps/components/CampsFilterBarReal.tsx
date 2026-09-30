import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import SearchInput from '@/components/ui/SearchInput'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import type { CampsRealFilterState } from '@/features/camps/hooks/useCampsRealFilters'
import type { BillingType, CampStatus, CampType } from '@/types/campReal.types'
import { CAMP_STATUS_LABEL } from '@/features/camps/components/CampStatusPillReal'

const STATUS_OPTIONS: CampStatus[] = ['requested', 'confirmed', 'live', 'closed', 'cancelled', 'cancelled_charged']

const TYPE_OPTIONS: { value: CampType; label: string }[] = [
  { value: 'screening', label: 'Screening' },
  { value: 'diet', label: 'Diet' },
  { value: 'lab', label: 'Lab' },
]

const BILLING_OPTIONS: { value: BillingType; label: string }[] = [
  { value: 'billable', label: 'Billable' },
  { value: 'void', label: 'Void' },
]

interface CampsFilterBarRealProps {
  filters: CampsRealFilterState
  setFilter: <K extends keyof CampsRealFilterState>(key: K, value: CampsRealFilterState[K]) => void
  reset: () => void
  // Set by pages already scoped to a single fixed type (e.g. Screening/Diet).
  hideType?: boolean
}

// project/division/doctor/fo are also real query params but are ObjectId-based
// and left out of this quick filter bar — no picker UI for them yet.
//
// Matches the prototype's .filterbar sizing (camps.js:265-305, styles.css:973-985); applied
// per-instance rather than changing the shared Input/Select components.
const FIELD_CLASS = 'h-auto rounded-lg px-2.5 py-1.5 text-[12px]'

const CampsFilterBarReal = ({ filters, setFilter, reset, hideType = false }: CampsFilterBarRealProps) => {
  return (
    <div
      className="flex flex-wrap items-center gap-2 px-3 py-2.5 mb-3 rounded-[14px] border"
      style={{ background: 'var(--qms-surface)', borderColor: 'var(--qms-border)' }}
    >
      <span className="text-[12px] font-semibold shrink-0" style={{ color: 'var(--qms-text-muted)' }}>Filters</span>

      <Input
        type="date"
        value={filters.dateFrom}
        onChange={(e) => setFilter('dateFrom', e.target.value)}
        className={`w-36 ${FIELD_CLASS}`}
      />
      <Input
        type="date"
        value={filters.dateTo}
        onChange={(e) => setFilter('dateTo', e.target.value)}
        className={`w-36 ${FIELD_CLASS}`}
      />

      <Select value={filters.status} onValueChange={(v) => setFilter('status', (v ?? 'ALL') as CampsRealFilterState['status'])}>
        <SelectTrigger className={FIELD_CLASS}>
          <SelectValue>{(v: string) => (v === 'ALL' ? 'Status' : (CAMP_STATUS_LABEL[v as CampStatus] ?? 'Status'))}</SelectValue>
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="ALL">All</SelectItem>
          {STATUS_OPTIONS.map((s) => <SelectItem key={s} value={s}>{CAMP_STATUS_LABEL[s]}</SelectItem>)}
        </SelectContent>
      </Select>

      {!hideType && (
        <Select value={filters.type} onValueChange={(v) => setFilter('type', (v ?? 'ALL') as CampsRealFilterState['type'])}>
          <SelectTrigger className={FIELD_CLASS}>
            <SelectValue>{(v: string) => (v === 'ALL' ? 'Type' : (TYPE_OPTIONS.find((t) => t.value === v)?.label ?? 'Type'))}</SelectValue>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">All</SelectItem>
            {TYPE_OPTIONS.map((t) => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
          </SelectContent>
        </Select>
      )}

      <Select value={filters.billingType} onValueChange={(v) => setFilter('billingType', (v ?? 'ALL') as CampsRealFilterState['billingType'])}>
        <SelectTrigger className={FIELD_CLASS}>
          <SelectValue>{(v: string) => (v === 'ALL' ? 'Billing' : (BILLING_OPTIONS.find((b) => b.value === v)?.label ?? 'Billing'))}</SelectValue>
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="ALL">All</SelectItem>
          {BILLING_OPTIONS.map((b) => <SelectItem key={b.value} value={b.value}>{b.label}</SelectItem>)}
        </SelectContent>
      </Select>

      <Input
        type="text"
        value={filters.state}
        onChange={(e) => setFilter('state', e.target.value)}
        placeholder="State..."
        className={`w-28 ${FIELD_CLASS}`}
      />

      {/* Prototype's search matches camp ID/doctor/city/client (camps.js:168-172) — ours matches
          code + city (both real backend filters); doctor/client name have no free-text match on
          SearchCampQuerySchema (only id-based filters), so those aren't offered here. */}
      <SearchInput
        value={filters.code}
        onChange={(v) => setFilter('code', v)}
        placeholder="Search by code..."
        className={`w-36 ${FIELD_CLASS}`}
      />
      <SearchInput
        value={filters.city}
        onChange={(v) => setFilter('city', v)}
        placeholder="Search by city..."
        className={`min-w-52 flex-1 ${FIELD_CLASS}`}
      />

      <Button variant="outline" size="sm" onClick={reset}>
        Reset
      </Button>
    </div>
  )
}

export default CampsFilterBarReal
