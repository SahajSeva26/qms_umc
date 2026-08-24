import CampStatusPillReal from '@/features/camps/components/CampStatusPillReal'
import type { CampEntity, CampPopulatedDoctor, CampPopulatedRole } from '@/types/campReal.types'

interface PharmaCampTableProps {
  camps: CampEntity[]
}

const doctorName = (doctor: CampEntity['doctor']) =>
  doctor && typeof doctor !== 'string' ? (doctor as CampPopulatedDoctor).name : (doctor ?? '—')

const mrName = (mr: CampEntity['mr']) =>
  mr && typeof mr !== 'string' ? (mr as CampPopulatedRole).name : (mr ?? '—')

const PharmaCampTable = ({ camps }: PharmaCampTableProps) => (
  <div
    className="rounded-xl border overflow-hidden"
    style={{ borderColor: 'var(--qms-border)', background: 'var(--qms-surface-card)' }}
  >
    <div className="overflow-x-auto">
      <table className="w-full text-[13px]">
        <thead>
          <tr style={{ borderBottom: '1px solid var(--qms-border)' }}>
            <th className="text-left font-bold text-[11px] uppercase tracking-wider px-4 py-2.5" style={{ color: 'var(--qms-text-muted)' }}>Code</th>
            <th className="text-left font-bold text-[11px] uppercase tracking-wider px-4 py-2.5" style={{ color: 'var(--qms-text-muted)' }}>Doctor</th>
            <th className="text-left font-bold text-[11px] uppercase tracking-wider px-4 py-2.5" style={{ color: 'var(--qms-text-muted)' }}>Date</th>
            <th className="text-left font-bold text-[11px] uppercase tracking-wider px-4 py-2.5" style={{ color: 'var(--qms-text-muted)' }}>Time</th>
            <th className="text-left font-bold text-[11px] uppercase tracking-wider px-4 py-2.5" style={{ color: 'var(--qms-text-muted)' }}>Location</th>
            <th className="text-left font-bold text-[11px] uppercase tracking-wider px-4 py-2.5" style={{ color: 'var(--qms-text-muted)' }}>MR</th>
            <th className="text-left font-bold text-[11px] uppercase tracking-wider px-4 py-2.5" style={{ color: 'var(--qms-text-muted)' }}>Status</th>
          </tr>
        </thead>
        <tbody>
          {camps.map((camp) => (
            <tr key={camp.id} style={{ borderBottom: '1px solid var(--qms-border)' }}>
              <td className="px-4 py-2.5 font-mono" style={{ color: 'var(--qms-text)' }}>{camp.code}</td>
              <td className="px-4 py-2.5" style={{ color: 'var(--qms-text)' }}>{doctorName(camp.doctor)}</td>
              <td className="px-4 py-2.5" style={{ color: 'var(--qms-text)' }}>{new Date(camp.date).toLocaleDateString()}</td>
              <td className="px-4 py-2.5" style={{ color: 'var(--qms-text-muted)' }}>
                {camp.timeSlot ? `${camp.timeSlot.start}–${camp.timeSlot.end}` : '—'}
              </td>
              <td className="px-4 py-2.5" style={{ color: 'var(--qms-text-muted)' }}>{camp.city}, {camp.state}</td>
              <td className="px-4 py-2.5" style={{ color: 'var(--qms-text-muted)' }}>{mrName(camp.mr)}</td>
              <td className="px-4 py-2.5"><CampStatusPillReal status={camp.status} /></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  </div>
)

export default PharmaCampTable
