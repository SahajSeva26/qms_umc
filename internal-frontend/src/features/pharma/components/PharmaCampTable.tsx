import { FiFileText } from 'react-icons/fi'
import CampTypePillReal from '@/components/widgets/camp/CampTypePillReal'
import CampDashboardStatusPill from '@/features/pharma/components/CampDashboardStatusPill'
import CopyButton from '@/components/ui/CopyButton'
import type { CampEntity, CampPopulatedDoctor, CampPopulatedRole } from '@/types/campReal.types'
import { CAMP_TIME_SLOT_LABEL } from '@/types/campTimeSlot.constants'

interface PharmaCampTableProps {
  camps: CampEntity[]
  /** Opens the read-only detail drawer — mark-complete/cancel need camp:manage, which pharma field force doesn't hold. */
  onOpenCamp?: (camp: CampEntity) => void
  /** Row-end "Open dossier" shortcut — the prototype's second of two dossier entry points (the first is inside the drawer itself). */
  onOpenDossier?: (camp: CampEntity) => void
}

const doctorName = (doctor: CampEntity['doctor']) =>
  doctor && typeof doctor !== 'string' ? (doctor as CampPopulatedDoctor).name : (doctor ?? '—')

const mrName = (mr: CampEntity['mr']) =>
  mr && typeof mr !== 'string' ? (mr as CampPopulatedRole).name : (mr ?? '—')

const PharmaCampTable = ({ camps, onOpenCamp, onOpenDossier }: PharmaCampTableProps) => (
  <div
    className="rounded-xl border overflow-hidden"
    style={{ borderColor: 'var(--qms-border)', background: 'var(--qms-surface-card)' }}
  >
    <div className="overflow-x-auto">
      <table className="w-full text-[13px]">
        <thead>
          <tr style={{ borderBottom: '1px solid var(--qms-border)' }}>
            <th className="text-left font-bold text-[11px] uppercase tracking-wider px-4 py-2.5" style={{ color: 'var(--qms-text-muted)' }}>Code</th>
            <th className="text-left font-bold text-[11px] uppercase tracking-wider px-4 py-2.5" style={{ color: 'var(--qms-text-muted)' }}>Type</th>
            <th className="text-left font-bold text-[11px] uppercase tracking-wider px-4 py-2.5" style={{ color: 'var(--qms-text-muted)' }}>Doctor</th>
            <th className="text-left font-bold text-[11px] uppercase tracking-wider px-4 py-2.5" style={{ color: 'var(--qms-text-muted)' }}>Date</th>
            <th className="text-left font-bold text-[11px] uppercase tracking-wider px-4 py-2.5" style={{ color: 'var(--qms-text-muted)' }}>Time</th>
            <th className="text-left font-bold text-[11px] uppercase tracking-wider px-4 py-2.5" style={{ color: 'var(--qms-text-muted)' }}>Location</th>
            <th className="text-left font-bold text-[11px] uppercase tracking-wider px-4 py-2.5" style={{ color: 'var(--qms-text-muted)' }}>MR</th>
            <th className="text-left font-bold text-[11px] uppercase tracking-wider px-4 py-2.5" style={{ color: 'var(--qms-text-muted)' }}>Status</th>
            {onOpenDossier && <th className="px-4 py-2.5" />}
          </tr>
        </thead>
        <tbody>
          {camps.map((camp) => (
            <tr
              key={camp.id}
              onClick={onOpenCamp ? () => onOpenCamp(camp) : undefined}
              onKeyDown={onOpenCamp ? (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onOpenCamp(camp) } } : undefined}
              role={onOpenCamp ? 'button' : undefined}
              tabIndex={onOpenCamp ? 0 : undefined}
              className={onOpenCamp ? 'cursor-pointer transition-colors hover:bg-(--qms-surface-hover) focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-(--qms-brand)' : undefined}
              style={{ borderBottom: '1px solid var(--qms-border)' }}
            >
              <td className="px-4 py-2.5 font-mono" style={{ color: 'var(--qms-text)' }}>
                <div className="flex items-center gap-1.5">
                  {camp.code}
                  <CopyButton value={camp.code} label="Code" />
                </div>
              </td>
              <td className="px-4 py-2.5"><CampTypePillReal type={camp.type} /></td>
              <td className="px-4 py-2.5" style={{ color: 'var(--qms-text)' }}>{doctorName(camp.doctor)}</td>
              <td className="px-4 py-2.5" style={{ color: 'var(--qms-text)' }}>{new Date(camp.date).toLocaleDateString()}</td>
              <td className="px-4 py-2.5" style={{ color: 'var(--qms-text-muted)' }}>
                {camp.timeSlot ? CAMP_TIME_SLOT_LABEL[camp.timeSlot] : '—'}
              </td>
              <td className="px-4 py-2.5" style={{ color: 'var(--qms-text-muted)' }}>{camp.location ? `${camp.location.city}, ${camp.location.state}` : 'Location unavailable'}</td>
              <td className="px-4 py-2.5" style={{ color: 'var(--qms-text-muted)' }}>{mrName(camp.mr)}</td>
              <td className="px-4 py-2.5"><CampDashboardStatusPill status={camp.status} /></td>
              {onOpenDossier && (
                <td className="px-4 py-2.5 text-right">
                  <button
                    type="button"
                    title="Open camp dossier"
                    onClick={(e) => { e.stopPropagation(); onOpenDossier(camp) }}
                    className="inline-flex items-center justify-center rounded-lg w-7 h-7 transition-colors hover:bg-(--qms-surface-hover)"
                    style={{ color: 'var(--qms-text-muted)' }}
                  >
                    <FiFileText size={14} />
                  </button>
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  </div>
)

export default PharmaCampTable
