import { useMemo, useState } from 'react'
import { FiPlus } from 'react-icons/fi'
import { useInvoices } from '@/features/billing/hooks/useInvoices'
import BillingProjectPicker from '@/features/billing/components/BillingProjectPicker'
import InvoiceTable from '@/features/billing/components/InvoiceTable'
import InvoiceDetailDrawer from '@/features/billing/components/InvoiceDetailDrawer'
import GenerateInvoiceDialog from '@/features/billing/components/GenerateInvoiceDialog'
import QueryStateBlock from '@/components/ui/QueryStateBlock'
import PaginationControls from '@/components/ui/PaginationControls'
import { Button } from '@/components/ui/button'
import { usePagination } from '@/hooks/usePagination'
import { usePermission } from '@/hooks/usePermission'

// The invoice list loads unfiltered by default — the project picker below is
// a filter narrowing it, not a gate unlocking it. "Generate invoice" is its
// own flow (GenerateInvoiceDialog owns its own project picker) since
// creating an invoice needs a project regardless of what this page's filter
// is currently set to.
const InvoicesPage = () => {
  const [filterProjectId, setFilterProjectId] = useState('')
  const [filterProjectLabel, setFilterProjectLabel] = useState('')
  const [openDetailId, setOpenDetailId] = useState<string | null>(null)
  const [generateOpen, setGenerateOpen] = useState(false)
  const { page, setPage, pageSize, totalPages, resetToFirstPage } = usePagination(10)
  const { hasAnyPermission } = usePermission()

  const canCreate = hasAnyPermission(['invoice:create', 'invoice:manage'])

  const query = useMemo(
    () => ({ ...(filterProjectId ? { project: filterProjectId } : {}), page: String(page), limit: String(pageSize) }),
    [filterProjectId, page, pageSize],
  )

  const { data, isLoading, error, refetch } = useInvoices(query)
  const invoices = data?.data?.items ?? []
  const count = data?.data?.count ?? 0

  const handleFilterProjectChange = (projectId: string, projectLabel: string) => {
    setFilterProjectId(projectId)
    setFilterProjectLabel(projectLabel)
    resetToFirstPage()
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
            value={filterProjectId}
            label={filterProjectLabel}
            onChange={handleFilterProjectChange}
          />
        </div>
        {canCreate && (
          <Button onClick={() => setGenerateOpen(true)} className="font-bold text-white shrink-0" style={{ background: 'linear-gradient(135deg, var(--qms-brand), var(--qms-teal))' }}>
            <FiPlus size={14} /> Generate invoice
          </Button>
        )}
      </div>

      {!isLoading && !error && (
        <div className="text-[12px] mb-2" style={{ color: 'var(--qms-text-muted)' }}>{count} invoice{count === 1 ? '' : 's'}</div>
      )}

      <QueryStateBlock isLoading={isLoading} error={error} loadingLabel="Loading invoices…" errorLabel="Failed to load invoices. Please try again." onRetry={() => refetch()}>
        {invoices.length === 0 && (
          <div className="text-[13px] py-10 text-center rounded-xl border" style={{ color: 'var(--qms-text-muted)', borderColor: 'var(--qms-border)' }}>
            {filterProjectId ? 'No invoices for this project yet.' : 'No invoices yet.'}
          </div>
        )}
        {invoices.length > 0 && (
          <>
            <InvoiceTable invoices={invoices} onOpenDetail={setOpenDetailId} />
            <PaginationControls page={page} totalPages={totalPages(count)} onPageChange={setPage} disabled={isLoading} />
          </>
        )}
      </QueryStateBlock>

      <InvoiceDetailDrawer invoiceId={openDetailId} onClose={() => setOpenDetailId(null)} />

      {generateOpen && (
        <GenerateInvoiceDialog
          onClose={() => setGenerateOpen(false)}
          onCreated={(id) => setOpenDetailId(id)}
        />
      )}
    </div>
  )
}

export default InvoicesPage
