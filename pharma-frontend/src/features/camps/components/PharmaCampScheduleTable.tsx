import { FiEye } from 'react-icons/fi'
import CampDashboardStatusPill from '@/features/camps/components/CampDashboardStatusPill'
import { CAMP_TIME_SLOT_LABEL } from '@/types/campTimeSlot.constants'
import { specializationLabel } from '@/types/doctor.types'
import type { CampEntity, CampPopulatedDoctor, CampPopulatedRole } from '@/types/campReal.types'

interface PharmaCampScheduleTableProps {
  camps: CampEntity[]
  onOpenCamp: (camp: CampEntity) => void
}

const doctor = (d: CampEntity['doctor']): CampPopulatedDoctor | null => (d && typeof d !== 'string' ? d : null)
const populatedRole = (r: CampEntity['fo'] | CampEntity['mr']): CampPopulatedRole | null =>
  r && typeof r !== 'string' ? r : null

// Read-only camp list for HO/RSM/ASM — distinct from MrCampScheduleTable, which also carries
// MR-only row actions (dossier link, rate camp) that aren't permission-safe to show a manager
// viewing someone else's camp. A "MR" column replaces MR's own "FO assigned" column here, since
// for a manager viewing their team's camps, which MR owns each row is the useful fact (an MR's
// own schedule view already knows it's always them). Since this table has only ONE row action
// (unlike MrCampScheduleTable's three), the row itself is NOT a second clickable control — "View
// details" is the row's sole interactive element, avoiding a nested role="button" row competing
// with a real button for keyboard/screen-reader users.
const PharmaCampScheduleTable = ({ camps, onOpenCamp }: PharmaCampScheduleTableProps) => (
  <div className="rounded-xl border overflow-hidden" style={{ borderColor: 'var(--qms-border)', background: 'var(--qms-surface-card)' }}>
    <div className="overflow-x-auto">
      <table className="w-full text-[13px]">
        <thead>
          <tr style={{ borderBottom: '1px solid var(--qms-border)' }}>
            <th className="text-left font-bold text-[11px] uppercase tracking-wider px-4 py-2.5" style={{ color: 'var(--qms-text-muted)' }}>Camp · Date</th>
            <th className="text-left font-bold text-[11px] uppercase tracking-wider px-4 py-2.5" style={{ color: 'var(--qms-text-muted)' }}>Type</th>
            <th className="text-left font-bold text-[11px] uppercase tracking-wider px-4 py-2.5" style={{ color: 'var(--qms-text-muted)' }}>Doctor</th>
            <th className="text-left font-bold text-[11px] uppercase tracking-wider px-4 py-2.5" style={{ color: 'var(--qms-text-muted)' }}>City</th>
            <th className="text-left font-bold text-[11px] uppercase tracking-wider px-4 py-2.5" style={{ color: 'var(--qms-text-muted)' }}>MR</th>
            <th className="text-left font-bold text-[11px] uppercase tracking-wider px-4 py-2.5" style={{ color: 'var(--qms-text-muted)' }}>Status</th>
            <th className="px-4 py-2.5" />
          </tr>
        </thead>
        <tbody>
          {camps.map((camp) => {
            const d = doctor(camp.doctor)
            const mr = populatedRole(camp.mr)
            return (
              <tr
                key={camp.id}
                className="transition-colors hover:bg-(--qms-surface-hover)"
                style={{ borderBottom: '1px solid var(--qms-border)' }}
              >
                <td className="px-4 py-2.5">
                  <div className="font-extrabold" style={{ color: 'var(--qms-text)' }}>{camp.code}</div>
                  <div className="text-[11px]" style={{ color: 'var(--qms-text-muted)' }}>
                    {new Date(camp.date).toLocaleDateString(undefined, { weekday: 'short', day: 'numeric', month: 'short' })}
                    {camp.timeSlot && ` · ${CAMP_TIME_SLOT_LABEL[camp.timeSlot]}`}
                  </div>
                </td>
                <td className="px-4 py-2.5" style={{ color: 'var(--qms-text)', textTransform: 'capitalize' }}>{camp.type}</td>
                <td className="px-4 py-2.5">
                  <div style={{ color: 'var(--qms-text)' }}>{d?.name ?? '—'}</div>
                  <div className="text-[11px]" style={{ color: 'var(--qms-text-muted)' }}>{d?.specialization ? specializationLabel(d.specialization) : ''}</div>
                </td>
                <td className="px-4 py-2.5" style={{ color: 'var(--qms-text)' }}>
                  {camp.location?.city ?? '—'}
                  {camp.location?.state && <div className="text-[11px]" style={{ color: 'var(--qms-text-muted)' }}>{camp.location.state}</div>}
                </td>
                <td className="px-4 py-2.5" style={{ color: 'var(--qms-text)' }}>{mr?.name ?? '—'}</td>
                <td className="px-4 py-2.5"><CampDashboardStatusPill status={camp.status} /></td>
                <td className="px-4 py-2.5 text-right whitespace-nowrap">
                  <button
                    type="button"
                    title="View details"
                    onClick={() => onOpenCamp(camp)}
                    className="inline-flex items-center justify-center rounded-lg w-7 h-7 transition-colors hover:bg-(--qms-surface-hover)"
                    style={{ color: 'var(--qms-text-muted)' }}
                  >
                    <FiEye size={13} />
                  </button>
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  </div>
)

export default PharmaCampScheduleTable
