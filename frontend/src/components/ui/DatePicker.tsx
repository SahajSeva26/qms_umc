import { useState } from 'react'
import { format } from 'date-fns'
import { FiCalendar } from 'react-icons/fi'
import { Calendar } from '@/components/ui/calendar'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { cn } from '@/lib/utils'

interface DatePickerProps {
  /** ISO date string (YYYY-MM-DD) or empty string for unset */
  value: string
  onChange: (isoDate: string) => void
  placeholder?: string
  className?: string
}

// Shared date picker — shadcn Popover + Calendar composition. Value in/out is
// an ISO YYYY-MM-DD string to match how dates are stored across the mocks.
const DatePicker = ({ value, onChange, placeholder = 'Pick a date', className }: DatePickerProps) => {
  const [open, setOpen] = useState(false)
  const selected = value ? new Date(`${value}T00:00:00`) : undefined

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        className={cn(
          'flex items-center gap-2 h-8 rounded-lg border border-input bg-transparent px-2.5 text-sm outline-none transition-colors select-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50',
          !value && 'text-muted-foreground',
          className
        )}
      >
        <FiCalendar size={13} className="shrink-0 text-muted-foreground" />
        {selected ? format(selected, 'dd MMM yyyy') : placeholder}
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0">
        <Calendar
          mode="single"
          selected={selected}
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
