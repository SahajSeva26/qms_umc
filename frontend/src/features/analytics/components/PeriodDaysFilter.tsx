import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select'

export interface PeriodDaysOption<T> {
  id: T
  label: string
}

interface PeriodDaysFilterProps<T extends string | number> {
  value: T
  onChange: (value: T) => void
  options: PeriodDaysOption<T>[]
}

// Shared by every dedicated Analytics page — just a period dropdown, no client filter or
// export/schedule placeholders. Each page supplies its own options since allowed periods differ.
function PeriodDaysFilter<T extends string | number>({ value, onChange, options }: PeriodDaysFilterProps<T>) {
  return (
    <div
      className="flex flex-wrap items-center gap-2 p-2.5 mb-4 rounded-xl border"
      style={{ background: 'var(--qms-surface)', borderColor: 'var(--qms-border)' }}
    >
      <Select value={String(value)} onValueChange={(v) => onChange((options.find((o) => String(o.id) === v)?.id ?? options[0].id))}>
        <SelectTrigger className="text-[12px]"><SelectValue /></SelectTrigger>
        <SelectContent>
          {options.map((o) => (
            <SelectItem key={String(o.id)} value={String(o.id)}>{o.label}</SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  )
}

export default PeriodDaysFilter
