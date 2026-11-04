import { Button, Input, Select, SelectContent, SelectItem, SelectTrigger, SelectValue, DatePicker } from '@qms/ui'
import SearchInput from '@/components/ui/SearchInput'
import CampDoctorAsyncPicker from '@/features/camps/components/CampDoctorAsyncPicker'
import type { CampManagementFilterState } from '@/features/camps/hooks/useCampManagementFilters'
import type { BillingType, CampStatus, CampType } from '@/types/campReal.types'
import { CAMP_SCHEDULE_STATUS_PILL_LABEL } from '@/features/camps/campDashboardStatus'

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

interface CampManagementFilterBarProps {
  filters: CampManagementFilterState
  setFilter: <K extends keyof CampManagementFilterState>(key: K, value: CampManagementFilterState[K]) => void
  reset: () => void
}

const FIELD_CLASS = 'h-auto rounded-lg px-2.5 py-1.5 text-[12px]'

// Navigation range only, not a business rule — camps can be filtered by date far outside "now".
const FILTER_DATE_START_MONTH = new Date(new Date().getFullYear() - 10, 0)
const FILTER_DATE_END_MONTH = new Date(new Date().getFullYear() + 10, 11)

// Ported from internal-frontend's CampsFilterBarReal.tsx, trimmed: no tenant/client picker (that
// filter is camp:manage-only server-side; no pharma role type holds it).
const CampManagementFilterBar = ({ filters, setFilter, reset }: CampManagementFilterBarProps) => {
  return (
    <div
      className="flex flex-wrap items-center gap-2 px-3 py-2.5 mb-3 rounded-[14px] border"
      style={{ background: 'var(--qms-surface)', borderColor: 'var(--qms-border)' }}
    >
      <span className="text-[12px] font-semibold shrink-0" style={{ color: 'var(--qms-text-muted)' }}>Filters</span>

      <DatePicker
        value={filters.dateFrom}
        onChange={(v) => setFilter('dateFrom', v)}
        placeholder="Date from"
        className={`w-36 ${FIELD_CLASS}`}
        startMonth={FILTER_DATE_START_MONTH}
        endMonth={FILTER_DATE_END_MONTH}
      />
      <DatePicker
        value={filters.dateTo}
        onChange={(v) => setFilter('dateTo', v)}
        placeholder="Date to"
        className={`w-36 ${FIELD_CLASS}`}
        startMonth={FILTER_DATE_START_MONTH}
        endMonth={FILTER_DATE_END_MONTH}
      />

      <Select value={filters.status} onValueChange={(v) => setFilter('status', (v ?? 'ALL') as CampManagementFilterState['status'])}>
        <SelectTrigger className={FIELD_CLASS}>
          <SelectValue>{(v: string) => (v === 'ALL' ? 'Status' : (CAMP_SCHEDULE_STATUS_PILL_LABEL[v as CampStatus] ?? 'Status'))}</SelectValue>
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="ALL">All</SelectItem>
          {STATUS_OPTIONS.map((s) => <SelectItem key={s} value={s}>{CAMP_SCHEDULE_STATUS_PILL_LABEL[s]}</SelectItem>)}
        </SelectContent>
      </Select>

      <Select value={filters.type} onValueChange={(v) => setFilter('type', (v ?? 'ALL') as CampManagementFilterState['type'])}>
        <SelectTrigger className={FIELD_CLASS}>
          <SelectValue>{(v: string) => (v === 'ALL' ? 'Type' : (TYPE_OPTIONS.find((t) => t.value === v)?.label ?? 'Type'))}</SelectValue>
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="ALL">All</SelectItem>
          {TYPE_OPTIONS.map((t) => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
        </SelectContent>
      </Select>

      <Select value={filters.billingType} onValueChange={(v) => setFilter('billingType', (v ?? 'ALL') as CampManagementFilterState['billingType'])}>
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
        className={`min-w-40 flex-1 ${FIELD_CLASS}`}
      />
      <div className="w-48">
        <CampDoctorAsyncPicker
          value={filters.doctorId}
          label={filters.doctorLabel}
          onChange={(id, l) => { setFilter('doctorId', id); setFilter('doctorLabel', l) }}
        />
      </div>

      <Button variant="outline" size="sm" onClick={reset}>
        Reset
      </Button>
    </div>
  )
}

export default CampManagementFilterBar
