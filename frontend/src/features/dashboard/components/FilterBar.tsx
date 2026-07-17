import { FILTERS } from '@/features/dashboard/dashboard.mock'
import type { DashboardFilterState } from '@/features/dashboard/hooks/useDashboardFilters'
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select'
import { Button } from '@/components/ui/button'

interface FilterBarProps {
  filters: DashboardFilterState
  setFilter: <K extends keyof DashboardFilterState>(key: K, value: DashboardFilterState[K]) => void
  reset: () => void
}

const DATE_RANGE_ITEMS = FILTERS.dateRanges.map((r) => ({ value: r.id, label: r.label }))

const FilterBar = ({ filters, setFilter, reset }: FilterBarProps) => {
  return (
    <div
      className="sticky top-0 z-20 flex flex-wrap items-center gap-2 p-2.5 mb-3 rounded-xl border backdrop-blur-xl"
      style={{ background: 'var(--qms-surface)', borderColor: 'var(--qms-border)' }}
    >
      <Select
        items={DATE_RANGE_ITEMS}
        value={filters.dateRange}
        onValueChange={(v) => setFilter('dateRange', v as string)}
      >
        <SelectTrigger className="text-[12px]"><SelectValue placeholder="Date range" /></SelectTrigger>
        <SelectContent>
          {DATE_RANGE_ITEMS.map((r) => <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>)}
        </SelectContent>
      </Select>

      <Select value={filters.client} onValueChange={(v) => setFilter('client', v as string)}>
        <SelectTrigger className="text-[12px]"><SelectValue placeholder="All clients" /></SelectTrigger>
        <SelectContent>
          {FILTERS.clients.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
        </SelectContent>
      </Select>

      <Select value={filters.division} onValueChange={(v) => setFilter('division', v as string)}>
        <SelectTrigger className="text-[12px]"><SelectValue placeholder="All divisions" /></SelectTrigger>
        <SelectContent>
          {FILTERS.divisions.map((d) => <SelectItem key={d} value={d}>{d}</SelectItem>)}
        </SelectContent>
      </Select>

      <Select value={filters.campType} onValueChange={(v) => setFilter('campType', v as string)}>
        <SelectTrigger className="text-[12px]"><SelectValue placeholder="All camp types" /></SelectTrigger>
        <SelectContent>
          {FILTERS.campTypes.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
        </SelectContent>
      </Select>

      <Select value={filters.rep} onValueChange={(v) => setFilter('rep', v as string)}>
        <SelectTrigger className="text-[12px]"><SelectValue placeholder="All reps" /></SelectTrigger>
        <SelectContent>
          {FILTERS.salesPeople.map((p) => <SelectItem key={p} value={p}>{p}</SelectItem>)}
        </SelectContent>
      </Select>

      <Button variant="outline" size="sm" onClick={reset}>Reset</Button>

      <div className="ml-auto flex items-center gap-2">
        <span className="text-[12px] font-semibold" style={{ color: 'var(--qms-text-muted)' }}>vs Last FY</span>
        <button
          onClick={() => setFilter('yoy', !filters.yoy)}
          className="w-9 h-5 rounded-full relative transition-all"
          style={{
            background: filters.yoy
              ? 'linear-gradient(135deg, var(--qms-brand), var(--qms-teal))'
              : 'var(--qms-surface-strong)',
            border: filters.yoy ? 'none' : '1px solid var(--qms-border-strong)',
          }}
          aria-label="Toggle year-over-year comparison"
        >
          <span
            className="absolute top-0.5 w-4 h-4 rounded-full bg-white transition-transform shadow-sm"
            style={{ transform: filters.yoy ? 'translateX(18px)' : 'translateX(2px)' }}
          />
        </button>
      </div>
    </div>
  )
}

export default FilterBar
