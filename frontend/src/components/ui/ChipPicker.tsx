import { useState } from 'react'
import { FiX } from 'react-icons/fi'
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select'

interface ChipPickerProps {
  options: string[]
  selected: string[]
  onChange: (next: string[]) => void
  placeholder?: string
}

const ChipPicker = ({ options, selected, onChange, placeholder }: ChipPickerProps) => {
  // Controlled reset: adding a chip clears the Select back to '' so the
  // trigger shows the placeholder again ('' is only invalid for items).
  const [pending, setPending] = useState('')
  const available = options.filter((o) => !selected.includes(o))

  return (
    <div>
      <Select
        value={pending}
        onValueChange={(v) => {
          const next = v as string
          if (next) onChange([...selected, next])
          setPending('')
        }}
      >
        <SelectTrigger className="w-full text-[13px] mb-2">
          <SelectValue placeholder={placeholder ?? 'Select to add...'} />
        </SelectTrigger>
        <SelectContent>
          {available.map((o) => (
            <SelectItem key={o} value={o}>{o}</SelectItem>
          ))}
        </SelectContent>
      </Select>
      {selected.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {selected.map((s) => (
            <span
              key={s}
              className="inline-flex items-center gap-1 text-[12px] font-semibold px-3 py-1 rounded-full"
              style={{ background: 'var(--qms-brand)', color: '#fff', boxShadow: '0 1px 4px rgba(59,109,255,.25)' }}
            >
              {s}
              <button onClick={() => onChange(selected.filter((x) => x !== s))} aria-label={`Remove ${s}`}>
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
