import { FiSearch } from 'react-icons/fi'
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { STAGES, LOST_STAGE, THERAPIES, OWNERS } from '@/features/crm/crm.mock'
import type { CrmFilterState } from '@/features/crm/hooks/useCrmFilters'

interface CrmFilterBarProps {
  filters: CrmFilterState
  setFilter: <K extends keyof CrmFilterState>(key: K, value: CrmFilterState[K]) => void
  reset: () => void
}

// The filter state uses '' for "all", but empty-string SelectItem values are
// disallowed — map '' <-> the 'ALL' sentinel at the Select boundary.
const CrmFilterBar = ({ filters, setFilter, reset }: CrmFilterBarProps) => (
  <div
    className="flex flex-wrap items-center gap-2 p-2.5 mb-3 rounded-xl border"
    style={{ background: 'var(--qms-surface)', borderColor: 'var(--qms-border)' }}
  >
    <Select value={filters.stage || 'ALL'} onValueChange={(v) => setFilter('stage', (v as string) === 'ALL' ? '' : (v as string))}>
      <SelectTrigger className="text-[12px]"><SelectValue placeholder="All stages" /></SelectTrigger>
      <SelectContent>
        <SelectItem value="ALL">All stages</SelectItem>
        {[...STAGES, LOST_STAGE].map((s) => (
          <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
        ))}
      </SelectContent>
    </Select>

    <Select value={filters.therapy || 'ALL'} onValueChange={(v) => setFilter('therapy', (v as string) === 'ALL' ? '' : (v as string))}>
      <SelectTrigger className="text-[12px]"><SelectValue placeholder="All therapies" /></SelectTrigger>
      <SelectContent>
        <SelectItem value="ALL">All therapies</SelectItem>
        {THERAPIES.map((t) => (
          <SelectItem key={t} value={t}>{t}</SelectItem>
        ))}
      </SelectContent>
    </Select>

    <Select value={filters.owner || 'ALL'} onValueChange={(v) => setFilter('owner', (v as string) === 'ALL' ? '' : (v as string))}>
      <SelectTrigger className="text-[12px]"><SelectValue placeholder="All owners" /></SelectTrigger>
      <SelectContent>
        <SelectItem value="ALL">All owners</SelectItem>
        {OWNERS.map((o) => (
          <SelectItem key={o.name} value={o.name}>{o.name}</SelectItem>
        ))}
      </SelectContent>
    </Select>

    <div className="relative w-56">
      <FiSearch size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 z-10" style={{ color: 'var(--qms-text-muted)' }} />
      <Input
        type="text"
        value={filters.q}
        onChange={(e) => setFilter('q', e.target.value)}
        placeholder="Search account, contact, ID..."
        className="pl-7 text-[12px]"
      />
    </div>

    <Button variant="outline" size="sm" onClick={reset}>Reset</Button>
  </div>
)

export default CrmFilterBar
