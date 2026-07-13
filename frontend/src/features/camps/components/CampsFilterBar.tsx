import { FiSearch } from 'react-icons/fi'
import { Button } from '@/components/ui/button'
import DatePicker from '@/components/ui/DatePicker'
import { Input } from '@/components/ui/input'
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select'
import { CAMP_STATUSES, CAMP_TYPES, DOCTORS } from '@/features/camps/camps.mock'
import { CLIENT_NAMES, FO_NAMES } from '@/features/camps/camps.refs'
import type { CampsFilterState } from '@/features/camps/hooks/useCampsFilters'

interface CampsFilterBarProps {
  filters: CampsFilterState
  setFilter: <K extends keyof CampsFilterState>(key: K, value: CampsFilterState[K]) => void
  reset: () => void
}

const CampsFilterBar = ({ filters, setFilter, reset }: CampsFilterBarProps) => (
  <div
    className="sticky top-0 z-20 flex flex-wrap items-center gap-2 p-2.5 mb-3 rounded-xl border backdrop-blur-xl"
    style={{ background: 'var(--qms-surface)', borderColor: 'var(--qms-border)' }}
  >
    <DatePicker value={filters.from} onChange={(iso) => setFilter('from', iso)} placeholder="From date" className="text-[12px]" />
    <DatePicker value={filters.to} onChange={(iso) => setFilter('to', iso)} placeholder="To date" className="text-[12px]" />

    <Select value={filters.status} onValueChange={(v) => setFilter('status', v as string)}>
      <SelectTrigger className="text-[12px]"><SelectValue placeholder="All statuses" /></SelectTrigger>
      <SelectContent>
        <SelectItem value="ALL">All statuses</SelectItem>
        {CAMP_STATUSES.map((s) => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
      </SelectContent>
    </Select>

    <Select value={filters.type} onValueChange={(v) => setFilter('type', v as string)}>
      <SelectTrigger className="text-[12px]"><SelectValue placeholder="All types" /></SelectTrigger>
      <SelectContent>
        <SelectItem value="ALL">All types</SelectItem>
        {CAMP_TYPES.map((t) => <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>)}
      </SelectContent>
    </Select>

    <Select value={filters.client} onValueChange={(v) => setFilter('client', v as string)}>
      <SelectTrigger className="text-[12px]"><SelectValue placeholder="All companies" /></SelectTrigger>
      <SelectContent>
        <SelectItem value="ALL">All companies</SelectItem>
        {Object.entries(CLIENT_NAMES).map(([id, name]) => <SelectItem key={id} value={id}>{name}</SelectItem>)}
      </SelectContent>
    </Select>

    <Select value={filters.doctor} onValueChange={(v) => setFilter('doctor', v as string)}>
      <SelectTrigger className="text-[12px]"><SelectValue placeholder="All doctors" /></SelectTrigger>
      <SelectContent>
        <SelectItem value="ALL">All doctors</SelectItem>
        {DOCTORS.map((d) => <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>)}
      </SelectContent>
    </Select>

    <Select value={filters.fo} onValueChange={(v) => setFilter('fo', v as string)}>
      <SelectTrigger className="text-[12px]"><SelectValue placeholder="All FOs" /></SelectTrigger>
      <SelectContent>
        <SelectItem value="ALL">All FOs</SelectItem>
        <SelectItem value="__none__">— UNASSIGNED —</SelectItem>
        {Object.entries(FO_NAMES).map(([id, name]) => <SelectItem key={id} value={id}>{name}</SelectItem>)}
      </SelectContent>
    </Select>

    <div className="relative">
      <FiSearch size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2" style={{ color: 'var(--qms-text-muted)' }} />
      <Input
        type="text"
        value={filters.search}
        onChange={(e) => setFilter('search', e.target.value)}
        placeholder="Search camp ID, city, doctor..."
        className="w-56 pl-7 text-[12px]"
      />
    </div>

    <Button variant="outline" size="sm" onClick={reset}>
      Reset
    </Button>
  </div>
)

export default CampsFilterBar
