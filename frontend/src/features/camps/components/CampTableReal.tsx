import type { CampEntity } from '@/types/campReal.types'
import CampStatusPillReal from '@/features/camps/components/CampStatusPillReal'
import { useCampRefNames } from '@/features/camps/hooks/useCampRefNames'

interface CampTableRealProps {
  camps: CampEntity[]
  onOpen: (id: string) => void
}

const TYPE_LABEL: Record<CampEntity['type'], string> = {
  screening: 'Screening',
  diet: 'Diet',
  lab: 'Lab',
}

const CampTableReal = ({ camps, onOpen }: CampTableRealProps) => {
  const { doctorName, divisionName, roleName } = useCampRefNames()

  return (
    <div
      className="rounded-xl border overflow-hidden"
      style={{ borderColor: 'var(--qms-border)', background: 'var(--qms-surface-card)' }}
    >
      <div className="overflow-x-auto">
        <table className="w-full text-[13px]">
          <thead>
            <tr style={{ borderBottom: '1px solid var(--qms-border)' }}>
              {['Date', 'Slot', 'Type', 'Division', 'Doctor', 'City / State', 'FO', 'Status'].map((h) => (
                <th key={h} className="text-left font-bold text-[11px] uppercase tracking-wider px-4 py-2.5" style={{ color: 'var(--qms-text-muted)' }}>
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {camps.map((camp) => (
              <tr
                key={camp.id}
                onClick={() => onOpen(camp.id)}
                className="cursor-pointer transition-colors hover:bg-(--qms-surface-hover)"
                style={{ borderBottom: '1px solid var(--qms-border)' }}
              >
                <td className="px-4 py-2.5" style={{ color: 'var(--qms-text)' }}>{new Date(camp.date).toLocaleDateString()}</td>
                <td className="px-4 py-2.5" style={{ color: 'var(--qms-text-muted)' }}>
                  {camp.timeSlot ? `${camp.timeSlot.start}–${camp.timeSlot.end}` : '—'}
                </td>
                <td className="px-4 py-2.5" style={{ color: 'var(--qms-text)' }}>{TYPE_LABEL[camp.type]}</td>
                <td className="px-4 py-2.5" style={{ color: 'var(--qms-text-muted)' }}>{divisionName(camp.division)}</td>
                <td className="px-4 py-2.5" style={{ color: 'var(--qms-text)' }}>{doctorName(camp.doctor)}</td>
                <td className="px-4 py-2.5" style={{ color: 'var(--qms-text-muted)' }}>{camp.city}, {camp.state}</td>
                <td className="px-4 py-2.5">
                  {camp.fo ? (
                    <span style={{ color: 'var(--qms-text)' }}>{roleName(camp.fo)}</span>
                  ) : (
                    <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-danger-soft text-danger">UNASSIGNED</span>
                  )}
                </td>
                <td className="px-4 py-2.5"><CampStatusPillReal status={camp.status} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {camps.length === 0 && (
        <div className="px-4 py-10 text-center text-[13px]" style={{ color: 'var(--qms-text-muted)' }}>
          No camps found.
        </div>
      )}
    </div>
  )
}

export default CampTableReal
