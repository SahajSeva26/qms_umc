import { useEffect } from 'react'
import { createPortal } from 'react-dom'
import type { InvoiceEntity } from '@/types/invoice.types'
import type { InvoiceLineItemEntity } from '@/types/invoiceLineItem.types'
import type { Tenant } from '@/types/accessManagement.types'
import TaxInvoiceDocument from '@/features/billing/components/TaxInvoiceDocument'
import { Button } from '@/components/ui/button'
import { getApiErrorMessage } from '@/utils/apiError'

interface InvoicePrintOverlayProps {
  invoice: InvoiceEntity
  buyer: Tenant | null
  lineItems: InvoiceLineItemEntity[]
  isLoading: boolean
  error: unknown
  onRetry: () => void
  onClose: () => void
}

// Portals the printable document to document.body and scopes a print stylesheet so ONLY
// .tax-invoice-print is printed — the rest of the app (sidebar, drawer chrome, etc.) is hidden
// via @media print, not removed from the DOM. window.print() opens the browser's native print
// dialog; "Save as PDF" is a destination choice inside that dialog, not a separate code path.
//
// window.print() only fires once BOTH the buyer (tenant) and line-item requests have genuinely
// succeeded — a loading/error preview is shown first, with an explicit "Print" action, instead of
// printing an incomplete document (P1: a slow/failed request previously still auto-printed
// "Buyer: —" and no camps).
const InvoicePrintOverlay = ({ invoice, buyer, lineItems, isLoading, error, onRetry, onClose }: InvoicePrintOverlayProps) => {
  const ready = !isLoading && !error

  useEffect(() => {
    const handleAfterPrint = () => onClose()
    window.addEventListener('afterprint', handleAfterPrint)
    return () => window.removeEventListener('afterprint', handleAfterPrint)
  }, [onClose])

  const handlePrint = () => window.print()

  return createPortal(
    <>
      <style>{`
        @media print {
          body > *:not(.tax-invoice-print-root) { display: none !important; }
          .tax-invoice-print-root { display: block !important; }
          .tax-invoice-print-controls { display: none !important; }
          @page { margin: 12mm; }
        }
        @media screen {
          .tax-invoice-print-root { position: fixed; inset: 0; z-index: 9999; overflow: auto; background: #525659; padding: 24px 0; }
          .tax-invoice-print-shell { box-shadow: 0 8px 30px rgba(0,0,0,.4); }
        }
      `}</style>
      <div className="tax-invoice-print-root">
        <div className="tax-invoice-print-controls fixed top-4 right-4 flex items-center gap-2">
          {ready && (
            <Button size="sm" onClick={handlePrint} className="font-bold text-white" style={{ background: 'linear-gradient(135deg, var(--qms-brand), var(--qms-teal))' }}>
              Print
            </Button>
          )}
          <Button variant="outline" size="sm" className="bg-white" onClick={onClose}>
            Close
          </Button>
        </div>

        {isLoading && (
          <div className="flex items-center justify-center h-full text-white text-[14px]">Loading invoice for print…</div>
        )}

        {!!error && !isLoading && (
          <div className="flex flex-col items-center justify-center h-full gap-3 text-white text-[14px]">
            <span>{getApiErrorMessage(error, "Couldn't load the full invoice for printing.")}</span>
            <Button size="sm" onClick={onRetry}>Retry</Button>
          </div>
        )}

        {ready && (
          <div className="tax-invoice-print-shell mx-auto">
            <TaxInvoiceDocument invoice={invoice} buyer={buyer} lineItems={lineItems} />
          </div>
        )}
      </div>
    </>,
    document.body,
  )
}

export default InvoicePrintOverlay
