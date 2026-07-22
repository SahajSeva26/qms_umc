import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { fmtInr } from '@/features/diet/dietitians.service'

export interface ReconciliationReport {
  totalRows: number
  recorded: number
  campsMarkedPaid: number
  amountReconciled: number
  alreadyDone: number
  held: number
  rejected: number
  pendingBlank: number
  discrepancies: string[]
  notFound: string[]
}

interface ReconciliationReportModalProps {
  report: ReconciliationReport | null
  onClose: () => void
}

const StatTile = ({ label, value, color }: { label: string; value: string | number; color: string }) => (
  <div className="rounded-xl border p-3" style={{ borderColor: 'var(--qms-border)', background: 'var(--qms-surface)' }}>
    <div className="text-[10.5px] font-bold uppercase tracking-wide" style={{ color: 'var(--qms-text-muted)' }}>{label}</div>
    <div className="text-[19px] font-extrabold mt-1" style={{ color }}>{value}</div>
  </div>
)

// Reconciliation report modal — §6 of the build spec. Pure display, driven by
// the report object the page builds while processing the finance CSV.
const ReconciliationReportModal = ({ report, onClose }: ReconciliationReportModalProps) => {
  if (!report) return null
  return (
    <Dialog open={!!report} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Reconciliation complete</DialogTitle>
        </DialogHeader>
        <p className="text-[12px] -mt-2" style={{ color: 'var(--qms-text-muted)' }}>{report.totalRows} row(s) processed from the finance file</p>

        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
          <StatTile label="Payouts recorded" value={report.recorded} color="#047857" />
          <StatTile label="Camps marked paid" value={report.campsMarkedPaid} color="#047857" />
          <StatTile label="Amount reconciled" value={fmtInr(report.amountReconciled)} color="#047857" />
          <StatTile label="Already reconciled" value={report.alreadyDone} color="#1d4ed8" />
          <StatTile label="On hold" value={report.held} color="#92400e" />
          <StatTile label="Rejected" value={report.rejected} color="#b91c1c" />
          <StatTile label="No status / pending" value={report.pendingBlank} color="#475569" />
        </div>

        {report.recorded === 0 && (
          <div className="rounded-lg px-3 py-2.5 text-[12px]" style={{ background: 'rgba(59,109,255,.06)', border: '1px solid rgba(59,109,255,.2)', color: '#1d4ed8' }}>
            No new payouts were recorded — every PAID row was already reconciled, or no row was marked PAID.
          </div>
        )}

        {report.discrepancies.length > 0 && (
          <div>
            <div className="text-[12px] font-bold mb-1" style={{ color: '#92400e' }}>Amount mismatches — recorded actual paid amount</div>
            <ul className="text-[11.5px] rounded-lg border p-2.5 space-y-1" style={{ borderColor: 'var(--qms-border)', background: 'rgba(245,158,11,.06)' }}>
              {report.discrepancies.map((d, i) => <li key={i} style={{ color: 'var(--qms-text)' }}>{d}</li>)}
            </ul>
          </div>
        )}

        {report.notFound.length > 0 && (
          <div>
            <div className="text-[12px] font-bold mb-1" style={{ color: '#b91c1c' }}>Camp IDs not found in the portal</div>
            <ul className="text-[11.5px] rounded-lg border p-2.5 space-y-1" style={{ borderColor: 'var(--qms-border)', background: 'rgba(244,63,94,.06)' }}>
              {report.notFound.map((d, i) => <li key={i} style={{ color: 'var(--qms-text)' }}>{d}</li>)}
            </ul>
          </div>
        )}

        <p className="text-[11px]" style={{ color: 'var(--qms-text-muted)' }}>
          Re-importing the same file is safe — already-reconciled camps are skipped automatically. HOLD / REJECTED rows are left unpaid so they re-surface in the next payment-ready export.
        </p>

        <DialogFooter>
          <Button onClick={onClose}>Done</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export default ReconciliationReportModal
