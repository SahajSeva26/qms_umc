import type { ReactNode } from 'react'
import type { ProjectEntity } from '@/types/project.types'
import { EXECUTION_MODE_LABEL, PAYMENT_TERMS_LABEL, PROJECT_THERAPY_LABEL } from '@/types/project.types'
import { computeGstBreakdown, projectDivisionName, projectTenantName } from '@/features/projects/projects.utils'
import { formatDate, formatINR } from '@/utils/formatters'
import SideDrawer from '@/components/ui/SideDrawer'
import ProjectStatusPill from '@/features/projects/components/ProjectStatusPill'
import ProjectTypePills from '@/features/projects/components/ProjectTypePill'

// Prototype's dv() (projects-manager.js:1965) — stacked label-over-value pair, no divider line,
// rendered in a 2-column grid (see RowGrid below).
const Row = ({ label, value }: { label: string; value: ReactNode }) => (
  <div>
    <div className="text-[10px] font-bold uppercase tracking-[.04em]" style={{ color: 'var(--qms-text-muted)' }}>{label}</div>
    <div className="text-[12px] font-semibold mt-0.5 wrap-break-word" style={{ color: 'var(--qms-text)' }}>{value}</div>
  </div>
)

// Prototype's "More details" wrapper (projects-manager.js:2075) — repeat(2,1fr) grid, 8px/16px gap.
const RowGrid = ({ children }: { children: ReactNode }) => (
  <div className="grid grid-cols-2 gap-x-4 gap-y-2">{children}</div>
)

// Prototype's sectionH() (projects-manager.js:2016) — 11px/800/uppercase/.06em.
const SectionLabel = ({ children }: { children: ReactNode }) => (
  <div className="text-[11px] font-extrabold tracking-[.06em] uppercase mb-1.5" style={{ color: 'var(--qms-text-muted)' }}>
    {children}
  </div>
)

// Prototype's drawer kpi() tile (projects-manager.js:1959) shows 5 tiles built off a pos[] array
// and an executed-camp counter our model has neither of — only Total camps/Value are real here.
const KpiTile = ({ label, value }: { label: string; value: ReactNode }) => (
  <div
    className="flex-1 min-w-27.5 px-3 py-2.5 rounded-[10px] border"
    style={{ borderColor: 'var(--qms-border)', background: 'var(--qms-surface)' }}
  >
    <div className="text-[10px] font-bold uppercase tracking-[.04em]" style={{ color: 'var(--qms-text-muted)' }}>{label}</div>
    <div className="text-[16px] font-extrabold mt-0.5" style={{ color: 'var(--qms-text)' }}>{value}</div>
  </div>
)

// All 3 helpers below guard against `null`/`undefined` even though
// salesRep/projectCoordinator/marketingContact/lead are all `required: true`
// in project.model.ts — that only enforces new saves, it doesn't retroactively
// backfill older documents, and a populate() can also resolve to null if the
// referenced doc was since deleted or the field held a stale/pre-migration
// reference (e.g. marketingContact's Role→Contact switch, 2026-08-03). Found
// live 2026-08-04: "Independent audit repro project" crashed the whole page
// with "Cannot read properties of null (reading 'name')" on marketingContact.
function roleName(role: ProjectEntity['salesRep']): string {
  if (!role) return '—'
  return typeof role === 'string' ? role : role.name
}

// marketingContact is a Contact reference, not a Role — switched 2026-08-03
// (project.model.ts's marketingContact.ref) — separate helper since Contact
// and Role are different populated shapes, even though both expose `.name`.
function contactName(contact: ProjectEntity['marketingContact']): string {
  if (!contact) return '—'
  return typeof contact === 'string' ? contact : contact.name
}

function leadTitle(lead: ProjectEntity['lead']): string {
  if (!lead) return '—'
  return typeof lead === 'string' ? lead : lead.title
}

interface ProjectDetailDrawerProps {
  project: ProjectEntity | null
  onClose: () => void
}

// Rebuilt against the real populated relations — Purchase-orders (no pos[] array), Void camps,
// and Camps done have no equivalent on our Project model (see md-files/ui-revisions.md).
const ProjectDetailDrawer = ({ project, onClose }: ProjectDetailDrawerProps) => {
  const gst = project ? computeGstBreakdown(project.valueBeforeGST, project.gst) : null
  // Prototype's drawer subtitle is "{id} · {client} · {division} · {type}" under the name
  // (projects-manager.js's renderProjectDetail()). Folded into SideDrawer's single `title` string.
  const title = project
    ? `${project.name} — ${project.code} · ${projectTenantName(project)} · ${projectDivisionName(project)}`
    : ''

  return (
    <SideDrawer open={!!project} title={title} onClose={onClose} widthClassName="max-w-lg">
      {project && (
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <ProjectTypePills types={project.type} />
            <ProjectStatusPill status={project.status} />
          </div>

          <div className="flex flex-wrap gap-2">
            <KpiTile label="Total camps" value={project.totalCamps} />
            <KpiTile label="Project value" value={gst ? formatINR(gst.valueAfterGST) : '—'} />
          </div>

          <div>
            <SectionLabel>Overview</SectionLabel>
            <RowGrid>
              <Row label="Company" value={projectTenantName(project)} />
              <Row label="Division" value={projectDivisionName(project)} />
              <Row label="Source lead" value={leadTitle(project.lead)} />
              <Row label="Therapy" value={PROJECT_THERAPY_LABEL[project.therapy] ?? project.therapy} />
              <Row label="Execution mode" value={project.mode ? EXECUTION_MODE_LABEL[project.mode.mode] : '—'} />
              {project.mode?.mode === 'po' && <Row label="PO number" value={project.mode.poNumber || '—'} />}
            </RowGrid>
          </div>

          <div>
            <SectionLabel>Scope</SectionLabel>
            <RowGrid>
              <Row label="Go-live scope" value={project.goLiveScope ? (project.goLiveScope.code === 'pan' ? 'PAN-India' : project.goLiveScope.values.join(', ') || '—') : '—'} />
              <Row label="Who can book" value={project.whoCanBookCamp.join(' · ') || '—'} />
              <Row label="Camp slots" value={`${project.campTimeSlots.length} selected`} />
            </RowGrid>
          </div>

          <div>
            <SectionLabel>Team</SectionLabel>
            <RowGrid>
              <Row label="Sales rep" value={roleName(project.salesRep)} />
              <Row label="Coordinator" value={roleName(project.projectCoordinator)} />
              <Row label="Pharma marketing" value={contactName(project.marketingContact)} />
              <Row label="Payment terms" value={PAYMENT_TERMS_LABEL[project.paymentTerms] ?? project.paymentTerms} />
            </RowGrid>
          </div>

          <div>
            <SectionLabel>More details</SectionLabel>
            <RowGrid>
              <Row label="Value before GST" value={formatINR(project.valueBeforeGST)} />
              <Row label="Value after GST" value={gst ? formatINR(gst.valueAfterGST) : '—'} />
              <Row label="GST %" value={`${project.gst}%`} />
              <Row label="Camp cost" value={formatINR(project.campCost)} />
              <Row label="Booking lead days" value={String(project.daysToBookBefore)} />
              <Row label="Owner" value={roleName(project.salesRep)} />
              <Row label="Created" value={formatDate(project.createdAt)} />
              <Row label="Updated" value={formatDate(project.updatedAt)} />
            </RowGrid>
          </div>

          {project.stageHistory.length > 0 && (
            <div>
              <SectionLabel>Status history</SectionLabel>
              {[...project.stageHistory].reverse().map((h, i) => (
                <div key={i} className="text-[12px] py-1" style={{ color: 'var(--qms-text-muted)' }}>
                  {h.from} → {h.to} · {h.reason}
                  {(h.actor?.name || h.actor?.email) && <> · {h.actor.name || h.actor.email}</>}
                  {' · '}{formatDate(h.createdAt)}
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
