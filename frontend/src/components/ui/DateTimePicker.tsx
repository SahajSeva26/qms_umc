import { useState } from 'react'
import { format } from 'date-fns'
import { FiCalendar } from 'react-icons/fi'
import { Calendar } from '@/components/ui/calendar'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { cn } from '@/lib/utils'

interface DateTimePickerProps {
  /** 'YYYY-MM-DDTHH:mm' local value, or empty string for unset — same shape as <input type="datetime-local"> */
  value: string
  onChange: (value: string) => void
  placeholder?: string
  className?: string
}

const splitValue = (value: string) => {
  const [datePart, timePart] = value.split('T')
  return { datePart: datePart ?? '', timePart: timePart ?? '' }
}

// shadcn Calendar has no time component, so this pairs it with a plain time
// input inside the same popover — DatePicker.tsx's composition, extended for
// the one appointment reschedule field that needs date+time together.
const DateTimePicker = ({ value, onChange, placeholder = 'Pick date & time', className }: DateTimePickerProps) => {
  const [open, setOpen] = useState(false)
  const { datePart, timePart } = splitValue(value)
  const selected = datePart ? new Date(`${datePart}T00:00:00`) : undefined

  const combine = (nextDate: string, nextTime: string) => {
    if (!nextDate) return onChange('')
    onChange(`${nextDate}T${nextTime || '00:00'}`)
  }

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
        {selected ? `${format(selected, 'dd MMM yyyy')}${timePart ? `, ${timePart}` : ''}` : placeholder}
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0">
        <Calendar
          mode="single"
          selected={selected}
          onSelect={(date) => combine(date ? format(date, 'yyyy-MM-dd') : '', timePart)}
        />
        <div className="flex items-center gap-2 border-t p-2.5" style={{ borderColor: 'var(--qms-border)' }}>
          <span className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Time</span>
          <Input
            type="time"
            value={timePart}
            onChange={(e) => combine(datePart, e.target.value)}
            className="flex-1 text-[13px]"
          />
          <Button type="button" size="sm" onClick={() => setOpen(false)}>Done</Button>
        </div>
      </PopoverContent>
    </Popover>
  )
}

export default DateTimePicker
