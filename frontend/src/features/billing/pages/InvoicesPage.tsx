import { useEffect, useMemo, useRef, useState } from 'react'
import { FiPlus } from 'react-icons/fi'
import { useInvoices } from '@/features/billing/hooks/useInvoices'
import { useBillingProject } from '@/features/billing/hooks/useBillingProject'
import BillingProjectPicker from '@/features/billing/components/BillingProjectPicker'
import InvoiceTable from '@/features/billing/components/InvoiceTable'
import InvoiceDetailDrawer from '@/features/billing/components/InvoiceDetailDrawer'
import GenerateInvoiceDialog from '@/features/billing/components/GenerateInvoiceDialog'
import QueryStateBlock from '@/components/ui/QueryStateBlock'
import PaginationControls from '@/components/ui/PaginationControls'
import { Button } from '@/components/ui/button'
import { usePagination } from '@/hooks/usePagination'
import { usePermission } from '@/hooks/usePermission'

// Search flow is project-first by design: the invoice list query is gated
// on a project being selected (`enabled: !!selectedProjectId`) — this
// account's reads are unscoped (platform tenant), so an unguarded search
// would return every invoice across the platform instead of nothing.
const InvoicesPage = () => {
  const [selectedProjectId, setSelectedProjectId] = useState('')
  const [projectPickerLabel, setProjectPickerLabel] = useState('')
  const [openDetailId, setOpenDetailId] = useState<string | null>(null)
  const [generateOpen, setGenerateOpen] = useState(false)
  const [generateOpening, setGenerateOpening] = useState(false)
  const { page, setPage, pageSize, totalPages, resetToFirstPage } = usePagination(10)
  const { hasAnyPermission } = usePermission()

  const canCreate = hasAnyPermission(['invoice:create', 'invoice:manage'])

  // Full ProjectEntity (needed for campCost) — the picker only resolves id+label.
  const {
    data: projectData,
    isLoading: projectLoading,
    error: projectError,
    refetch: refetchProject,
  } = useBillingProject(selectedProjectId || undefined)
  const selectedProject = projectData?.data ?? null

  const query = useMemo(
    () => ({ project: selectedProjectId, page: String(page), limit: String(pageSize) }),
    [selectedProjectId, page, pageSize],
  )

  const { data, isLoading, error, refetch } = useInvoices(query, !!selectedProjectId)
  const invoices = data?.data?.items ?? []
  const count = data?.data?.count ?? 0

  const handleProjectChange = (projectId: string, projectLabel: string) => {
    setSelectedProjectId(projectId)
    setProjectPickerLabel(projectLabel)
    resetToFirstPage()
  }

  // Read inside handleOpenGenerate's awaited continuation to detect a
  // project switch that happened WHILE the refetch below was in flight.
  // `selectedProjectId` itself can't be used for this comparison — it's a
  // plain closure variable captured at the render where handleOpenGenerate
  // was defined, so `selectedProjectId !== targetProjectId` would always
  // compare that same captured value against itself and never detect a
  // switch that happened after. A ref, updated every render, is what
  // actually reflects the LIVE value at the moment the check runs.
  const selectedProjectIdRef = useRef(selectedProjectId)
  useEffect(() => {
    selectedProjectIdRef.current = selectedProjectId
  }, [selectedProjectId])

  // campCost is financially material to what a generated invoice bills, and
  // this hook's cache is separate from features/projects/'s own (5-minute
  // default staleTime) — refetch and await it right before opening the
  // dialog so campCost shown here is confirmed current, not just whatever
  // happened to still be cached from up to 5 minutes ago.
  const handleOpenGenerate = async () => {
    setGenerateOpening(true)
    const targetProjectId = selectedProjectId
    try {
      const result = await refetchProject()
      // Two separate failure modes to guard against, both real:
      // (1) the refetch itself failed (network error, etc) — never open on
      //     a value we couldn't confirm is current.
      // (2) the user switched to a DIFFERENT project while this refetch was
      //     in flight — selectedProjectIdRef.current now points elsewhere,
      //     so even a successful refetch here confirmed the WRONG project's
      //     price. Opening now would show whatever `selectedProject` is
      //     CURRENTLY bound to (project B), which this refetch never
      //     actually validated.
      if (result.isError || selectedProjectIdRef.current !== targetProjectId) return
      setGenerateOpen(true)
    } finally {
      setGenerateOpening(false)
    }
  }

  return (
    <div className="w-full">
      <div className="flex items-start justify-between gap-3 mb-4 flex-wrap">
        <div>
          <div className="text-[12px] mb-1" style={{ color: 'var(--qms-text-muted)' }}>Finance · CRM Invoicing</div>
          <h1 className="text-2xl font-bold" style={{ color: 'var(--qms-text)' }}>CRM Invoicing</h1>
        </div>
      </div>

      <div className="flex items-center justify-between gap-3 mb-4 flex-wrap">
        <div className="w-80">
          <BillingProjectPicker
            value={selectedProjectId}
            label={projectPickerLabel}
            onChange={handleProjectChange}
          />
        </div>
        {selectedProject && canCreate && (
          <Button onClick={handleOpenGenerate} disabled={generateOpening} className="font-bold text-white shrink-0" style={{ background: 'linear-gradient(135deg, var(--qms-brand), var(--qms-teal))' }}>
            <FiPlus size={14} /> {generateOpening ? 'Loading…' : 'Generate invoice'}
          </Button>
        )}
      </div>

      {!selectedProjectId && (
        <div className="text-[13px] py-10 text-center rounded-xl border" style={{ color: 'var(--qms-text-muted)', borderColor: 'var(--qms-border)' }}>
          Search and select a project above to see its invoices.
        </div>
      )}

      {selectedProjectId && projectError && (
        <div className="flex items-center justify-between gap-3 text-[13px] rounded-xl px-3 py-2 bg-danger-soft border border-danger text-danger">
          <span>Couldn't load this project — invoices and actions here may be unavailable until it does.</span>
          <Button variant="outline" size="sm" onClick={() => refetchProject()} className="shrink-0">Retry</Button>
        </div>
      )}

      {selectedProjectId && !projectError && !projectLoading && !selectedProject && (
        <div className="text-[13px] py-10 text-center rounded-xl border" style={{ color: 'var(--qms-text-muted)', borderColor: 'var(--qms-border)' }}>
          This project could not be found.
        </div>
      )}

      {selectedProjectId && selectedProject && (
        <>
          {!isLoading && !error && (
            <div className="text-[12px] mb-2" style={{ color: 'var(--qms-text-muted)' }}>{count} invoice{count === 1 ? '' : 's'}</div>
          )}

          <QueryStateBlock isLoading={isLoading} error={error} loadingLabel="Loading invoices…" errorLabel="Failed to load invoices. Please try again." onRetry={() => refetch()}>
            {invoices.length === 0 && (
              <div className="text-[13px] py-10 text-center rounded-xl border" style={{ color: 'var(--qms-text-muted)', borderColor: 'var(--qms-border)' }}>
                No invoices for this project yet.
              </div>
            )}
            {invoices.length > 0 && (
              <>
                <InvoiceTable invoices={invoices} onOpenDetail={setOpenDetailId} />
                <PaginationControls page={page} totalPages={totalPages(count)} onPageChange={setPage} disabled={isLoading} />
              </>
            )}
          </QueryStateBlock>
        </>
      )}

      <InvoiceDetailDrawer invoiceId={openDetailId} project={selectedProject} onRefetchProject={refetchProject} onClose={() => setOpenDetailId(null)} />

      {generateOpen && selectedProject && (
        <GenerateInvoiceDialog
          project={selectedProject}
          onClose={() => setGenerateOpen(false)}
          onCreated={(id) => setOpenDetailId(id)}
        />
      )}
    </div>
  )
}

export default InvoicesPage
