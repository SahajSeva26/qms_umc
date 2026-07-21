import { useMemo, useState } from 'react'
import {
  FiAlertTriangle, FiTool, FiPackage, FiUserX, FiMapPin, FiHelpCircle,
  FiFolder, FiCheckCircle, FiXCircle, FiClipboard,
} from 'react-icons/fi'
import type { Person } from '@/types/people.types'
import type { Camp } from '@/types/camp.types'
import type { DeviceCatalogItem } from '@/types/device.types'
import type { Incident, IncidentCategory, IncidentSeverity } from '@/features/fo/fo.types'
import KpiTile from '@/components/ui/KpiTile'
import { Button } from '@/components/ui/button'
import RaiseSosModal from '@/features/fo/components/workspace/RaiseSosModal'
import { toast } from '@/components/ui/sonner'

interface IncidentsModuleProps {
  me: Person
  camps: Camp[]
  devices: DeviceCatalogItem[]
  incidents: Incident[]
  raiseIncident: (incident: Omit<Incident, 'id' | 'status' | 'createdAt'>) => Promise<unknown>
  prefillCategory?: IncidentCategory
  prefillDeviceId?: string
  /** Bump this (e.g. Date.now()) from the parent Workspace page to force the
   * Raise SOS modal open pre-filled — used by DevicesModule's Report button. */
  openSignal?: number
  onModalHandled?: () => void
}

const CATEGORY_ICON: Record<IncidentCategory, typeof FiAlertTriangle> = {
  sos: FiAlertTriangle,
  machine_failure: FiTool,
  consumable_shortage: FiPackage,
  patient_escalation: FiUserX,
  gps_fraud: FiMapPin,
  inventory_mismatch: FiClipboard,
  other: FiHelpCircle,
}

const STATUS_STYLE: Record<string, { bg: string; color: string }> = {
  OPEN: { bg: 'var(--danger-soft)', color: 'var(--danger)' },
  ASSIGNED: { bg: 'var(--warning-soft)', color: 'var(--warning)' },
  IN_PROGRESS: { bg: 'var(--warning-soft)', color: 'var(--warning)' },
  RESOLVED: { bg: 'var(--success-soft)', color: 'var(--success)' },
  CLOSED: { bg: 'var(--qms-surface-strong)', color: 'var(--qms-text-muted)' },
}

const IncidentsModule = ({ me, camps, devices, incidents, raiseIncident, prefillCategory, prefillDeviceId, openSignal, onModalHandled }: IncidentsModuleProps) => {
  const [modalOpen, setModalOpen] = useState(false)
  // Track the last openSignal we've reacted to without an effect (React's
  // "adjust state during render" pattern) — bumping openSignal from the
  // parent re-opens the modal even if the user had just closed it.
  const [lastSignal, setLastSignal] = useState(openSignal)
  if (openSignal !== lastSignal) {
    setLastSignal(openSignal)
    if (openSignal) setModalOpen(true)
  }

  const kpis = useMemo(() => {
    const open = incidents.filter((i) => i.status === 'OPEN' || i.status === 'ASSIGNED' || i.status === 'IN_PROGRESS')
    const resolved = incidents.filter((i) => i.status === 'RESOLVED')
    const closed = incidents.filter((i) => i.status === 'CLOSED')
    return { open: open.length, total: incidents.length, resolved: resolved.length, closed: closed.length }
  }, [incidents])

  const rows = useMemo(() => [...incidents].sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1)), [incidents])

  const closeModal = () => {
    setModalOpen(false)
    onModalHandled?.()
  }

  const handleSubmit = (incident: { category: IncidentCategory; campId?: string; deviceId?: string; title: string; notes: string; severity: IncidentSeverity }) => {
    raiseIncident({
      category: incident.category,
      campId: incident.campId,
      deviceId: incident.deviceId,
      title: incident.title,
      notes: incident.notes,
      raisedById: me.id,
      raisedByName: me.name,
      foId: me.id,
      foName: me.name,
      severity: incident.severity,
    })
    toast.success(incident.category === 'sos' ? 'SOS raised — Operations Manager notified' : 'Ticket raised')
  }

  return (
    <div className="space-y-4">
      <div
        className="rounded-2xl px-5 py-4 flex items-center justify-between gap-4 flex-wrap"
        style={{ background: 'linear-gradient(135deg, #f43f5e, #fb7185)' }}
      >
        <div>
          <div className="text-white font-extrabold text-[16px]">Emergency? Raise SOS</div>
          <div className="text-white/85 text-[12.5px] mt-0.5">Instantly notifies the Operations Manager and on-call support with your location.</div>
        </div>
        <Button
          className="shrink-0"
          style={{ background: 'white', color: '#e11d48' }}
          onClick={() => setModalOpen(true)}
        >
          <FiAlertTriangle size={14} /> Raise SOS
        </Button>
      </div>

      <div className="grid gap-3" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))' }}>
        <KpiTile label="Open" value={String(kpis.open)} tone="rose" icon={FiAlertTriangle} />
        <KpiTile label="Total" value={String(kpis.total)} tone="brand" icon={FiFolder} />
        <KpiTile label="Resolved" value={String(kpis.resolved)} tone="teal" icon={FiCheckCircle} />
        <KpiTile label="Closed" value={String(kpis.closed)} tone="emerald" icon={FiXCircle} />
      </div>

      <div className="rounded-xl border overflow-hidden" style={{ background: 'var(--qms-surface)', borderColor: 'var(--qms-border)' }}>
        <div className="px-3.5 py-2.5 text-[12px] font-bold uppercase tracking-wide border-b" style={{ borderColor: 'var(--qms-border)', color: 'var(--qms-text-muted)' }}>My tickets</div>
        <div>
          {rows.map((i) => {
            const Icon = CATEGORY_ICON[i.category] ?? FiHelpCircle
            return (
              <div key={i.id} className="flex items-start gap-3 px-3.5 py-3 border-t" style={{ borderColor: 'var(--qms-border)' }}>
                <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0" style={{ background: 'var(--qms-surface-strong)', color: 'var(--qms-text-soft)' }}>
                  <Icon size={14} />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="font-semibold truncate" style={{ color: 'var(--qms-text)' }}>{i.title} <span className="font-normal" style={{ color: 'var(--qms-text-muted)' }}>· {i.id}</span></div>
                  <div className="text-[11.5px]" style={{ color: 'var(--qms-text-muted)' }}>{i.campId ?? '—'} · {new Date(i.createdAt).toLocaleString('en-IN')}</div>
                  <div className="text-[12px] mt-0.5 truncate" style={{ color: 'var(--qms-text-soft)' }}>{i.notes}</div>
                </div>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full shrink-0" style={{ background: STATUS_STYLE[i.status]?.bg, color: STATUS_STYLE[i.status]?.color }}>{i.status}</span>
              </div>
            )
          })}
          {rows.length === 0 && (
            <div className="text-center py-8 text-[13px]" style={{ color: 'var(--qms-text-muted)' }}>No tickets raised yet.</div>
          )}
        </div>
      </div>

      <RaiseSosModal
        open={modalOpen}
        me={me}
        camps={camps}
        devices={devices}
        defaultCategory={prefillCategory}
        defaultDeviceId={prefillDeviceId}
        onClose={closeModal}
        onSubmit={handleSubmit}
      />
    </div>
  )
}

export default IncidentsModule
