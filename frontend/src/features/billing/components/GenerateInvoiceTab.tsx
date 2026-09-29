import { useCallback, useRef, useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { FiFilePlus } from 'react-icons/fi'
import type { ProjectEntity } from '@/types/project.types'
import type { ApiResponse } from '@/types/common.types'
import { billingProjectsService } from '@/features/billing/billingProjects.service'
import { useEligibleInvoiceCamps } from '@/features/billing/hooks/useEligibleInvoiceCamps'
import { useCreateInvoice } from '@/features/billing/hooks/useCreateInvoice'
import { createInvoiceSchema } from '@/features/billing/schemas/invoice.schemas'
import CampSelectionRow from '@/features/billing/components/CampSelectionRow'
import BillingProjectPicker from '@/features/billing/components/BillingProjectPicker'
import QueryStateBlock from '@/components/ui/QueryStateBlock'
import { Button } from '@/components/ui/button'
import { getApiErrorMessage } from '@/utils/apiError'

interface GenerateInvoiceTabProps {
  onCreated: (invoiceId: string) => void
}

// Ported from GenerateInvoiceDialog.tsx's logic, rendered as inline tab
// content (prototype's "Generate Invoice" page tab) instead of a modal —
// same two real steps: pick a project, then pick camps to bill. PO
// position / FOC / chargeability-approval queue from the prototype's
// prebillPreviewHtml() are skipped — no backing fields on our real
// Invoice/InvoiceLineItem model (see md-files/ui-revisions.md).
const GenerateInvoiceTab = ({ onCreated }: GenerateInvoiceTabProps) => {
  const queryClient = useQueryClient()
  const [projectId, setProjectId] = useState('')
  const [projectLabel, setProjectLabel] = useState('')
  const { data: projectData } = useQuery<ApiResponse<ProjectEntity>>({
    queryKey: ['billing', 'project', projectId],
    queryFn: () => billingProjectsService.getProject(projectId),
    enabled: false,
  })
  const project = projectId && projectData ? projectData.data : null

  const [confirmedProjectId, setConfirmedProjectId] = useState<string | null>(null)
  const [confirming, setConfirming] = useState(false)
  const [confirmError, setConfirmError] = useState(false)
  const operationTokenRef = useRef(0)

  const confirmProject = async (id: string, token: number) => {
    setConfirming(true)
    setConfirmedProjectId(null)
    setConfirmError(false)
    try {
      const res = await billingProjectsService.getProject(id)
      if (operationTokenRef.current !== token) return
      queryClient.setQueryData<ApiResponse<ProjectEntity>>(['billing', 'project', id], res)
      setConfirmedProjectId(id)
    } catch {
      if (operationTokenRef.current !== token) return
      setConfirmError(true)
    } finally {
      if (operationTokenRef.current === token) setConfirming(false)
    }
  }

  const handleProjectChange = (id: string, label: string) => {
    operationTokenRef.current += 1
    setProjectId(id)
    setProjectLabel(label)
    setConfirmedProjectId(null)
    setConfirmError(false)
    if (id) confirmProject(id, operationTokenRef.current)
  }

  const retryConfirmProject = () => {
    operationTokenRef.current += 1
    confirmProject(projectId, operationTokenRef.current)
  }

  return (
    <div>
      <div
        className="rounded-xl border p-3.5 mb-3 flex items-center gap-3 flex-wrap"
        style={{ borderColor: 'var(--qms-border)', background: 'var(--qms-surface-card)' }}
      >
        <div className="flex items-center gap-1.5 font-extrabold text-[13px]" style={{ color: 'var(--qms-text)' }}>
          <FiFilePlus size={14} /> Generate CRM invoice
        </div>
        <div className="w-80">
          <BillingProjectPicker value={projectId} label={projectLabel} onChange={handleProjectChange} />
        </div>
      </div>

      {projectId && confirmError && (
        <div className="flex items-center justify-between gap-3 text-[13px] rounded-xl px-3 py-2 mb-3 bg-danger-soft border border-danger text-danger">
          <span>Couldn't load this project.</span>
          <Button variant="outline" size="sm" onClick={retryConfirmProject} className="shrink-0">Retry</Button>
        </div>
      )}

      {!projectId && (
        <div className="rounded-xl border p-6 text-center text-[13px]" style={{ borderColor: 'var(--qms-border)', color: 'var(--qms-text-muted)' }}>
          Pick a project above to see its billable camps.
        </div>
      )}

      {projectId && !confirming && !confirmError && confirmedProjectId === projectId && !project && (
        <p className="text-[13px]" style={{ color: 'var(--qms-text-muted)' }}>This project could not be found.</p>
      )}

      {project && confirmedProjectId === projectId && (
        <GenerateInvoiceCampPanel project={project} onCreated={onCreated} />
      )}
    </div>
  )
}

interface GenerateInvoiceCampPanelProps {
  project: ProjectEntity
  onCreated: (invoiceId: string) => void
}

const GenerateInvoiceCampPanel = ({ project, onCreated }: GenerateInvoiceCampPanelProps) => {
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [error, setError] = useState<string | null>(null)
  const { data: camps, isLoading, isFetching: campsFetching, error: campsError, refetch } = useEligibleInvoiceCamps(project.id)
  const createInvoice = useCreateInvoice()
  const submittingRef = useRef(false)

  const isSettling = isLoading || campsFetching || !!campsError

  const [lastCamps, setLastCamps] = useState<typeof camps>(undefined)
  if (camps && camps !== lastCamps) {
    setLastCamps(camps)
    const validIds = new Set(camps.map((camp) => camp.id))
    setSelected((prev) => {
      if (prev.size === 0) return prev
      const next = new Set(Array.from(prev).filter((id) => validIds.has(id)))
      return next.size === prev.size ? prev : next
    })
  }

  const toggleCamp = useCallback((campId: string) => {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(campId)) next.delete(campId)
      else next.add(campId)
      return next
    })
  }, [])

  const selectedTotal = selected.size * project.campCost

  const handleSubmit = async () => {
    if (submittingRef.current) return
    const campIds = Array.from(selected)
    const result = createInvoiceSchema.safeParse({ project: project.id, camps: campIds })
    if (!result.success) {
      setError(result.error.issues[0]?.message ?? 'Please complete the required fields.')
      return
    }
    setError(null)
    submittingRef.current = true
    try {
      const res = await createInvoice.mutateAsync({ project: project.id, camps: campIds })
      if (res.data) onCreated(res.data.id)
      setSelected(new Set())
    } catch (err) {
      setError(getApiErrorMessage(err, 'Could not generate the invoice — try again.'))
      submittingRef.current = false
    }
  }

  return (
    <>
      <div className="grid gap-2.5 mb-3" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(168px, 1fr))' }}>
        <div className="rounded-xl border p-3" style={{ borderColor: 'var(--qms-border)', background: 'var(--qms-surface-card)' }}>
          <div className="text-[10px] font-bold uppercase tracking-wide" style={{ color: 'var(--qms-text-muted)' }}>Camps to bill</div>
          <div className="text-xl font-extrabold mt-0.5" style={{ color: 'var(--qms-text)' }}>{selected.size}</div>
          <div className="text-[11px] mt-0.5" style={{ color: 'var(--qms-text-muted)' }}>of {camps?.length ?? 0} eligible</div>
        </div>
        <div
          className="rounded-xl border p-3"
          style={{ borderColor: 'color-mix(in srgb, #10b981 35%, var(--qms-border))', background: 'var(--qms-surface-card)' }}
        >
          <div className="text-[10px] font-bold uppercase tracking-wide" style={{ color: 'var(--qms-text-muted)' }}>Invoice total</div>
          <div className="text-xl font-extrabold mt-0.5" style={{ color: '#047857' }}>{selectedTotal.toLocaleString('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 })}</div>
        </div>
      </div>

      <div className="rounded-xl border overflow-hidden" style={{ borderColor: 'var(--qms-border)', background: 'var(--qms-surface-card)' }}>
        <div className="flex items-center justify-between gap-2 flex-wrap px-3.5 py-3" style={{ borderBottom: '1px solid var(--qms-border)' }}>
          <div>
            <div className="font-extrabold text-[13px]" style={{ color: 'var(--qms-text)' }}>Billable camps — {project.name}</div>
            <div className="text-[11px]" style={{ color: 'var(--qms-text-muted)' }}>Tick camps to bill</div>
          </div>
          <Button
            onClick={handleSubmit}
            disabled={createInvoice.isPending || selected.size === 0 || isSettling}
            className="font-bold text-white"
            style={{ background: 'linear-gradient(135deg, var(--qms-brand), var(--qms-teal))' }}
          >
            <FiFilePlus size={14} /> {createInvoice.isPending ? 'Generating…' : `Generate CRM invoice (${selected.size})`}
          </Button>
        </div>

        <div className="p-3.5">
          <QueryStateBlock
            isLoading={isLoading}
            error={campsError}
            loadingLabel="Loading eligible camps…"
            errorLabel="Couldn't load eligible camps for this project."
            onRetry={() => refetch()}
          >
            {camps && camps.length === 0 && (
              <p className="text-[13px] py-4 text-center" style={{ color: 'var(--qms-text-muted)' }}>
                No billable, closed or cancelled-charged camps are available for this project yet.
              </p>
            )}
            {camps && camps.length > 0 && (
              <div className="space-y-1.5 max-h-96 overflow-y-auto">
                {camps.map((camp) => (
                  <CampSelectionRow
                    key={camp.id}
                    camp={camp}
                    checked={selected.has(camp.id)}
                    onToggle={toggleCamp}
                    campCost={project.campCost}
                  />
                ))}
              </div>
            )}
          </QueryStateBlock>
          {error && <p className="text-[12px] text-danger mt-2">{error}</p>}
        </div>
      </div>
    </>
  )
}

export default GenerateInvoiceTab
