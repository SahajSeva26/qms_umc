import { useState } from 'react'
import { FiUser, FiCalendar, FiFileText, FiPackage } from 'react-icons/fi'
import type { Camp, CampCancellation } from '@/types/camp.types'
import type { Dietitian } from '@/features/diet/diet.types'
import type { useDietCamps } from '@/features/diet/hooks/useDietCamps'
import { dietStage } from '@/features/diet/diet.utils'
import { clientName, divisionName } from '@/types/campref.types'
import { useAuth } from '@/hooks/useAuth'
import SideDrawer from '@/components/ui/SideDrawer'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Input } from '@/components/ui/input'
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select'
import DietStatusPill from '@/features/diet/components/DietStatusPill'
import { formatDate } from '@/utils/formatters'

interface DietCampDetailProps {
  camp: Camp | null
  dietitians: Dietitian[]
  viewOnly: boolean
  diet: ReturnType<typeof useDietCamps>
  onClose: () => void
  onAssignTeam: () => void
}

const CANCEL_REASONS: { id: CampCancellation['reason']; label: string }[] = [
  { id: 'DIETITIAN_UNAVAILABLE', label: 'Dietitian unavailable' },
  { id: 'WEATHER', label: 'Weather' },
  { id: 'LOW_TURNOUT', label: 'Low turnout expected' },
  { id: 'CLIENT_REQUEST', label: 'Client request' },
  { id: 'RESCHEDULED', label: 'Rescheduled' },
  { id: 'OTHER', label: 'Other' },
]

const DietCampDetail = ({ camp, dietitians, viewOnly, diet, onClose, onAssignTeam }: DietCampDetailProps) => {
  const { user } = useAuth()
  const [cancelling, setCancelling] = useState(false)
  const [reason, setReason] = useState<CampCancellation['reason']>('OTHER')
  const [notes, setNotes] = useState('')
  const [countInput, setCountInput] = useState('')

  if (!camp) return <SideDrawer open={false} title="" onClose={onClose}>{null}</SideDrawer>

  const stage = dietStage(camp)
  const dietitian = dietitians.find((d) => d.id === camp.dietitianId)
  const isFinal = stage === 'CANCELLED' || stage === 'CHARGED' || stage === 'COMPLETED'

  const handleSetCount = () => {
    const n = Number(countInput)
    if (isNaN(n) || n < 0) return
    diet.setPatientCount(camp.id, n, undefined, user?.firstName ?? 'Coordinator', 'Updated via detail view')
    setCountInput('')
  }

  const handleCancelConfirm = () => {
    const slotHour = Number(camp.slot.match(/^(\d+)/)?.[1] ?? 10)
    diet.cancelCamp(camp, reason, notes, slotHour)
    setCancelling(false); setNotes('')
  }

  return (
    <SideDrawer open={!!camp} title={`${camp.id} · Diet Camp`} onClose={onClose} widthClassName="max-w-lg">
      <div className="flex items-center justify-between mb-4">
        <DietStatusPill stage={stage} />
      </div>

      <div className="text-[13px] mb-4" style={{ color: 'var(--qms-text-muted)' }}>
        {clientName(camp.clientId)} · {divisionName(camp.divisionId)} · {camp.city}, {camp.state} · {formatDate(camp.date)}
      </div>

      {camp.cancellation && (
        <div className="rounded-xl p-3 mb-4 text-[12px]" style={{ background: 'var(--danger-soft)', color: 'var(--danger)' }}>
          Cancelled · {camp.cancellation.reason.replace(/_/g, ' ')} · charge ₹{camp.cancellation.chargeAmount.toLocaleString('en-IN')} (moved to client AR)
        </div>
      )}

      <h3 className="text-[12px] font-bold uppercase tracking-wider mb-2" style={{ color: 'var(--qms-text-muted)' }}>Team</h3>
      {dietitian ? (
        <div className="flex items-center gap-1.5 text-[13px] font-semibold mb-2" style={{ color: 'var(--qms-text)' }}>
          <FiUser size={12} /> {dietitian.name} · Dietitian
        </div>
      ) : (
        <div className="text-[12px] mb-2 px-2 py-1.5 rounded-lg" style={{ background: 'var(--danger-soft)', color: 'var(--danger)' }}>Missing Dietitian</div>
      )}
      {!viewOnly && !isFinal && (
        <Button size="sm" variant="outline" onClick={onAssignTeam} className="mb-4">Assign team</Button>
      )}

      <h3 className="text-[12px] font-bold uppercase tracking-wider mb-2 mt-4" style={{ color: 'var(--qms-text-muted)' }}>Patient count</h3>
      <div className="flex items-center gap-2 mb-4">
        <div className="text-sm font-extrabold tabular-nums" style={{ color: 'var(--qms-text)' }}>{camp.patientsDone}/{camp.patientsExpected}</div>
        {!viewOnly && !isFinal && (
          <>
            <Input type="number" min={0} value={countInput} onChange={(e) => setCountInput(e.target.value)} placeholder="New count" className="w-28 text-[12px]" />
            <Button size="sm" onClick={handleSetCount}>Update</Button>
          </>
        )}
      </div>

      {camp.patientCountBy && (
        <p className="text-[11px] mb-4" style={{ color: 'var(--qms-text-muted)' }}>
          Last updated by {camp.patientCountBy}{camp.patientCountNote ? ` — ${camp.patientCountNote}` : ''}
        </p>
      )}

      {camp.devicesAllocated.length > 0 && (
        <>
          <h3 className="text-[12px] font-bold uppercase tracking-wider mb-2 flex items-center gap-1.5" style={{ color: 'var(--qms-text-muted)' }}><FiPackage size={12} /> Devices</h3>
          <ul className="text-[13px] mb-4 list-disc list-inside" style={{ color: 'var(--qms-text)' }}>
            {camp.devicesAllocated.map((d) => <li key={d}>{d}</li>)}
          </ul>
        </>
      )}

      {camp.notes && (
        <>
          <h3 className="text-[12px] font-bold uppercase tracking-wider mb-2 flex items-center gap-1.5" style={{ color: 'var(--qms-text-muted)' }}><FiFileText size={12} /> Notes</h3>
          <p className="text-[13px] mb-4" style={{ color: 'var(--qms-text-soft)' }}>{camp.notes}</p>
        </>
      )}

      {!viewOnly && !isFinal && !cancelling && (
        <div className="flex flex-wrap gap-2 mt-2">
          {camp.status === 'CONFIRMED' || camp.status === 'SCHEDULED' ? (
            <Button size="sm" onClick={() => diet.markLive(camp.id)} className="text-white" style={{ background: 'var(--qms-brand)' }}>
              <FiCalendar size={12} /> Mark Live
            </Button>
          ) : null}
          {camp.status === 'LIVE' && (
            <Button size="sm" onClick={() => diet.closeCamp(camp)} className="text-white" style={{ background: 'var(--qms-teal)' }}>Close</Button>
          )}
          <Button size="sm" variant="destructive" onClick={() => setCancelling(true)}>Cancel</Button>
        </div>
      )}

      {cancelling && (
        <div className="space-y-2 mt-2">
          <Select value={reason} onValueChange={(v) => setReason((v ?? 'OTHER') as CampCancellation['reason'])}>
            <SelectTrigger className="w-full text-[13px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              {CANCEL_REASONS.map((r) => <SelectItem key={r.id} value={r.id}>{r.label}</SelectItem>)}
            </SelectContent>
          </Select>
          <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Notes (optional)..." rows={3} className="text-[13px]" />
          <div className="flex gap-2">
            <Button size="sm" variant="destructive" onClick={handleCancelConfirm}>Confirm cancellation</Button>
            <Button size="sm" variant="secondary" onClick={() => setCancelling(false)}>Back</Button>
          </div>
        </div>
      )}
    </SideDrawer>
  )
}

export default DietCampDetail
