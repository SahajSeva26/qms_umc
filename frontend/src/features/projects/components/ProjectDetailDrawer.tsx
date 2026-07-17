import type { ReactNode } from 'react'
import type { Camp } from '@/types/camp.types'
import type { Project } from '@/types/project.types'
import { CLIENTS, DIVISIONS } from '@/types/client.types'
import { SALES_PEOPLE, COORDINATOR_PEOPLE, MARKETING_CONTACTS } from '@/features/projects/projects.mock'
import { formatDate, formatINR } from '@/utils/formatters'
import { executedCamps, totalPoCamps } from '@/features/projects/projects.utils'
import SideDrawer from '@/components/ui/SideDrawer'
import ProjectStatusPill from '@/features/projects/components/ProjectStatusPill'
import ProjectTypePill from '@/features/projects/components/ProjectTypePill'

function personName(list: { id: string; name: string }[], id: string): string {
  return list.find((p) => p.id === id)?.name ?? '—'
}

const Row = ({ label, value }: { label: string; value: ReactNode }) => (
  <div className="flex justify-between gap-3 py-1.5 text-[13px]" style={{ borderBottom: '1px solid var(--qms-border)' }}>
    <span style={{ color: 'var(--qms-text-muted)' }}>{label}</span>
    <span className="text-right font-semibold" style={{ color: 'var(--qms-text)' }}>{value}</span>
  </div>
)

interface ProjectDetailDrawerProps {
  project: Project | null
  camps: Camp[]
  onClose: () => void
}

const ProjectDetailDrawer = ({ project, camps, onClose }: ProjectDetailDrawerProps) => {
  const client = project ? CLIENTS.find((c) => c.id === project.clientId) : undefined
  const division = project ? DIVISIONS.find((d) => d.id === project.divisionId) : undefined

  return (
    <SideDrawer open={!!project} title={project ? `${project.id} · ${project.name}` : ''} onClose={onClose} widthClassName="max-w-lg">
      {project && (
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <ProjectTypePill type={project.type} />
            <ProjectStatusPill status={project.status} />
          </div>

          <div>
            <div className="text-[10px] font-semibold tracking-widest uppercase mb-1.5" style={{ color: 'var(--qms-text-muted)' }}>Overview</div>
            <Row label="Client" value={client?.name ?? '—'} />
            <Row label="Division" value={division?.name ?? '—'} />
            <Row label="Therapy" value={project.therapy || '—'} />
            <Row label="Execution mode" value={project.executionMode} />
            {project.executionMode === 'PO' && <Row label="PO number" value={project.poNo || '—'} />}
            <Row label="Total value" value={formatINR(project.valueAfterGst)} />
            <Row label="Camps" value={`${executedCamps(project, camps)}/${totalPoCamps(project)}`} />
          </div>

          <div>
            <div className="text-[10px] font-semibold tracking-widest uppercase mb-1.5" style={{ color: 'var(--qms-text-muted)' }}>Scope</div>
            <Row label="Go-live scope" value={project.goLiveScope === 'PAN_INDIA' ? 'PAN-India' : project.goLiveDetails.join(', ') || '—'} />
            <Row label="Booking hierarchy" value={project.bookingHierarchy.join(' · ')} />
            <Row label="Camp slots" value={`${project.campTimeSlots.length} selected`} />
          </div>

          <div>
            <div className="text-[10px] font-semibold tracking-widest uppercase mb-1.5" style={{ color: 'var(--qms-text-muted)' }}>Team</div>
            <Row label="Sales" value={personName(SALES_PEOPLE, project.salesPersonId)} />
            <Row label="Coordinator" value={personName(COORDINATOR_PEOPLE, project.coordinatorId)} />
            <Row label="Pharma marketing" value={MARKETING_CONTACTS.find((m) => m.id === project.marketingContactId)?.name ?? '—'} />
            <Row label="Payment terms" value={project.paymentTerms || '—'} />
          </div>

          {project.pos.length > 0 && (
            <div>
              <div className="text-[10px] font-semibold tracking-widest uppercase mb-1.5" style={{ color: 'var(--qms-text-muted)' }}>Purchase orders</div>
              {project.pos.map((po) => (
                <div key={po.id} className="flex justify-between gap-3 py-1.5 text-[13px]" style={{ borderBottom: '1px solid var(--qms-border)' }}>
                  <span style={{ color: 'var(--qms-text)' }}>{po.poNo}</span>
                  <span style={{ color: 'var(--qms-text-muted)' }}>{po.campCount} camps · {formatINR(po.value)}</span>
                </div>
              ))}
            </div>
          )}

          {project.voidCamps.length > 0 && (
            <div>
              <div className="text-[10px] font-semibold tracking-widest uppercase mb-1.5" style={{ color: 'var(--qms-text-muted)' }}>Void camps</div>
              {project.voidCamps.map((v) => (
                <Row key={v.id} label={`${formatDate(v.date)} · ${v.doctorName}`} value={v.approvedBy} />
              ))}
            </div>
          )}

          {project.status === 'CLOSED' && project.closeReason && (
            <div>
              <div className="text-[10px] font-semibold tracking-widest uppercase mb-1.5" style={{ color: 'var(--qms-text-muted)' }}>Close reason</div>
              <p className="text-[13px]" style={{ color: 'var(--qms-text)' }}>{project.closeReason}</p>
            </div>
          )}

          {project.statusHistory.length > 0 && (
            <div>
              <div className="text-[10px] font-semibold tracking-widest uppercase mb-1.5" style={{ color: 'var(--qms-text-muted)' }}>Status history</div>
              {[...project.statusHistory].reverse().map((h, i) => (
                <div key={i} className="text-[12px] py-1" style={{ color: 'var(--qms-text-muted)' }}>
                  {h.from} → {h.to} · {h.reason} · {formatDate(h.at)} by {h.by}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </SideDrawer>
  )
}

export default ProjectDetailDrawer
