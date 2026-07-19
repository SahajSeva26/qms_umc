import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { FiPhone, FiMail, FiMapPin, FiExternalLink, FiSmartphone, FiBell, FiUsers, FiCheckCircle } from 'react-icons/fi'
import type { Camp, CampStatus } from '@/types/camp.types'
import { getDoctor } from '@/features/camps/camps.utils'
import { clientName, divisionName, foName } from '@/features/camps/camps.refs'
import { Button } from '@/components/ui/button'
import SideDrawer from '@/components/ui/SideDrawer'
import CampStatusPill from '@/features/camps/components/CampStatusPill'
import { SLOTS } from '@/features/camps/camps.mock'
import { formatDate } from '@/utils/formatters'
import { useProjectsDataShared } from '@/hooks/useProjectsDataShared'
import CancelCampModal from '@/features/camps/components/CancelCampModal'
import CloseOutCampModal from '@/features/camps/components/CloseOutCampModal'
import CampRemindersModal from '@/features/camps/components/CampRemindersModal'
import ResourceAssignModal from '@/features/camps/components/ResourceAssignModal'

// Literal path (not imported from camps.routes.tsx) — that file imports
// CampsPage, which imports this component, so importing back from it here
// would be a circular module dependency (same pattern as AnalyticsPage.tsx).
const CAMP_DETAIL_PATH = '/camps/:id'

interface CampDrawerProps {
  camp: Camp | null
  onClose: () => void
  onSetStatus: (id: string, status: CampStatus, reason?: string) => void
  onAssignFo: (id: string) => void
  onToggleTele?: (id: string) => void
}

const CampDrawer = ({ camp, onClose, onSetStatus, onAssignFo, onToggleTele }: CampDrawerProps) => {
  const navigate = useNavigate()
  const { projects } = useProjectsDataShared()
  const [cancelOpen, setCancelOpen] = useState(false)
  const [closeOutOpen, setCloseOutOpen] = useState(false)
  const [remindersOpen, setRemindersOpen] = useState(false)
  const [resourceAssignOpen, setResourceAssignOpen] = useState(false)

  if (!camp) return <SideDrawer open={false} title="" onClose={onClose}>{null}</SideDrawer>

  const doctor = getDoctor(camp.doctorId)
  const slot = SLOTS.find((s) => s.id === camp.slot)
  const isFinal = camp.status === 'CANCELLED' || camp.status === 'CANCELLED_CHARGED' || camp.status === 'CLOSED'
  // Cross-feature project lookup for CancelCampModal's cancellation-policy
  // calc — falls back to undefined (its own default policy) if the camp
  // isn't linked to a project.
  const linkedProject = projects.find((p) => p.id === camp.projectId)

  return (
    <SideDrawer open={!!camp} title={`${camp.id} · ${camp.type}`} onClose={onClose}>
      <div className="flex items-center justify-between mb-4">
        <CampStatusPill status={camp.status} />
        <Button
          variant="outline"
          size="sm"
          onClick={() => navigate(CAMP_DETAIL_PATH.replace(':id', camp.id))}
          className="text-[12px] font-semibold"
        >
          <FiExternalLink size={12} /> Full dossier
        </Button>
      </div>

      <div className="text-[13px] mb-2" style={{ color: 'var(--qms-text-muted)' }}>
        {clientName(camp.clientId)} · {divisionName(camp.divisionId)} · {camp.city}, {camp.state} · {formatDate(camp.date)} · {slot?.label}
      </div>

      {camp.teleConsult && (
        <div className="flex items-center gap-1.5 text-[11px] font-semibold px-2 py-1 rounded-full w-fit mb-3" style={{ background: 'var(--qms-surface-strong)', color: 'var(--qms-brand)' }}>
          <FiSmartphone size={11} /> Teleconsultation · {camp.teleChannel === 'IVR' ? 'IVR' : 'Video'}
        </div>
      )}

      {onToggleTele && !isFinal && (
        <button
          onClick={() => onToggleTele(camp.id)}
          className="text-[11px] font-semibold px-2.5 py-1 rounded-full border border-dashed mb-4 w-fit"
          style={{ borderColor: 'var(--qms-border)', color: 'var(--qms-text-muted)' }}
        >
          {camp.teleConsult ? 'Unmark teleconsultation' : 'Mark as teleconsultation'}
        </button>
      )}

      <div className="grid grid-cols-4 gap-2 mb-5 rounded-xl p-3" style={{ background: 'var(--qms-surface-strong)' }}>
        {[
          { label: 'Patients', value: `${camp.patientsDone}/${camp.patientsExpected}` },
          { label: 'Rx count', value: camp.rxCount },
          { label: 'Feedback', value: camp.feedback || '—' },
          { label: 'FO rating', value: camp.foRating || '—' },
        ].map((tile) => (
          <div key={tile.label} className="text-center">
            <div className="text-sm font-extrabold tabular-nums" style={{ color: 'var(--qms-text)' }}>{tile.value}</div>
            <div className="text-[9px] uppercase tracking-wider" style={{ color: 'var(--qms-text-muted)' }}>{tile.label}</div>
          </div>
        ))}
      </div>

      <h3 className="text-[12px] font-bold uppercase tracking-wider mb-2" style={{ color: 'var(--qms-text-muted)' }}>Doctor</h3>
      {doctor ? (
        <div className="mb-5 space-y-1 text-[13px]" style={{ color: 'var(--qms-text)' }}>
          <div className="font-semibold">{doctor.name} · {doctor.specialty}</div>
          <div className="flex items-center gap-1.5" style={{ color: 'var(--qms-text-muted)' }}><FiPhone size={12} /> {doctor.phone}</div>
          <div className="flex items-center gap-1.5" style={{ color: 'var(--qms-text-muted)' }}><FiMail size={12} /> {doctor.email}</div>
          <div className="flex items-center gap-1.5" style={{ color: 'var(--qms-text-muted)' }}><FiMapPin size={12} /> {doctor.city}, {doctor.state} {doctor.pincode}</div>
        </div>
      ) : (
        <p className="text-[13px] mb-5" style={{ color: 'var(--qms-text-muted)' }}>Doctor TBD</p>
      )}

      <h3 className="text-[12px] font-bold uppercase tracking-wider mb-2" style={{ color: 'var(--qms-text-muted)' }}>Field Officer</h3>
      {camp.foId ? (
        <p className="text-[13px] mb-3 font-semibold" style={{ color: 'var(--qms-text)' }}>{foName(camp.foId)}</p>
      ) : (
        <Button
          size="sm"
          onClick={() => onAssignFo(camp.id)}
          className="text-[12px] font-semibold text-white mb-3"
          style={{ background: 'linear-gradient(135deg, var(--qms-brand), var(--qms-teal))' }}
        >
          Assign FO
        </Button>
      )}

      <div className="flex flex-wrap gap-2 mb-5">
        <Button
          size="sm"
          variant="outline"
          onClick={() => setResourceAssignOpen(true)}
          className="text-[12px] font-semibold"
        >
          <FiUsers size={12} /> Assign resources
        </Button>
        {!isFinal && (
          <Button
            size="sm"
            variant="outline"
            onClick={() => setRemindersOpen(true)}
            className="text-[12px] font-semibold"
          >
            <FiBell size={12} /> Configure reminders
          </Button>
        )}
      </div>

      {camp.devicesAllocated.length > 0 && (
        <>
          <h3 className="text-[12px] font-bold uppercase tracking-wider mb-2" style={{ color: 'var(--qms-text-muted)' }}>Devices allocated</h3>
          <ul className="text-[13px] mb-5 list-disc list-inside" style={{ color: 'var(--qms-text)' }}>
            {camp.devicesAllocated.map((d) => <li key={d}>{d}</li>)}
          </ul>
        </>
      )}

      {camp.notes && (
        <>
          <h3 className="text-[12px] font-bold uppercase tracking-wider mb-2" style={{ color: 'var(--qms-text-muted)' }}>Notes</h3>
          <p className="text-[13px] mb-5" style={{ color: 'var(--qms-text-soft)' }}>{camp.notes}</p>
        </>
      )}

      {!isFinal && (
        <div className="flex flex-wrap gap-2">
          {camp.status === 'REQUESTED' && (
            <Button
              size="sm"
              onClick={() => onSetStatus(camp.id, 'CONFIRMED')}
              className="text-[12px] font-bold bg-success-soft text-success hover:bg-success-soft/80"
            >
              Confirm
            </Button>
          )}
          {(camp.status === 'CONFIRMED' || camp.status === 'SCHEDULED') && (
            <Button
              size="sm"
              onClick={() => onSetStatus(camp.id, 'LIVE')}
              className="text-[12px] font-bold text-white"
              style={{ background: 'var(--qms-brand)' }}
            >
              Start (Live)
            </Button>
          )}
          {camp.status === 'LIVE' && (
            <Button
              size="sm"
              onClick={() => setCloseOutOpen(true)}
              className="text-[12px] font-bold text-white"
              style={{ background: 'var(--qms-teal)' }}
            >
              <FiCheckCircle size={12} /> Close
            </Button>
          )}
          <Button
            size="sm"
            onClick={() => setCancelOpen(true)}
            className="text-[12px] font-bold bg-danger-soft text-danger hover:bg-danger-soft/80"
          >
            Cancel
          </Button>
        </div>
      )}

      <CancelCampModal
        open={cancelOpen}
        onClose={() => setCancelOpen(false)}
        camp={camp}
        project={linkedProject}
      />
      <CloseOutCampModal
        open={closeOutOpen}
        onClose={() => setCloseOutOpen(false)}
        camp={camp}
      />
      <CampRemindersModal
        open={remindersOpen}
        onClose={() => setRemindersOpen(false)}
        camp={camp}
      />
      <ResourceAssignModal
        open={resourceAssignOpen}
        onClose={() => setResourceAssignOpen(false)}
        camp={camp}
      />
    </SideDrawer>
  )
}

export default CampDrawer
