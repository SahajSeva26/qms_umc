import type { InvoiceStatus } from '@/features/billing/invoice.types'
import { INVOICE_STATUS_COLOR, INVOICE_STATUS_LABEL } from '@/features/billing/invoice.types'
import ColorPill from '@/components/ui/ColorPill'

interface InvoiceStatusPillProps {
  status: InvoiceStatus
  onClick?: () => void
}

const InvoiceStatusPill = ({ status, onClick }: InvoiceStatusPillProps) => (
  <ColorPill
    status={status}
    colorMap={INVOICE_STATUS_COLOR}
    labelMap={INVOICE_STATUS_LABEL}
    onClick={onClick}
    className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider"
  />
)

export default InvoiceStatusPill
