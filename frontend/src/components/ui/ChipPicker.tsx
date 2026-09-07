import { useState } from 'react'
import { FiChevronDown, FiX } from 'react-icons/fi'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import SearchInput from '@/components/ui/SearchInput'
import { cn } from '@/lib/utils'

interface ChipPickerProps {
  options: string[]
  selected: string[]
  onChange: (next: string[]) => void
  placeholder?: string
  /** Display label for an option/selected value — defaults to the raw string itself (existing callers pass free-text values with no separate code/label split). */
  labelFor?: (value: string) => string
}

const ChipPicker = ({ options, selected, onChange, placeholder, labelFor }: ChipPickerProps) => {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const available = options.filter((o) => !selected.includes(o))
  const label = labelFor ?? ((v: string) => v)
  const visible = available.filter((o) => label(o).toLowerCase().includes(query.toLowerCase()))

  const add = (value: string) => {
    onChange([...selected, value])
    setQuery('')
  }

  return (
    <div>
      <Popover open={open} onOpenChange={(o) => { setOpen(o); if (!o) setQuery('') }}>
        <PopoverTrigger
          className={cn(
            'flex w-full items-center justify-between gap-1.5 h-8 rounded-lg border border-input bg-transparent px-2.5 text-[13px] outline-none transition-colors select-none mb-2',
            'text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50'
          )}
        >
          {placeholder ?? 'Select to add...'}
          <FiChevronDown size={14} className="shrink-0" />
        </PopoverTrigger>
        <PopoverContent align="start" className="w-(--anchor-width) p-1.5">
          <SearchInput value={query} onChange={setQuery} placeholder="Search..." className="h-8 text-[12px]" />
          <div className="mt-1.5 max-h-52 overflow-y-auto">
            {visible.length > 0 ? (
              visible.map((o) => (
                <button
                  key={o}
                  type="button"
                  onClick={() => add(o)}
                  className="w-full text-left rounded-md px-2 py-1.5 text-[13px] transition-colors hover:bg-accent hover:text-accent-foreground"
                >
                  {label(o)}
                </button>
              ))
            ) : (
              <p className="px-2 py-3 text-center text-[12px]" style={{ color: 'var(--qms-text-muted)' }}>No matches</p>
            )}
          </div>
        </PopoverContent>
      </Popover>
      {selected.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {selected.map((s) => (
            <span
              key={s}
              className="inline-flex items-center gap-1 text-[12px] font-semibold px-3 py-1 rounded-full"
              style={{ background: 'var(--qms-brand)', color: '#fff', boxShadow: '0 1px 4px rgba(59,109,255,.25)' }}
            >
              {label(s)}
              <button onClick={() => onChange(selected.filter((x) => x !== s))} aria-label={`Remove ${label(s)}`}>
                <FiX size={11} />
              </button>
            </span>
          ))}
        </div>
      )}
    </div>
  )
}

export default ChipPicker
