import { useState } from 'react'
import { format } from 'date-fns'
import { FiCalendar, FiX } from 'react-icons/fi'
import { Calendar } from '@/components/ui/calendar'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { cn } from '@/lib/utils'

interface DatePickerProps {
  /** ISO date string (YYYY-MM-DD) or empty string for unset */
  value: string
  onChange: (isoDate: string) => void
  placeholder?: string
  className?: string
  disabled?: boolean
  /** Earliest selectable month — defaults to a DOB-style 120-years-back range. */
  startMonth?: Date
  /** Latest selectable month — defaults to the current month. */
  endMonth?: Date
}

const DEFAULT_START_MONTH = new Date(new Date().getFullYear() - 120, 0)
const DEFAULT_END_MONTH = new Date()

// Shared date picker — shadcn Popover + Calendar composition. Value in/out is
// an ISO YYYY-MM-DD string to match how dates are stored across the mocks.
const DatePicker = ({ value, onChange, placeholder = 'Pick a date', className, disabled, startMonth, endMonth }: DatePickerProps) => {
  const [open, setOpen] = useState(false)
  const selected = value ? new Date(`${value}T00:00:00`) : undefined

  return (
    <Popover open={open} onOpenChange={setOpen}>
      {/* Must not shrink-wrap, or it undoes className's width (e.g. w-full) on the trigger inside. */}
      <div className="relative">
        <PopoverTrigger
          disabled={disabled}
          className={cn(
            'flex items-center gap-2 h-8 rounded-lg border border-input bg-transparent px-2.5 text-sm outline-none transition-colors select-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-50',
            !value && 'text-muted-foreground',
            value && !disabled && 'pr-7',
            className
          )}
        >
          <FiCalendar size={13} className="shrink-0 text-muted-foreground" />
          {selected ? format(selected, 'dd MMM yyyy') : placeholder}
        </PopoverTrigger>
        {value && !disabled && (
          <button
            type="button"
            aria-label="Clear date"
            onClick={(e) => { e.stopPropagation(); onChange('') }}
            className="absolute right-1.5 top-1/2 -translate-y-1/2 rounded-sm p-0.5 text-muted-foreground outline-none hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring/50"
          >
            <FiX size={12} />
          </button>
        )}
      </div>
      <PopoverContent className="w-auto p-0">
        <Calendar
          mode="single"
          selected={selected}
          captionLayout="dropdown"
          // react-day-picker's dropdown defaults to a narrow window otherwise.
          startMonth={startMonth ?? DEFAULT_START_MONTH}
          endMonth={endMonth ?? DEFAULT_END_MONTH}
          onSelect={(date) => {
            onChange(date ? format(date, 'yyyy-MM-dd') : '')
            setOpen(false)
          }}
        />
      </PopoverContent>
    </Popover>
  )
}

export default DatePicker
