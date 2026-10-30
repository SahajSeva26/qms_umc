import { useState, type ReactNode } from 'react'
import { FiPlus } from 'react-icons/fi'
import type { ProjectEntity, PurchaseOrder } from '@/types/project.types'
import { AVAILABLE_POINTER_LABEL, CLIENT_REPORT_CADENCE_LABEL, EXECUTION_MODE_LABEL, PAYMENT_TERMS_LABEL, PROJECT_THERAPY_LABEL } from '@/types/project.types'
import { computeGstBreakdown, projectDivisionName, projectTenantName } from '@/features/projects/projects.utils'
import { formatDate, formatINR } from '@/utils/formatters'
import SideDrawer from '@/components/ui/SideDrawer'
import ProjectStatusPill from '@/features/projects/components/ProjectStatusPill'
import ProjectTypePills from '@/features/projects/components/ProjectTypePill'
import AddPurchaseOrderDialog from '@/features/projects/components/AddPurchaseOrderDialog'
import { Button } from '@/components/ui/button'

// Prototype's dv() (projects-manager.js:1965)
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

// Keep the drawer header intentionally compact. The remaining real backend-backed values,
// including executed camps when report=true, live in More details below.
const KpiTile = ({ label, value }: { label: string; value: ReactNode }) => (
  <div
    className="flex-1 min-w-27.5 px-3 py-2.5 rounded-[10px] border"
    style={{ borderColor: 'var(--qms-border)', background: 'var(--qms-surface)' }}
  >
    <div className="text-[10px] font-bold uppercase tracking-[.04em]" style={{ color: 'var(--qms-text-muted)' }}>{label}</div>
    <div className="text-[16px] font-extrabold mt-0.5" style={{ color: 'var(--qms-text)' }}>{value}</div>
  </div>
)

// Guard against null even though these fields are `required: true` — populate() can
// resolve to null for deleted/stale refs (crashed live on 2026-08-04 without this guard).
function roleName(role: ProjectEntity['salesRep']): string {
  if (!role) return '—'
  return typeof role === 'string' ? role : role.name
}

// marketingContact is a Contact reference, not a Role — separate helper since the two
// populated shapes differ even though both expose `.name`.
function contactName(contact: ProjectEntity['marketingContact']): string {
  if (!contact) return '—'
  return typeof contact === 'string' ? contact : contact.name
}

function leadTitle(lead: ProjectEntity['lead']): string {
  if (!lead) return '—'
  return typeof lead === 'string' ? lead : lead.title
}

function getLatestPurchaseOrder(purchaseOrders: PurchaseOrder[]): PurchaseOrder | undefined {
  if (purchaseOrders.length === 0) return undefined

  const datedOrders = purchaseOrders
    .map((purchaseOrder, index) => ({ purchaseOrder, index, timestamp: purchaseOrder.date ? Date.parse(purchaseOrder.date) : Number.NaN }))
    .filter(({ timestamp }) => Number.isFinite(timestamp))

  if (datedOrders.length === 0) return purchaseOrders.at(-1)
  return datedOrders.reduce((latest, candidate) => (
    candidate.timestamp > latest.timestamp || (candidate.timestamp === latest.timestamp && candidate.index > latest.index)
      ? candidate
      : latest
  )).purchaseOrder
}

interface ProjectDetailDrawerProps {
  project: ProjectEntity | null
  onClose: () => void
  canEdit: boolean
}

const ProjectDetailDrawer = ({ project, onClose, canEdit }: ProjectDetailDrawerProps) => {
  const [addingPo, setAddingPo] = useState(false)
  const gst = project ? computeGstBreakdown(project.valueBeforeGST, project.gst) : null
  const purchaseOrders = project?.executionMode?.mode === 'po' ? (project.executionMode.po?.purchaseOrders ?? []) : []
  const currentPurchaseOrder = getLatestPurchaseOrder(purchaseOrders)
  // Prototype's drawer subtitle is "{id} · {client} · {division} · {type}" under the name
  // (projects-manager.js's renderProjectDetail()). Folded into SideDrawer's single `title` string.
  const title = project
    ? `${project.name} — ${project.code} · ${projectTenantName(project)} · ${projectDivisionName(project)}`
    : ''

  const handleClose = () => {
    setAddingPo(false)
    onClose()
  }

  return (
    <SideDrawer open={!!project} title={title} onClose={handleClose} widthClassName="max-w-lg">
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
              <Row label="Execution mode" value={project.executionMode ? EXECUTION_MODE_LABEL[project.executionMode.mode] : '—'} />
              {project.executionMode?.mode === 'po' && (
                <Row
                  label={`Purchase order${(project.executionMode.po?.purchaseOrders?.length ?? 0) > 1 ? 's' : ''}`}
                  value={
                    project.executionMode.po?.purchaseOrders?.length
                      ? project.executionMode.po.purchaseOrders.map((po) => po.number || '—').join(', ')
                      : '—'
                  }
                />
              )}
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

          {project.executionMode?.mode === 'po' && (
            <div className="space-y-4">
              {currentPurchaseOrder && (
                <section aria-label="Current execution PO">
                  <SectionLabel>Current execution PO</SectionLabel>
                  <div className="rounded-[10px] border px-3 py-3" style={{ borderColor: 'var(--qms-brand)', background: 'color-mix(in srgb, var(--qms-brand) 7%, transparent)' }}>
                    <div className="text-[13px] font-extrabold mb-2" style={{ color: 'var(--qms-text)' }}>{currentPurchaseOrder.number || '—'}</div>
                    <div className="grid grid-cols-2 gap-x-4 gap-y-2">
                      <Row label="PO date" value={currentPurchaseOrder.date ? formatDate(currentPurchaseOrder.date) : '—'} />
                      <Row label="PO expiry" value={currentPurchaseOrder.expiry ? formatDate(currentPurchaseOrder.expiry) : '—'} />
                    </div>
                  </div>
                </section>
              )}
              <div className="flex items-center justify-between gap-3 mb-1.5">
                <SectionLabel>PO history</SectionLabel>
                {canEdit && (
                  <Button variant="outline" size="sm" onClick={() => setAddingPo(true)}>
                    <FiPlus size={13} /> Add PO
                  </Button>
                )}
              </div>
              {purchaseOrders.length === 0 ? (
                <p className="text-[12px] rounded-lg border border-dashed px-3 py-4 text-center" style={{ color: 'var(--qms-text-muted)', borderColor: 'var(--qms-border)' }}>
                  No purchase orders recorded.
                </p>
              ) : (
                <div className="overflow-x-auto rounded-lg border" style={{ borderColor: 'var(--qms-border)' }}>
                  <table aria-label="Purchase order history" className="w-full min-w-[440px] text-left border-collapse">
                    <thead>
                      <tr style={{ background: 'var(--qms-surface)' }}>
                        {['PO no', 'Date', 'Expiry'].map((label) => (
                          <th key={label} className="px-3 py-2 text-[10px] font-bold uppercase tracking-[.05em]" style={{ color: 'var(--qms-text-muted)' }}>{label}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {purchaseOrders.map((po, index) => (
                        <tr key={`${po.number ?? 'po'}-${po.date ?? index}-${index}`} className="border-t" style={{ borderColor: 'var(--qms-border)' }}>
                          <td className="px-3 py-2 text-[12px] font-semibold" style={{ color: 'var(--qms-text)' }}>
                            <span className="inline-flex items-center gap-1.5">
                              {po.number || '—'}
                              {po === currentPurchaseOrder && (
                                <span className="rounded-full px-1.5 py-0.5 text-[8px] font-extrabold uppercase tracking-wide" style={{ color: 'var(--qms-brand)', background: 'color-mix(in srgb, var(--qms-brand) 10%, transparent)' }}>
                                  Current
                                </span>
                              )}
                            </span>
                          </td>
                          <td className="px-3 py-2 text-[12px]" style={{ color: 'var(--qms-text-muted)' }}>{po.date ? formatDate(po.date) : '—'}</td>
                          <td className="px-3 py-2 text-[12px]" style={{ color: 'var(--qms-text-muted)' }}>{po.expiry ? formatDate(po.expiry) : '—'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          <div>
            <SectionLabel>More details</SectionLabel>
            <RowGrid>
              <Row label="Value before GST" value={formatINR(project.valueBeforeGST)} />
              <Row label="Value after GST" value={gst ? formatINR(gst.valueAfterGST) : '—'} />
              <Row label="GST %" value={`${project.gst}%`} />
              <Row label="Camp cost" value={formatINR(project.campCost)} />
              <Row label="Additional cost" value={formatINR(project.additionalCost)} />
              <Row label="Camps done / total" value={project.stats ? `${project.stats.executedCamps} / ${project.totalCamps}` : `— / ${project.totalCamps}`} />
              <Row label="Booking lead days" value={String(project.daysToBookBefore)} />
              <Row label="Free cancellation" value={`${project.freeCancelHours} hours`} />
              <Row label="Cancellation allowance" value={`${project.cancellationAllowed}%`} />
              <Row label="Chargeable-cancel deduction" value={`${project.campCostDeductionOnChargableCancel}%`} />
              <Row label="Earliest slot" value={project.effectiveEarliestSlot ? formatDate(project.effectiveEarliestSlot) : '—'} />
              <Row label="PO renewal reminder" value={`${project.poRenewalReminder}%`} />
              <Row label="Client report cadence" value={project.clientReportCandance ? CLIENT_REPORT_CADENCE_LABEL[project.clientReportCandance] : '—'} />
              <Row label="Report pointers" value={project.availablePointers.map((pointer) => AVAILABLE_POINTER_LABEL[pointer] ?? pointer).join(', ') || '—'} />
              <Row label="TAT / notes" value={project.tats || '—'} />
              <Row label="SOP" value={project.sops || '—'} />
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
      {project && addingPo && <AddPurchaseOrderDialog project={project} onClose={() => setAddingPo(false)} />}
    </SideDrawer>
  )
}

export default ProjectDetailDrawer
