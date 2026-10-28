import { FiEye, FiLayers, FiStar } from 'react-icons/fi'
import CampDashboardStatusPill from '@/features/pharma/components/CampDashboardStatusPill'
import { CAMP_TIME_SLOT_LABEL } from '@/types/campTimeSlot.constants'
import { specializationLabel } from '@/types/doctor.types'
import type { CampEntity, CampPopulatedDoctor, CampPopulatedRole } from '@/types/campReal.types'

interface MrCampScheduleTableProps {
  camps: CampEntity[]
  onOpenCamp: (camp: CampEntity) => void
  onOpenDossier: (camp: CampEntity) => void
  onRateCamp: (camp: CampEntity) => void
}

const doctor = (d: CampEntity['doctor']): CampPopulatedDoctor | null => (d && typeof d !== 'string' ? d : null)
const populatedRole = (r: CampEntity['fo']): CampPopulatedRole | null => (r && typeof r !== 'string' ? r : null)

// "Mark complete"/"Cancel" omitted — camp stage-move is camp:manage-only, which a pharma MR lacks.
// Mirrors internal-frontend's MrCampScheduleTable.tsx.
const MrCampScheduleTable = ({ camps, onOpenCamp, onOpenDossier, onRateCamp }: MrCampScheduleTableProps) => (
  <div className="rounded-xl border overflow-hidden" style={{ borderColor: 'var(--qms-border)', background: 'var(--qms-surface-card)' }}>
    <div className="overflow-x-auto">
      <table className="w-full text-[13px]">
        <thead>
          <tr style={{ borderBottom: '1px solid var(--qms-border)' }}>
            <th className="text-left font-bold text-[11px] uppercase tracking-wider px-4 py-2.5" style={{ color: 'var(--qms-text-muted)' }}>Camp · Date</th>
            <th className="text-left font-bold text-[11px] uppercase tracking-wider px-4 py-2.5" style={{ color: 'var(--qms-text-muted)' }}>Type</th>
            <th className="text-left font-bold text-[11px] uppercase tracking-wider px-4 py-2.5" style={{ color: 'var(--qms-text-muted)' }}>Doctor</th>
            <th className="text-left font-bold text-[11px] uppercase tracking-wider px-4 py-2.5" style={{ color: 'var(--qms-text-muted)' }}>City</th>
            <th className="text-left font-bold text-[11px] uppercase tracking-wider px-4 py-2.5" style={{ color: 'var(--qms-text-muted)' }}>FO assigned</th>
            <th className="text-left font-bold text-[11px] uppercase tracking-wider px-4 py-2.5" style={{ color: 'var(--qms-text-muted)' }}>Status</th>
            <th className="px-4 py-2.5" />
          </tr>
        </thead>
        <tbody>
          {camps.map((camp) => {
            const d = doctor(camp.doctor)
            const worker = populatedRole(camp.type === 'diet' ? camp.dietitian : camp.fo)
            const canRate = camp.status === 'closed'
            return (
              <tr
                key={camp.id}
                onClick={() => onOpenCamp(camp)}
                onKeyDown={(e) => {
                  if (e.target !== e.currentTarget) return
                  if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onOpenCamp(camp) }
                }}
                role="button"
                tabIndex={0}
                className="cursor-pointer transition-colors hover:bg-(--qms-surface-hover) focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-(--qms-brand)"
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
                <td className="px-4 py-2.5" style={{ color: 'var(--qms-text)' }}>{worker?.name ?? '—'}</td>
                <td className="px-4 py-2.5"><CampDashboardStatusPill status={camp.status} /></td>
                <td className="px-4 py-2.5 text-right whitespace-nowrap">
                  <button
                    type="button"
                    title="View details"
                    onClick={(e) => { e.stopPropagation(); onOpenCamp(camp) }}
                    className="inline-flex items-center justify-center rounded-lg w-7 h-7 transition-colors hover:bg-(--qms-surface-hover)"
                    style={{ color: 'var(--qms-text-muted)' }}
                  >
                    <FiEye size={13} />
                  </button>
                  <button
                    type="button"
                    title="Open full camp dossier"
                    onClick={(e) => { e.stopPropagation(); onOpenDossier(camp) }}
                    className="inline-flex items-center justify-center rounded-lg w-7 h-7 transition-colors hover:bg-(--qms-surface-hover)"
                    style={{ color: '#3b6dff' }}
                  >
                    <FiLayers size={13} />
                  </button>
                  {canRate && (
                    <button
                      type="button"
                      title="Rate camp"
                      onClick={(e) => { e.stopPropagation(); onRateCamp(camp) }}
                      className="inline-flex items-center justify-center rounded-lg w-7 h-7 transition-colors hover:bg-(--qms-surface-hover)"
                      style={{ color: '#f59e0b' }}
                    >
                      <FiStar size={13} />
                    </button>
                  )}
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  </div>
)

export default MrCampScheduleTable
