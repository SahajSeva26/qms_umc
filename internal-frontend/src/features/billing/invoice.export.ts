import type { InvoiceEntity } from '@/types/invoice.types'
import { INVOICE_STATUS_LABEL } from '@/types/invoice.types'
import type { InvoiceLineItemEntity } from '@/types/invoiceLineItem.types'
import { toCsv, downloadCsv, type CsvColumn } from '@/utils/csvExport'
import { toast } from '@/components/ui/sonner'

// Photo-collage PDF export is a separate, larger piece deferred for later (needs photo assets this feature doesn't fetch).

const COLUMNS: CsvColumn<InvoiceLineItemEntity>[] = [
  { header: 'Camp code', get: (li) => (typeof li.camp === 'string' ? li.camp : li.camp.code) },
  { header: 'Camp date', get: (li) => (typeof li.camp === 'string' ? '' : li.camp.date) },
  { header: 'Camp status', get: (li) => (typeof li.camp === 'string' ? '' : li.camp.status) },
  { header: 'Amount (INR)', get: (li) => li.amount },
]

export function invoiceLineItemsToCsv(lineItems: InvoiceLineItemEntity[]): string {
  return toCsv(lineItems, COLUMNS)
}

export function downloadInvoiceLineItemsCsv(invoice: InvoiceEntity, lineItems: InvoiceLineItemEntity[]): void {
  downloadCsv(invoiceLineItemsToCsv(lineItems), `invoice-${invoice.code}-${INVOICE_STATUS_LABEL[invoice.status].toLowerCase()}.csv`)
  toast.success(`Exported ${lineItems.length} camp${lineItems.length === 1 ? '' : 's'} for ${invoice.code}`)
}
