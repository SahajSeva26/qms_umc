import { useState } from 'react'
import { FiPhone, FiMail, FiLifeBuoy, FiDownload } from 'react-icons/fi'
import type { Person } from '@/types/people.types'
import type { Camp } from '@/types/camp.types'
import type { DeviceCatalogItem } from '@/types/device.types'
import type { Incident, IncidentSeverity } from '@/features/fo/fo.types'
import { Button } from '@/components/ui/button'
import FaqAccordion from '@/features/fo/components/workspace/FaqAccordion'
import RaiseSosModal from '@/features/fo/components/workspace/RaiseSosModal'
import { toast } from '@/components/ui/sonner'

interface HelpModuleProps {
  me: Person
  camps: Camp[]
  devices: DeviceCatalogItem[]
  raiseIncident: (incident: Omit<Incident, 'id' | 'status' | 'createdAt'>) => Promise<unknown>
}

const CONTACTS = [
  { role: 'Operations Manager', phone: '+91 9810010001', email: 'ops@qms.health' },
  { role: 'Service Engineer', phone: '+91 9810010002', email: 'service@qms.health' },
  { role: 'HR', phone: '+91 9810010003', email: 'hr@qms.health' },
  { role: 'Compliance', phone: '+91 9810010004', email: 'compliance@qms.health' },
]

const DOWNLOADS = ['FO Handbook', 'SOP pack', 'DPDP consent template']

const HelpModule = ({ me, camps, devices, raiseIncident }: HelpModuleProps) => {
  const [ticketOpen, setTicketOpen] = useState(false)

  const handleSubmit = (incident: { category: Incident['category']; campId?: string; deviceId?: string; title: string; notes: string; severity: IncidentSeverity }) => {
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
    toast.success('Support ticket raised')
  }

  return (
    <div className="grid gap-4" style={{ gridTemplateColumns: 'minmax(0,1.4fr) minmax(0,1fr)' }}>
      <div className="rounded-xl border p-3.5" style={{ background: 'var(--qms-surface)', borderColor: 'var(--qms-border)' }}>
        <div className="text-[11px] font-bold uppercase tracking-wide mb-1" style={{ color: 'var(--qms-text-muted)' }}>Frequently asked questions</div>
        <FaqAccordion />
      </div>

      <div className="space-y-4">
        <div className="rounded-xl border p-3.5" style={{ background: 'var(--qms-surface)', borderColor: 'var(--qms-border)' }}>
          <div className="text-[11px] font-bold uppercase tracking-wide mb-2.5" style={{ color: 'var(--qms-text-muted)' }}>Contacts</div>
          <div className="space-y-3">
            {CONTACTS.map((c) => (
              <div key={c.role} className="text-[13px]">
                <div className="font-semibold" style={{ color: 'var(--qms-text)' }}>{c.role}</div>
                <div className="flex flex-wrap gap-x-3 gap-y-0.5 text-[12px] mt-0.5" style={{ color: 'var(--qms-text-muted)' }}>
                  <span className="inline-flex items-center gap-1"><FiPhone size={11} /> {c.phone}</span>
                  <span className="inline-flex items-center gap-1"><FiMail size={11} /> {c.email}</span>
                </div>
              </div>
            ))}
          </div>
          <Button className="w-full mt-3.5" onClick={() => setTicketOpen(true)}><FiLifeBuoy size={13} /> Raise support ticket</Button>
        </div>

        <div className="rounded-xl border p-3.5" style={{ background: 'var(--qms-surface)', borderColor: 'var(--qms-border)' }}>
          <div className="text-[11px] font-bold uppercase tracking-wide mb-2.5" style={{ color: 'var(--qms-text-muted)' }}>Downloads</div>
          <div className="space-y-1.5">
            {DOWNLOADS.map((d) => (
              <button
                key={d}
                onClick={() => toast.info(`${d} would download here`)}
                className="w-full flex items-center gap-2 text-[12.5px] font-semibold px-2.5 py-2 rounded-lg text-left transition-colors hover:bg-(--qms-surface-hover)"
                style={{ color: 'var(--qms-text-soft)' }}
              >
                <FiDownload size={13} /> {d}
              </button>
            ))}
          </div>
        </div>
      </div>

      <RaiseSosModal
        open={ticketOpen}
        me={me}
        camps={camps}
        devices={devices}
        onClose={() => setTicketOpen(false)}
        onSubmit={handleSubmit}
      />
    </div>
  )
}

export default HelpModule
