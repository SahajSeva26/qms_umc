import { useMemo, useState } from 'react'
import { FiFilePlus, FiGitMerge } from 'react-icons/fi'
import { useInvoices } from '@/features/billing/hooks/useInvoices'
import { useInvoice } from '@/features/billing/hooks/useInvoice'
import { useInvoiceLineItems } from '@/features/billing/hooks/useInvoiceLineItems'
import BillingProjectPicker from '@/features/billing/components/BillingProjectPicker'
import GenerateInvoiceTab from '@/features/billing/components/GenerateInvoiceTab'
import InvoicePipelineKpiStrip from '@/features/billing/components/InvoicePipelineKpiStrip'
import InvoiceCard from '@/features/billing/components/InvoiceCard'
import InvoiceDetailDrawer from '@/features/billing/components/InvoiceDetailDrawer'
import MoveInvoiceStageDialog from '@/features/billing/components/MoveInvoiceStageDialog'
import QueryStateBlock from '@/components/ui/QueryStateBlock'
import PaginationControls from '@/components/ui/PaginationControls'
import { usePagination } from '@/hooks/usePagination'
import { usePermission } from '@/hooks/usePermission'

type InvoicingTab = 'generate' | 'pipeline'

// Matches the prototype's 2-tab shell (crm-invoicing.html: "Generate Invoice"
// / "Invoices & Pipeline") — Generate Invoice is now a tab, not a modal;
// Invoices & Pipeline is a card list with an inline stage stepper, not a flat table.
const InvoicesPage = () => {
  const { hasAnyPermission } = usePermission()
  const canCreate = hasAnyPermission(['invoice:create', 'invoice:manage'])
  const canMoveStage = hasAnyPermission(['invoice:manage', 'tenant:manage'])
  // Defaults to Pipeline for a viewer who can't generate — mirrors the
  // prototype's role-based default tab (crm-invoicing.js:72).
  const [tab, setTab] = useState<InvoicingTab>(canCreate ? 'generate' : 'pipeline')

  const [filterProjectId, setFilterProjectId] = useState('')
  const [filterProjectLabel, setFilterProjectLabel] = useState('')
  const [openDetailId, setOpenDetailId] = useState<string | null>(null)
  const [stageDialogInvoiceId, setStageDialogInvoiceId] = useState<string | null>(null)
  const { page, setPage, pageSize, totalPages, resetToFirstPage } = usePagination(10)

  const query = useMemo(
    () => ({ ...(filterProjectId ? { project: filterProjectId } : {}), page: String(page), limit: String(pageSize) }),
    [filterProjectId, page, pageSize],
  )

  const { data, isLoading, error, refetch } = useInvoices(query, tab === 'pipeline')
  const invoices = data?.data?.items ?? []
  const count = data?.data?.count ?? 0

  // Needed for MoveInvoiceStageDialog's lineItemCount prop — only fetched
  // when the dialog is actually open, not per-card in the list.
  const { data: stageDialogInvoiceData } = useInvoice(stageDialogInvoiceId ?? undefined)
  const stageDialogInvoice = stageDialogInvoiceData?.data ?? null
  const canReadLines = hasAnyPermission(['invoice-line-item:search', 'invoice-line-item:manage', 'tenant:manage'])
  const { data: stageDialogLineItemsData } = useInvoiceLineItems(
    { invoice: stageDialogInvoiceId ?? '', limit: '1' },
    !!stageDialogInvoiceId && canReadLines,
  )
  // Falls back to 1 (a safe non-zero placeholder) if this viewer can't read
  // line items at all — the dialog's own submit still hits the real
  // moveStage endpoint, which is authoritative either way; this only
  // affects whether "Approved" is offered in the dropdown.
  const stageDialogLineItemCount = canReadLines ? (stageDialogLineItemsData?.data?.count ?? 0) : 1

  const handleFilterProjectChange = (projectId: string, projectLabel: string) => {
    setFilterProjectId(projectId)
    setFilterProjectLabel(projectLabel)
    resetToFirstPage()
  }

  return (
    <div className="w-full">
      <div className="mb-4">
        <div className="text-[12px] mb-1" style={{ color: 'var(--qms-text-muted)' }}>Finance · CRM Invoicing</div>
        <h1 className="text-2xl font-bold" style={{ color: 'var(--qms-text)' }}>CRM Invoicing</h1>
        <p className="text-[12px] mt-1" style={{ color: 'var(--qms-text-muted)' }}>Project-wise billing · Accounts pipeline</p>
      </div>

      <div className="flex gap-1 mb-4 border-b overflow-x-auto" style={{ borderColor: 'var(--qms-border)' }}>
        {canCreate && (
          <button
            onClick={() => setTab('generate')}
            className="flex items-center gap-1.5 px-3 py-2 text-[13px] font-semibold whitespace-nowrap border-b-2 -mb-px transition-colors"
            style={{
              borderColor: tab === 'generate' ? 'var(--qms-brand)' : 'transparent',
              color: tab === 'generate' ? 'var(--qms-brand)' : 'var(--qms-text-muted)',
            }}
          >
            <FiFilePlus size={14} /> Generate Invoice
          </button>
        )}
        <button
          onClick={() => setTab('pipeline')}
          className="flex items-center gap-1.5 px-3 py-2 text-[13px] font-semibold whitespace-nowrap border-b-2 -mb-px transition-colors"
          style={{
            borderColor: tab === 'pipeline' ? 'var(--qms-brand)' : 'transparent',
            color: tab === 'pipeline' ? 'var(--qms-brand)' : 'var(--qms-text-muted)',
          }}
        >
          <FiGitMerge size={14} /> Invoices &amp; Pipeline
        </button>
      </div>

      {tab === 'generate' && canCreate && (
        <GenerateInvoiceTab onCreated={(id) => { setOpenDetailId(id); setTab('pipeline') }} />
      )}

      {tab === 'pipeline' && (
        <div>
          <div className="w-80 mb-4">
            <BillingProjectPicker value={filterProjectId} label={filterProjectLabel} onChange={handleFilterProjectChange} />
          </div>

          {!isLoading && !error && (
            <InvoicePipelineKpiStrip invoices={invoices} totalCount={count} />
          )}

          <QueryStateBlock isLoading={isLoading} error={error} loadingLabel="Loading invoices…" errorLabel="Failed to load invoices. Please try again." onRetry={() => refetch()}>
            {invoices.length === 0 && (
              <div className="text-[13px] py-10 text-center rounded-xl border" style={{ color: 'var(--qms-text-muted)', borderColor: 'var(--qms-border)' }}>
                {filterProjectId ? 'No invoices for this project yet.' : 'No invoices yet.'}
              </div>
            )}
            {invoices.length > 0 && (
              <>
                {invoices.map((invoice) => (
                  <InvoiceCard
                    key={invoice.id}
                    invoice={invoice}
                    onOpenDetail={setOpenDetailId}
                    onChangeStatus={setStageDialogInvoiceId}
                    canMoveStage={canMoveStage}
                  />
                ))}
                <PaginationControls page={page} totalPages={totalPages(count)} onPageChange={setPage} disabled={isLoading} />
              </>
            )}
          </QueryStateBlock>
        </div>
      )}

      <InvoiceDetailDrawer invoiceId={openDetailId} onClose={() => setOpenDetailId(null)} />

      {stageDialogInvoice && (
        <MoveInvoiceStageDialog
          invoice={stageDialogInvoice}
          lineItemCount={stageDialogLineItemCount}
          onClose={() => setStageDialogInvoiceId(null)}
        />
      )}
    </div>
  )
}

export default InvoicesPage
