import { useState } from 'react'
import { FiColumns, FiList, FiCpu, FiAlertOctagon, FiAlertTriangle } from 'react-icons/fi'
import { useAuth } from '@/hooks/useAuth'
import { useCampsData } from '@/hooks/useCampsData'
import { usePeopleData } from '@/hooks/usePeopleData'
import { useFoIncidents, useMachineFlags } from '@/features/fo/hooks/useFo'
import type { Incident, MachineFlag } from '@/features/fo/fo.types'
import { Button } from '@/components/ui/button'
import { toast } from '@/components/ui/sonner'

import IncidentBoardTab from '@/features/om/components/incidents/IncidentBoardTab'
import IncidentsAllTab from '@/features/om/components/incidents/IncidentsAllTab'
import FaultyMachinesTab from '@/features/om/components/incidents/FaultyMachinesTab'
import IncidentDrawer from '@/features/om/components/incidents/IncidentDrawer'
import OmRaiseTicketModal from '@/features/om/components/incidents/OmRaiseTicketModal'
import CampsOnHoldDialog from '@/features/om/components/incidents/CampsOnHoldDialog'
import ClearFlagDialog from '@/features/om/components/incidents/ClearFlagDialog'
import AssignReplacementDialog from '@/features/om/components/incidents/AssignReplacementDialog'
import {
  AssignDialog, ResolveDialog, CloseTicketDialog, CancelTicketDialog,
} from '@/features/om/components/incidents/IncidentActionDialogs'

type TabId = 'board' | 'all' | 'machines'

const TABS: { id: TabId; label: string; icon: typeof FiColumns }[] = [
  { id: 'board', label: 'Board', icon: FiColumns },
  { id: 'all', label: 'All tickets', icon: FiList },
  { id: 'machines', label: 'Faulty machines', icon: FiCpu },
]

// Operations-Manager-facing Incidents · SOS screen — a faithful port of the
// prototype's incidents.html/incidents.js/incidents-data.js/machine-
// replacement.js. Reads/writes the SAME qms.fo.incidents + machineFlags
// stores as the FO-side RaiseSosModal/IncidentsModule via the shared
// useFoIncidents/useMachineFlags hooks — this page never duplicates that
// data layer, only adds the OM-facing Kanban/table/machines views + the
// assign/start/resolve/close/cancel workflow actions on top of it.
const IncidentsPage = () => {
  const { user } = useAuth()
  const byName = user ? `${user.firstName} ${user.lastName}`.trim() : 'Operations Manager'

  const { camps } = useCampsData()
  const { people, devices } = usePeopleData()
  const fos = people.filter((p) => p.role === 'Field Officer')

  const {
    incidents, assignIncident, startIncident, resolveIncident, closeIncident, cancelIncident, raiseIncident,
  } = useFoIncidents()
  const { flags, clearMachineFlag } = useMachineFlags()

  const [tab, setTab] = useState<TabId>('board')
  const [drawerIncident, setDrawerIncident] = useState<Incident | null>(null)
  const [raiseOpen, setRaiseOpen] = useState(false)
  const [holdsOpen, setHoldsOpen] = useState(false)

  const [assignTarget, setAssignTarget] = useState<Incident | null>(null)
  const [resolveTarget, setResolveTarget] = useState<Incident | null>(null)
  const [closeTarget, setCloseTarget] = useState<Incident | null>(null)
  const [cancelTarget, setCancelTarget] = useState<Incident | null>(null)
  const [clearFlagTarget, setClearFlagTarget] = useState<MachineFlag | null>(null)
  const [replacementDeviceId, setReplacementDeviceId] = useState<string | null>(null)
  const [replacementCampId, setReplacementCampId] = useState<string | undefined>(undefined)

  // Re-sync the open drawer with the latest incidents list after a mutation
  // so the stepper/actions/audit trail reflect the just-applied change
  // instead of staying frozen on the pre-mutation snapshot.
  const refreshedDrawerIncident = drawerIncident ? (incidents.find((i) => i.id === drawerIncident.id) ?? drawerIncident) : null

  const openTicket = (incident: Incident) => setDrawerIncident(incident)

  const handleAssignConfirm = async (assigneeId: string, assigneeName: string) => {
    if (!assignTarget) return
    await assignIncident(assignTarget.id, assigneeId, assigneeName, byName)
    toast.success('Ticket assigned · clock starts on response SLA')
    setAssignTarget(null)
  }

  const handleStart = async (incident: Incident) => {
    await startIncident(incident.id, byName)
    toast.success('Work started')
  }

  const handleResolveConfirm = async (notes: string, replacementDeviceIdArg?: string, replacementNotes?: string) => {
    if (!resolveTarget) return
    await resolveIncident(resolveTarget.id, byName, notes, replacementDeviceIdArg, replacementNotes)
    toast.success('Resolved · stakeholders notified')
    setResolveTarget(null)
  }

  const handleCloseConfirm = async (notes?: string) => {
    if (!closeTarget) return
    await closeIncident(closeTarget.id, byName, notes)
    toast.success('Ticket closed')
    setCloseTarget(null)
  }

  const handleCancelConfirm = async (reason: string) => {
    if (!cancelTarget) return
    await cancelIncident(cancelTarget.id, byName, reason)
    toast.info('Ticket cancelled')
    setCancelTarget(null)
  }

  const handleClearFlagConfirm = async () => {
    if (!clearFlagTarget) return
    await clearMachineFlag(clearFlagTarget.deviceId, byName)
    toast.success('Machine flag cleared · device returned to allocation pool')
    setClearFlagTarget(null)
  }

  const handleRaiseSubmit = async (payload: {
    category: Incident['category']; campId?: string; deviceId?: string; title: string; notes: string
    severity: Incident['severity']; foId: string; foName: string; city?: string
  }) => {
    const t = await raiseIncident({
      category: payload.category,
      campId: payload.campId,
      deviceId: payload.deviceId,
      title: payload.title,
      notes: payload.notes,
      raisedById: user?._id ?? 'om',
      raisedByName: byName,
      foId: payload.foId,
      foName: payload.foName,
      severity: payload.severity,
      city: payload.city,
    })
    const created = t[0]
    toast.success(created ? `Ticket ${created.id} raised · stakeholders notified` : 'Ticket raised')
  }

  const handleSuggestReplacementFromHolds = (deviceId: string, campId: string) => {
    setHoldsOpen(false)
    setReplacementDeviceId(deviceId)
    setReplacementCampId(campId)
  }

  const handleAssignReplacementConfirm = async (replacementId: string) => {
    if (!replacementDeviceId) return
    // Resolve the originating machine_failure ticket (if any) with the
    // chosen replacement — this both records the resolution and clears the
    // fault flag via fo.service's resolveIncident (which internally calls
    // clearMachineFlag when a replacementDeviceId is supplied).
    const origin = incidents.find((i) => i.deviceId === replacementDeviceId && i.category === 'machine_failure' && i.status !== 'RESOLVED' && i.status !== 'CLOSED' && i.status !== 'CANCELLED')
    const replacementDeviceName = devices.find((d) => d.id === replacementId)?.name ?? replacementId
    if (origin) {
      await resolveIncident(origin.id, byName, `Replacement device ${replacementDeviceName} assigned · camp released from hold`, replacementId, `Replaced ${replacementDeviceId} → ${replacementId}`)
    } else {
      await clearMachineFlag(replacementDeviceId, byName)
    }
    toast.success('Replacement assigned · hold released')
    setReplacementDeviceId(null)
    setReplacementCampId(undefined)
  }

  return (
    <div className="max-w-7xl">
      <div className="flex items-start justify-between gap-3 mb-3 flex-wrap">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-wide mb-1" style={{ color: 'var(--qms-text-muted)' }}>Operations · Incidents</p>
          <h1 className="text-2xl font-bold" style={{ color: 'var(--qms-text)' }}>Incidents &amp; SOS</h1>
          <p className="text-[12px] mt-1" style={{ color: 'var(--qms-text-muted)' }}>
            Raise SOS · machine failure with auto-replacement · consumable shortage · patient escalation · SLA tracking · audit trail
          </p>
        </div>
        <Button
          onClick={() => setRaiseOpen(true)}
          style={{ background: 'linear-gradient(135deg,#f43f5e,#fb7185)', color: '#fff', boxShadow: '0 6px 18px rgba(244,63,94,.4)' }}
        >
          <FiAlertTriangle size={14} /> Raise ticket
        </Button>
      </div>

      <div className="flex flex-wrap gap-1 mb-4 border-b overflow-x-auto" style={{ borderColor: 'var(--qms-border)' }}>
        {TABS.map((t) => {
          const Icon = t.icon
          return (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className="flex items-center gap-1.5 px-3 py-2.5 text-[12.5px] font-semibold border-b-2 transition-colors shrink-0"
              style={{
                color: tab === t.id ? 'var(--qms-text)' : 'var(--qms-text-muted)',
                borderBottomColor: tab === t.id ? 'var(--qms-brand)' : 'transparent',
              }}
            >
              <Icon size={12} /> {t.label}
            </button>
          )
        })}
        <button
          onClick={() => setHoldsOpen(true)}
          className="flex items-center gap-1.5 px-3 py-2.5 text-[12.5px] font-semibold shrink-0"
          style={{ color: 'var(--danger)' }}
        >
          <FiAlertOctagon size={12} /> Camps on hold
        </button>
      </div>

      {tab === 'board' && (
        <IncidentBoardTab
          incidents={incidents}
          devices={devices}
          machineFlagCount={flags.filter((f) => f.faulty && !f.clearedAt).length}
          onOpenTicket={openTicket}
        />
      )}

      {tab === 'all' && <IncidentsAllTab incidents={incidents} onOpenTicket={openTicket} />}

      {tab === 'machines' && (
        <FaultyMachinesTab
          flags={flags}
          devices={devices}
          incidents={incidents}
          onOpenTicket={openTicket}
          onClearFlag={setClearFlagTarget}
        />
      )}

      <IncidentDrawer
        incident={refreshedDrawerIncident}
        devices={devices}
        onClose={() => setDrawerIncident(null)}
        onAssign={setAssignTarget}
        onStart={handleStart}
        onResolve={setResolveTarget}
        onClose_={setCloseTarget}
        onCancel={setCancelTarget}
      />

      <OmRaiseTicketModal
        open={raiseOpen}
        fos={fos}
        camps={camps}
        devices={devices}
        onClose={() => setRaiseOpen(false)}
        onSubmit={handleRaiseSubmit}
      />

      <CampsOnHoldDialog
        open={holdsOpen}
        camps={camps}
        flags={flags}
        devices={devices}
        onClose={() => setHoldsOpen(false)}
        onSuggestReplacement={handleSuggestReplacementFromHolds}
      />

      <AssignDialog incident={assignTarget} people={people} onClose={() => setAssignTarget(null)} onConfirm={handleAssignConfirm} />
      <ResolveDialog incident={resolveTarget} devices={devices} onClose={() => setResolveTarget(null)} onConfirm={handleResolveConfirm} />
      <CloseTicketDialog incident={closeTarget} onClose={() => setCloseTarget(null)} onConfirm={handleCloseConfirm} />
      <CancelTicketDialog incident={cancelTarget} onClose={() => setCancelTarget(null)} onConfirm={handleCancelConfirm} />
      <ClearFlagDialog
        flag={clearFlagTarget}
        deviceName={clearFlagTarget ? (devices.find((d) => d.id === clearFlagTarget.deviceId)?.name ?? clearFlagTarget.deviceId) : ''}
        onClose={() => setClearFlagTarget(null)}
        onConfirm={handleClearFlagConfirm}
      />
      <AssignReplacementDialog
        faultyDeviceId={replacementDeviceId}
        campId={replacementCampId}
        devices={devices}
        onClose={() => { setReplacementDeviceId(null); setReplacementCampId(undefined) }}
        onConfirm={handleAssignReplacementConfirm}
      />
    </div>
  )
}

export default IncidentsPage
