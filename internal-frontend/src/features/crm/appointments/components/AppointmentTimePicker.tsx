import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import {
  fieldSelectContentClassName,
  fieldSelectContentStyle,
  fieldSelectTriggerClassName,
  fieldSelectTriggerStyle,
} from '@/features/crm/appointments/components/appointmentField.styles'

interface AppointmentTimePickerProps {
  value: string
  onChange: (value: string) => void
  disabled?: boolean
}

const HOURS = Array.from({ length: 24 }, (_, h) => String(h).padStart(2, '0'))
const MINUTES = ['00', '15', '30', '45']

// Appointments-local copy of the shared TimePicker (components/ui/TimePicker.tsx), which has
// no className/style prop to override — see appointmentField.styles.ts for why this form gets
// its own field-styling layer instead of changing the shared component.
export function AppointmentTimePicker({ value, onChange, disabled }: AppointmentTimePickerProps) {
  const [hour, minute] = value ? value.split(':') : ['', '']

  const setHour = (h: string | null) => onChange(`${h || '00'}:${minute || '00'}`)
  const setMinute = (m: string | null) => onChange(`${hour || '00'}:${m || '00'}`)

  return (
    <div className="flex items-center gap-1.5">
      <Select key={hour || 'empty'} value={hour || undefined} onValueChange={setHour} disabled={disabled}>
        <SelectTrigger className={fieldSelectTriggerClassName} style={fieldSelectTriggerStyle}>
          <SelectValue placeholder="HH" />
        </SelectTrigger>
        <SelectContent className={`max-h-48 ${fieldSelectContentClassName}`} style={fieldSelectContentStyle} alignItemWithTrigger={false}>
          {HOURS.map((h) => (
            <SelectItem key={h} value={h}>{h}</SelectItem>
          ))}
        </SelectContent>
      </Select>
      <span className="text-[14px]" style={{ color: 'var(--qms-text-muted)' }}>:</span>
      <Select key={minute || 'empty'} value={minute || undefined} onValueChange={setMinute} disabled={disabled}>
        <SelectTrigger className={fieldSelectTriggerClassName} style={fieldSelectTriggerStyle}>
          <SelectValue placeholder="MM" />
        </SelectTrigger>
        <SelectContent className={`max-h-48 ${fieldSelectContentClassName}`} style={fieldSelectContentStyle} alignItemWithTrigger={false}>
          {MINUTES.map((m) => (
            <SelectItem key={m} value={m}>{m}</SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  )
}
