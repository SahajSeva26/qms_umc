import { FiCalendar, FiClock, FiCheckCircle, FiXCircle } from 'react-icons/fi'
import KpiTile, { type KpiTone } from '@/components/ui/KpiTile'
import { APPOINTMENT_STATUS_LABEL } from '@/types/appointment.types'

const TILES = [
  { key: 'total' as const, label: 'Appointments', icon: FiCalendar, tone: 'brand' as KpiTone },
  { key: 'planned' as const, label: APPOINTMENT_STATUS_LABEL.planned, icon: FiClock, tone: 'amber' as KpiTone },
  { key: 'done' as const, label: APPOINTMENT_STATUS_LABEL.done, icon: FiCheckCircle, tone: 'teal' as KpiTone },
  { key: 'cancelled' as const, label: APPOINTMENT_STATUS_LABEL.cancelled, icon: FiXCircle, tone: 'rose' as KpiTone },
]

interface AppointmentKpiStripProps {
  kpis: { total: number; planned: number; done: number; cancelled: number }
}

const AppointmentKpiStrip = ({ kpis }: AppointmentKpiStripProps) => (
  <div data-testid="appointment-kpi-strip" className="grid gap-2.5 mb-4 grid-cols-4 max-[1100px]:grid-cols-2 max-[560px]:grid-cols-1">
    {TILES.map((tile) => (
      <KpiTile
        key={tile.key}
        label={tile.label}
        value={String(kpis[tile.key])}
        tone={tile.tone}
        icon={tile.icon}
      />
    ))}
  </div>
)

export default AppointmentKpiStrip
