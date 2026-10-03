import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import SearchInput from '@/components/ui/SearchInput'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import DoctorAsyncPicker from '@/components/widgets/doctor/DoctorAsyncPicker'
import TenantAsyncPicker from '@/components/ui/TenantAsyncPicker'
import type { CampsRealFilterState } from '@/features/camps/hooks/useCampsRealFilters'
import type { BillingType, CampStatus, CampType } from '@/types/campReal.types'
import { CAMP_STATUS_LABEL } from '@/components/widgets/camp/campStatus.constants'

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
  // The `tenant` filter is only honored server-side for camp:manage (camp.service.ts) — hidden for anyone else.
  canFilterByClient?: boolean
}

const FIELD_CLASS = 'h-auto rounded-lg px-2.5 py-1.5 text-[12px]'

const CampsFilterBarReal = ({ filters, setFilter, reset, hideType = false, canFilterByClient = false }: CampsFilterBarRealProps) => {
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
        <DoctorAsyncPicker
          value={filters.doctorId}
          label={filters.doctorLabel}
          onChange={(id, l) => { setFilter('doctorId', id); setFilter('doctorLabel', l) }}
        />
      </div>
      {canFilterByClient && (
        <div className="w-48">
          <TenantAsyncPicker
            value={filters.clientId}
            label={filters.clientLabel}
            onChange={(id, l) => { setFilter('clientId', id); setFilter('clientLabel', l) }}
          />
        </div>
      )}

      <Button variant="outline" size="sm" onClick={reset}>
        Reset
      </Button>
    </div>
  )
}

export default CampsFilterBarReal
