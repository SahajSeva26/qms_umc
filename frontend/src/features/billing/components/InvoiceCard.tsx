import { useEffect, useRef, useState } from 'react'
import { FiEye, FiDownload } from 'react-icons/fi'
import type { InvoiceEntity } from '@/types/invoice.types'
import { formatDate, formatINRFull } from '@/utils/formatters'
import InvoiceStatusPill from '@/features/billing/components/InvoiceStatusPill'
import InvoiceStageStepper from '@/features/billing/components/InvoiceStageStepper'
import { useAllInvoiceLineItems } from '@/features/billing/hooks/useAllInvoiceLineItems'
import { downloadInvoiceLineItemsCsv } from '@/features/billing/invoice.export'
import { Button } from '@/components/ui/button'
import { toast } from '@/components/ui/sonner'
import { getApiErrorMessage } from '@/utils/apiError'

interface InvoiceCardProps {
  invoice: InvoiceEntity
  onOpenDetail: (id: string) => void
  onChangeStatus: (id: string) => void
  canMoveStage: boolean
  // Export CSV calls GET /invoice-line-items, gated invoice-line-item:search/:manage/tenant:manage.
  canExport: boolean
  // GET /invoices/:id requires invoice:get/invoice:manage/tenant:manage, distinct from invoice:search which reaches this list.
  canViewDetail: boolean
}

// search() populates tenant/project; create()/update()/moveStage() echo back bare id strings (invoice.types.ts).
const invoiceSubtitle = (invoice: InvoiceEntity) => {
  const parts: string[] = []
  if (typeof invoice.tenant !== 'string') parts.push(invoice.tenant.name)
  if (typeof invoice.project !== 'string') {
    const division = invoice.project.division
    if (division && typeof division !== 'string') parts.push(division.name)
    const poNumber = invoice.project.executionMode?.poNumber
    parts.push(poNumber ? `PO ${poNumber}` : `${invoice.project.name} (${invoice.project.code})`)
  } else {
    parts.push(invoice.project)
  }
  return parts.join(' · ')
}

// Invoice model has no paymentStatus field — re-derived from status (paid = cleared, else outstanding), matching InvoicePipelineKpiStrip.
const isPaymentCleared = (status: InvoiceEntity['status']) => status === 'paid'
const isPaymentTracked = (status: InvoiceEntity['status']) => status !== 'cancelled'

const InvoiceCard = ({ invoice, onOpenDetail, onChangeStatus, canMoveStage, canExport, canViewDetail }: InvoiceCardProps) => {
  // Lazy-enabled — only fetches once Export is clicked, not eagerly for every card on the list.
  const [exportRequested, setExportRequested] = useState(false)
  const { data: lineItems, isFetching: isExporting, error: exportError, refetch: refetchLineItems } = useAllInvoiceLineItems(exportRequested ? invoice.id : undefined)
  // Guards against re-downloading on a later cache hit/refetch, not just the fetch that answered this click.
  const downloadedRef = useRef(false)

  const handleExport = () => {
    downloadedRef.current = false
    if (exportRequested && exportError) {
      // react-query won't refire just from exportRequested staying true, so retry explicitly.
      void refetchLineItems()
      return
    }
    setExportRequested(true)
  }

  useEffect(() => {
    if (exportRequested && exportError) {
      toast.error(getApiErrorMessage(exportError, 'Could not export this invoice — try again.'))
      return
    }
    if (exportRequested && lineItems && !isExporting && !downloadedRef.current) {
      downloadedRef.current = true
      downloadInvoiceLineItemsCsv(invoice, lineItems)
      setExportRequested(false)
    }
  }, [exportRequested, exportError, lineItems, isExporting, invoice])

  return (
    <div className="rounded-xl border p-3.5 mb-2.5" style={{ borderColor: 'var(--qms-border)', background: 'var(--qms-surface-card)' }}>
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div className="min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-extrabold text-[14px]" style={{ color: 'var(--qms-text)' }}>{invoice.code}</span>
            <InvoiceStatusPill status={invoice.status} />
            {isPaymentTracked(invoice.status) && (
              <span
                className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider"
                style={{
                  background: isPaymentCleared(invoice.status) ? 'rgba(16,185,129,.14)' : 'rgba(244,63,94,.14)',
                  color: isPaymentCleared(invoice.status) ? '#047857' : '#b91c1c',
                }}
              >
                {isPaymentCleared(invoice.status) ? 'Payment cleared' : 'Payment outstanding'}
              </span>
            )}
          </div>
          <div className="text-[12px] mt-0.5" style={{ color: 'var(--qms-text-muted)' }}>{invoiceSubtitle(invoice)}</div>
          {typeof invoice.lineItemCount === 'number' && (
            <div className="text-[11px] mt-0.5" style={{ color: 'var(--qms-text-muted)' }}>
              {invoice.lineItemCount} camp{invoice.lineItemCount === 1 ? '' : 's'}
            </div>
          )}
        </div>
        <div className="text-right shrink-0">
          <div className="font-extrabold text-[16px]" style={{ color: 'var(--qms-text)' }}>{formatINRFull(invoice.total)}</div>
          <div className="text-[11px]" style={{ color: 'var(--qms-text-muted)' }}>{formatDate(invoice.issueDate)}</div>
        </div>
      </div>

      <div className="my-2.5">
        <InvoiceStageStepper status={invoice.status} />
      </div>

      <div className="flex items-center gap-2 flex-wrap">
        {canViewDetail && (
          <Button variant="outline" size="sm" onClick={() => onOpenDetail(invoice.id)}>
            <FiEye size={13} /> Detail
          </Button>
        )}
        {canMoveStage && (
          <Button variant="outline" size="sm" onClick={() => onChangeStatus(invoice.id)}>
            Change status
          </Button>
        )}
        {canExport && (
          <Button
            variant="outline"
            size="sm"
            onClick={handleExport}
            disabled={isExporting}
            className={exportRequested && exportError ? 'text-danger border-danger hover:bg-danger-soft' : undefined}
          >
            <FiDownload size={13} /> {isExporting ? 'Exporting…' : exportRequested && exportError ? 'Retry export' : 'Export CSV'}
          </Button>
        )}
      </div>
    </div>
  )
}

export default InvoiceCard
