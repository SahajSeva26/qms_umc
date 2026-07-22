import { FiCalendar } from 'react-icons/fi'

const CalendarView = () => (
  <div
    className="rounded-2xl border p-10 text-center"
    style={{ background: 'var(--qms-surface)', borderColor: 'var(--qms-border)' }}
  >
    <FiCalendar size={28} className="mx-auto mb-3" style={{ color: 'var(--qms-text-muted)' }} />
    <h3 className="text-sm font-bold mb-1" style={{ color: 'var(--qms-text)' }}>Sales Calendar</h3>
    <p className="text-[12px]" style={{ color: 'var(--qms-text-muted)' }}>Coming next.</p>
  </div>
)

export default CalendarView
