import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'

interface TimePickerProps {
  value: string
  onChange: (value: string) => void
  disabled?: boolean
}

const HOURS = Array.from({ length: 24 }, (_, h) => String(h).padStart(2, '0'))
const MINUTES = ['00', '15', '30', '45']

// shadcn Select for hour/minute instead of native <input type="time"> —
// avoids the native dropdown's unstyled/overflowing browser chrome. Stays a
// plain 'HH:mm' string in/out.
//
// alignItemWithTrigger={false} — SelectContent's default centers the
// selected item over the trigger, which for a short list floats the popup
// away from its own trigger instead of dropping directly below it.
export function TimePicker({ value, onChange, disabled }: TimePickerProps) {
  const [hour, minute] = value ? value.split(':') : ['', '']

  const setHour = (h: string | null) => onChange(`${h || '00'}:${minute || '00'}`)
  const setMinute = (m: string | null) => onChange(`${hour || '00'}:${m || '00'}`)

  return (
    <div className="flex items-center gap-1">
      <Select key={hour || 'empty'} value={hour || undefined} onValueChange={setHour} disabled={disabled}>
        <SelectTrigger className="w-full text-[13px]">
          <SelectValue placeholder="HH" />
        </SelectTrigger>
        <SelectContent className="max-h-48" alignItemWithTrigger={false}>
          {HOURS.map((h) => (
            <SelectItem key={h} value={h}>{h}</SelectItem>
          ))}
        </SelectContent>
      </Select>
      <span className="text-[13px]" style={{ color: 'var(--qms-text-muted)' }}>:</span>
      <Select key={minute || 'empty'} value={minute || undefined} onValueChange={setMinute} disabled={disabled}>
        <SelectTrigger className="w-full text-[13px]">
          <SelectValue placeholder="MM" />
        </SelectTrigger>
        <SelectContent className="max-h-48" alignItemWithTrigger={false}>
          {MINUTES.map((m) => (
            <SelectItem key={m} value={m}>{m}</SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  )
}
