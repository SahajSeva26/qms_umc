import type { Camp } from '@/types/camp.types'
import { useAuth } from '@/hooks/useAuth'
import { useProjectsDataShared } from '@/hooks/useProjectsDataShared'
import { useErp } from '@/features/om/hooks/useErp'
import { billableCampsForProject } from '@/features/om/erp.service'
import { Button } from '@/components/ui/button'
import { clientName } from '@/types/campref.types'
import { formatINR } from '@/utils/formatters'

interface InvoicingTabProps {
  camps: Camp[]
}

// Mirrors renderInvoicing/erpGenInvoice exactly (erp-screening.js:330-391) —
// billable = completed + verification ACCEPTED + not already billed.
const InvoicingTab = ({ camps }: InvoicingTabProps) => {
  const { user } = useAuth()
  const { projects } = useProjectsDataShared()
  const erp = useErp()

  const screeningProjects = projects.filter((p) => p.type === 'Screening')
  const byName = user ? `${user.firstName} ${user.lastName}` : 'Ops Manager'

  return (
    <div className="space-y-4">
      <div className="rounded-xl border overflow-x-auto" style={{ background: 'var(--qms-surface)', borderColor: 'var(--qms-border)' }}>
        <table className="w-full text-[13px]">
          <thead>
            <tr style={{ background: 'var(--qms-surface-strong)' }}>
              {['Project', 'Billable camps', 'Value', ''].map((h) => (
                <th key={h} className="text-left font-semibold px-3 py-2.5 text-[11px] uppercase tracking-wide" style={{ color: 'var(--qms-text-muted)' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {screeningProjects.map((p) => {
              const billable = billableCampsForProject(p, camps, erp.verification, erp.billedCampIds)
              const rate = p.totalCamps ? Math.round(p.valueAfterGst / p.totalCamps) : 0
              return (
                <tr key={p.id} className="border-t" style={{ borderColor: 'var(--qms-border)' }}>
                  <td className="px-3 py-2.5">
                    <div className="font-semibold" style={{ color: 'var(--qms-text)' }}>{p.name}</div>
                    <div className="text-[11px]" style={{ color: 'var(--qms-text-muted)' }}>{clientName(p.clientId)}</div>
                  </td>
                  <td className="px-3 py-2.5 text-center tabular-nums" style={{ color: 'var(--qms-text)' }}>{billable.length}</td>
                  <td className="px-3 py-2.5 font-bold tabular-nums" style={{ color: 'var(--qms-text)' }}>{formatINR(billable.length * rate)}</td>
                  <td className="px-3 py-2.5">
                    <Button size="sm" disabled={billable.length === 0} onClick={() => erp.generateInvoice(p, billable.map((c) => c.id), byName)}>
                      Generate invoice
                    </Button>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      <div className="rounded-xl border overflow-x-auto" style={{ background: 'var(--qms-surface)', borderColor: 'var(--qms-border)' }}>
        <table className="w-full text-[13px]">
          <thead>
            <tr style={{ background: 'var(--qms-surface-strong)' }}>
              {['Invoice', 'Client · Project', 'Camps', 'Amount', 'Stage', 'Payment'].map((h) => (
                <th key={h} className="text-left font-semibold px-3 py-2.5 text-[11px] uppercase tracking-wide" style={{ color: 'var(--qms-text-muted)' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {erp.invoices.slice().reverse().slice(0, 12).map((inv) => (
              <tr key={inv.id} className="border-t" style={{ borderColor: 'var(--qms-border)' }}>
                <td className="px-3 py-2.5 font-semibold" style={{ color: 'var(--qms-text)' }}>{inv.id}</td>
                <td className="px-3 py-2.5" style={{ color: 'var(--qms-text-soft)' }}>{clientName(inv.clientId)} · {inv.projectId}</td>
                <td className="px-3 py-2.5 text-center tabular-nums" style={{ color: 'var(--qms-text)' }}>{inv.campCount}</td>
                <td className="px-3 py-2.5 font-bold tabular-nums" style={{ color: 'var(--qms-text)' }}>{formatINR(inv.total)}</td>
                <td className="px-3 py-2.5">
                  <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full" style={{ background: 'rgba(59,109,255,.12)', color: 'var(--qms-brand)' }}>{inv.stage}</span>
                </td>
                <td className="px-3 py-2.5">
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full" style={{ background: inv.paymentStatus === 'CLEARED' ? 'var(--success-soft)' : 'var(--danger-soft)', color: inv.paymentStatus === 'CLEARED' ? 'var(--success)' : 'var(--danger)' }}>
                    {inv.paymentStatus}
                  </span>
                </td>
              </tr>
            ))}
            {erp.invoices.length === 0 && (
              <tr><td colSpan={6} className="text-center py-8 text-[13px]" style={{ color: 'var(--qms-text-muted)' }}>No invoices generated yet.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}

export default InvoicingTab
