import type { InvoiceEntity } from '@/features/billing/invoice.types'
import { formatDate, formatINRFull } from '@/utils/formatters'
import InvoiceStatusPill from '@/features/billing/components/InvoiceStatusPill'

// No camp-count column — the invoice API returns no line count, and
// fetching line items per row to compute one would be an N+1 problem.
const COLUMNS = ['Code', 'Project', 'Status', 'Issue date', 'Total']

interface InvoiceTableProps {
  invoices: InvoiceEntity[]
  onOpenDetail: (id: string) => void
}

// search() always populates `project` (see invoice.types.ts) — only
// create()/update()/moveStage() echo back a bare id string instead.
const projectLabel = (invoice: InvoiceEntity) =>
  typeof invoice.project === 'string' ? invoice.project : `${invoice.project.name} (${invoice.project.code})`

const InvoiceTable = ({ invoices, onOpenDetail }: InvoiceTableProps) => (
  <div className="overflow-x-auto rounded-xl border backdrop-blur-xl" style={{ borderColor: 'var(--qms-border)', background: 'var(--qms-surface)' }}>
    <table className="w-full text-[13px]">
      <thead>
        <tr style={{ borderBottom: '1px solid var(--qms-border)', background: 'var(--qms-surface-strong)' }}>
          {COLUMNS.map((h) => (
            <th key={h} className="text-left font-bold text-[11px] uppercase tracking-wider px-3 py-2 whitespace-nowrap" style={{ color: 'var(--qms-text-muted)' }}>
              {h}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {invoices.map((invoice) => (
          <tr
            key={invoice.id}
            onClick={() => onOpenDetail(invoice.id)}
            className="cursor-pointer transition-colors hover:bg-(--qms-surface-hover)"
            style={{ borderBottom: '1px solid var(--qms-border)' }}
          >
            <td className="px-3 py-2.5 align-top font-semibold" style={{ color: 'var(--qms-text)' }}>{invoice.code}</td>
            <td className="px-3 py-2.5 align-top" style={{ color: 'var(--qms-text-muted)' }}>{projectLabel(invoice)}</td>
            <td className="px-3 py-2.5 align-top whitespace-nowrap"><InvoiceStatusPill status={invoice.status} /></td>
            <td className="px-3 py-2.5 align-top whitespace-nowrap" style={{ color: 'var(--qms-text-muted)' }}>
              {formatDate(invoice.issueDate)}
            </td>
            <td className="px-3 py-2.5 align-top text-right font-bold whitespace-nowrap" style={{ color: 'var(--qms-text)' }}>
              {formatINRFull(invoice.total)}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  </div>
)

export default InvoiceTable
