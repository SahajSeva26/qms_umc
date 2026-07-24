import { FiSearch } from 'react-icons/fi'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
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
}

// Filters strictly what SearchCampQuerySchema actually accepts server-side:
// status, type, billingType, city/state (regex contains-match), and a
// dateFrom/dateTo range. project/division/doctor/fo are also real query
// params but are ObjectId-based and left out of the quick filter bar — no
// picker UI for them yet, matches this pass's scope of the core fields only.
const CampsFilterBarReal = ({ filters, setFilter, reset }: CampsFilterBarRealProps) => {
  return (
    <div
      className="flex flex-wrap items-center gap-2 p-2.5 mb-3 rounded-xl border"
      style={{ background: 'var(--qms-surface)', borderColor: 'var(--qms-border)' }}
    >
      <Select value={filters.status} onValueChange={(v) => setFilter('status', (v ?? 'ALL') as CampsRealFilterState['status'])}>
        <SelectTrigger className="text-[12px]">
          <SelectValue>{(v: string) => (v === 'ALL' ? 'Status' : (CAMP_STATUS_LABEL[v as CampStatus] ?? 'Status'))}</SelectValue>
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="ALL">All</SelectItem>
          {STATUS_OPTIONS.map((s) => <SelectItem key={s} value={s}>{CAMP_STATUS_LABEL[s]}</SelectItem>)}
        </SelectContent>
      </Select>

      <Select value={filters.type} onValueChange={(v) => setFilter('type', (v ?? 'ALL') as CampsRealFilterState['type'])}>
        <SelectTrigger className="text-[12px]">
          <SelectValue>{(v: string) => (v === 'ALL' ? 'Type' : (TYPE_OPTIONS.find((t) => t.value === v)?.label ?? 'Type'))}</SelectValue>
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="ALL">All</SelectItem>
          {TYPE_OPTIONS.map((t) => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
        </SelectContent>
      </Select>

      <Select value={filters.billingType} onValueChange={(v) => setFilter('billingType', (v ?? 'ALL') as CampsRealFilterState['billingType'])}>
        <SelectTrigger className="text-[12px]">
          <SelectValue>{(v: string) => (v === 'ALL' ? 'Billing' : (BILLING_OPTIONS.find((b) => b.value === v)?.label ?? 'Billing'))}</SelectValue>
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="ALL">All</SelectItem>
          {BILLING_OPTIONS.map((b) => <SelectItem key={b.value} value={b.value}>{b.label}</SelectItem>)}
        </SelectContent>
      </Select>

      <div className="relative">
        <FiSearch size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2" style={{ color: 'var(--qms-text-muted)' }} />
        <Input
          type="text"
          value={filters.city}
          onChange={(e) => setFilter('city', e.target.value)}
          placeholder="City..."
          className="w-32 pl-7 text-[12px]"
        />
      </div>

      <Input
        type="text"
        value={filters.state}
        onChange={(e) => setFilter('state', e.target.value)}
        placeholder="State..."
        className="w-32 text-[12px]"
      />

      <Input
        type="date"
        value={filters.dateFrom}
        onChange={(e) => setFilter('dateFrom', e.target.value)}
        className="w-36 text-[12px]"
      />
      <Input
        type="date"
        value={filters.dateTo}
        onChange={(e) => setFilter('dateTo', e.target.value)}
        className="w-36 text-[12px]"
      />

      <Button variant="outline" size="sm" onClick={reset}>
        Reset
      </Button>
    </div>
  )
}

export default CampsFilterBarReal
