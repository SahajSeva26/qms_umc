import type { ReactNode } from 'react'
import type { ProjectEntity } from '@/types/project.types'
import { EXECUTION_MODE_LABEL, PAYMENT_TERMS_LABEL, PROJECT_THERAPY_LABEL } from '@/types/project.types'
import { computeGstBreakdown, projectDivisionName, projectTenantName } from '@/features/projects/projects.utils'
import { formatDate, formatINR } from '@/utils/formatters'
import SideDrawer from '@/components/ui/SideDrawer'
import ProjectStatusPill from '@/features/projects/components/ProjectStatusPill'
import ProjectTypePills from '@/features/projects/components/ProjectTypePill'

const Row = ({ label, value }: { label: string; value: ReactNode }) => (
  <div className="flex justify-between gap-3 py-1.5 text-[13px]" style={{ borderBottom: '1px solid var(--qms-border)' }}>
    <span style={{ color: 'var(--qms-text-muted)' }}>{label}</span>
    <span className="text-right font-semibold" style={{ color: 'var(--qms-text)' }}>{value}</span>
  </div>
)

function roleName(role: ProjectEntity['salesRep']): string {
  return typeof role === 'string' ? role : role.name
}

function leadTitle(lead: ProjectEntity['lead']): string {
  return typeof lead === 'string' ? lead : lead.title
}

interface ProjectDetailDrawerProps {
  project: ProjectEntity | null
  onClose: () => void
}

// Rebuilt against the real populated relations — Purchase-orders section (no
// pos[] array exists), Void-camps section (no concept on Project), and the
// standalone Close-reason paragraph are all dropped; the Status-history
// section is kept (renamed to read stageHistory with real field names —
// createdBy/createdAt instead of by/at — structurally almost identical to
// the old mock's statusHistory).
const ProjectDetailDrawer = ({ project, onClose }: ProjectDetailDrawerProps) => {
  const gst = project ? computeGstBreakdown(project.valueBeforeGST, project.gst) : null

  return (
    <SideDrawer open={!!project} title={project ? project.name : ''} onClose={onClose} widthClassName="max-w-lg">
      {project && (
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <ProjectTypePills types={project.type} />
            <ProjectStatusPill status={project.status} />
          </div>

          <div>
            <div className="text-[10px] font-semibold tracking-widest uppercase mb-1.5" style={{ color: 'var(--qms-text-muted)' }}>Overview</div>
            <Row label="Company" value={projectTenantName(project)} />
            <Row label="Division" value={projectDivisionName(project)} />
            <Row label="Source lead" value={leadTitle(project.lead)} />
            <Row label="Therapy" value={PROJECT_THERAPY_LABEL[project.therapy] ?? project.therapy} />
            <Row label="Execution mode" value={project.mode ? EXECUTION_MODE_LABEL[project.mode.mode] : '—'} />
            {project.mode?.mode === 'po' && <Row label="PO number" value={project.mode.poNumber || '—'} />}
            <Row label="Total value" value={gst ? formatINR(gst.valueAfterGST) : '—'} />
            <Row label="Total camps" value={String(project.totalCamps)} />
          </div>

          <div>
            <div className="text-[10px] font-semibold tracking-widest uppercase mb-1.5" style={{ color: 'var(--qms-text-muted)' }}>Scope</div>
            <Row label="Go-live scope" value={project.goLiveScope ? (project.goLiveScope.code === 'pan' ? 'PAN-India' : project.goLiveScope.values.join(', ') || '—') : '—'} />
            <Row label="Who can book" value={project.whoCanBookCamp.join(' · ') || '—'} />
            <Row label="Camp slots" value={`${project.campTimeSlots.length} selected`} />
          </div>

          <div>
            <div className="text-[10px] font-semibold tracking-widest uppercase mb-1.5" style={{ color: 'var(--qms-text-muted)' }}>Team</div>
            <Row label="Sales rep" value={roleName(project.salesRep)} />
            <Row label="Coordinator" value={roleName(project.projectCoordinator)} />
            <Row label="Pharma marketing" value={roleName(project.marketingContact)} />
            <Row label="Payment terms" value={PAYMENT_TERMS_LABEL[project.paymentTerms] ?? project.paymentTerms} />
          </div>

          {project.stageHistory.length > 0 && (
            <div>
              <div className="text-[10px] font-semibold tracking-widest uppercase mb-1.5" style={{ color: 'var(--qms-text-muted)' }}>Status history</div>
              {[...project.stageHistory].reverse().map((h, i) => (
                <div key={i} className="text-[12px] py-1" style={{ color: 'var(--qms-text-muted)' }}>
                  {h.from} → {h.to} · {h.reason} · {formatDate(h.createdAt)}
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
