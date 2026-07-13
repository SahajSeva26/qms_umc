import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { FiPhone, FiMail, FiMapPin, FiExternalLink } from 'react-icons/fi'
import type { Camp, CampStatus } from '@/types/camp.types'
import { CAMPS_ROUTES } from '@/features/camps/camps.routes'
import { getDoctor, isChargeableCancellation } from '@/features/camps/camps.utils'
import { clientName, divisionName, foName } from '@/features/camps/camps.refs'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import SideDrawer from '@/components/ui/SideDrawer'
import CampStatusPill from '@/features/camps/components/CampStatusPill'
import { SLOTS } from '@/features/camps/camps.mock'
import { formatDate } from '@/utils/formatters'

interface CampDrawerProps {
  camp: Camp | null
  onClose: () => void
  onSetStatus: (id: string, status: CampStatus, reason?: string) => void
  onAssignFo: (id: string) => void
}

const CampDrawer = ({ camp, onClose, onSetStatus, onAssignFo }: CampDrawerProps) => {
  const navigate = useNavigate()
  const [cancelling, setCancelling] = useState(false)
  const [cancelReason, setCancelReason] = useState('')

  if (!camp) return <SideDrawer open={false} title="" onClose={onClose}>{null}</SideDrawer>

  const doctor = getDoctor(camp.doctorId)
  const slot = SLOTS.find((s) => s.id === camp.slot)
  const isFinal = camp.status === 'CANCELLED' || camp.status === 'CANCELLED_CHARGED' || camp.status === 'CLOSED'

  const handleCancelConfirm = () => {
    if (!cancelReason.trim()) return
    const chargeable = isChargeableCancellation(camp)
    onSetStatus(camp.id, chargeable ? 'CANCELLED_CHARGED' : 'CANCELLED', cancelReason)
    setCancelling(false)
    setCancelReason('')
  }

  return (
    <SideDrawer open={!!camp} title={`${camp.id} · ${camp.type}`} onClose={onClose}>
      <div className="flex items-center justify-between mb-4">
        <CampStatusPill status={camp.status} />
        <Button
          variant="outline"
          size="sm"
          onClick={() => navigate(CAMPS_ROUTES.CAMP_DETAIL.replace(':id', camp.id))}
          className="text-[12px] font-semibold"
        >
          <FiExternalLink size={12} /> Full dossier
        </Button>
      </div>

      <div className="text-[13px] mb-4" style={{ color: 'var(--qms-text-muted)' }}>
        {clientName(camp.clientId)} · {divisionName(camp.divisionId)} · {camp.city}, {camp.state} · {formatDate(camp.date)} · {slot?.label}
      </div>

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
        <p className="text-[13px] mb-5 font-semibold" style={{ color: 'var(--qms-text)' }}>{foName(camp.foId)}</p>
      ) : (
        <Button
          size="sm"
          onClick={() => onAssignFo(camp.id)}
          className="text-[12px] font-semibold text-white mb-5"
          style={{ background: 'linear-gradient(135deg, var(--qms-brand), var(--qms-teal))' }}
        >
          Assign FO
        </Button>
      )}

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

      {!isFinal && !cancelling && (
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
              onClick={() => onSetStatus(camp.id, 'CLOSED')}
              className="text-[12px] font-bold text-white"
              style={{ background: 'var(--qms-teal)' }}
            >
              Close
            </Button>
          )}
          <Button
            size="sm"
            onClick={() => setCancelling(true)}
            className="text-[12px] font-bold bg-danger-soft text-danger hover:bg-danger-soft/80"
          >
            Cancel
          </Button>
        </div>
      )}

      {cancelling && (
        <div className="space-y-2">
          <Textarea
            value={cancelReason}
            onChange={(e) => setCancelReason(e.target.value)}
            placeholder="Reason for cancellation (required)..."
            rows={3}
            className="text-[13px]"
          />
          <div className="flex gap-2">
            <Button
              size="sm"
              onClick={handleCancelConfirm}
              disabled={!cancelReason.trim()}
              className="text-[12px] font-bold bg-danger-soft text-danger hover:bg-danger-soft/80"
            >
              Confirm cancellation
            </Button>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setCancelling(false)}
              className="text-[12px] font-semibold"
            >
              Back
            </Button>
          </div>
        </div>
      )}
    </SideDrawer>
  )
}

export default CampDrawer
