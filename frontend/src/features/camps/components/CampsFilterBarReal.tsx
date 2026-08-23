import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import SearchInput from '@/components/ui/SearchInput'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import type { CampsRealFilterState } from '@/features/camps/hooks/useCampsRealFilters'
import type { BillingType, CampStatus, CampType } from '@/features/camps/campReal.types'
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

// project/division/doctor/fo are also real query params but are ObjectId-based
// and left out of this quick filter bar — no picker UI for them yet.
const CampsFilterBarReal = ({ filters, setFilter, reset }: CampsFilterBarRealProps) => {
  return (
    <div
      className="flex flex-wrap items-center justify-between gap-2 p-2.5 mb-3 rounded-xl border"
      style={{ background: 'var(--qms-surface)', borderColor: 'var(--qms-border)' }}
    >
      <SearchInput
        value={filters.city}
        onChange={(v) => setFilter('city', v)}
        placeholder="City..."
        className="w-32 text-[12px]"
      />

      <div className="flex flex-wrap items-center gap-2">
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
    </div>
  )
}

export default CampsFilterBarReal
