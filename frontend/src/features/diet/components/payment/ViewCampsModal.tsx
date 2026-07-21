import { useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { FiDollarSign, FiExternalLink } from 'react-icons/fi'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import type { Camp } from '@/types/camp.types'
import {
  dietitianExpense, poCampCost, campPaymentStatus, paymentsForCamp,
} from '@/features/diet/dietitians.service'

interface ViewCampsModalProps {
  dietitianId: string | null
  dietitianName: string
  camps: Camp[]
  adminLike: boolean
  onClose: () => void
  onAddPayment: (dietitianId: string) => void
}

const statusStyle: Record<string, React.CSSProperties> = {
  PAID: { background: 'rgba(16,185,129,.16)', color: '#047857' },
  READY: { background: 'rgba(245,158,11,.18)', color: '#92400e' },
  PENDING: { background: 'rgba(244,63,94,.16)', color: '#b91c1c' },
}

const ReportPill = ({ ok, label }: { ok: boolean; label: string }) => (
  <span
    className="text-[9.5px] font-bold px-1.5 py-0.5 rounded-full"
    style={ok ? { background: 'rgba(16,185,129,.16)', color: '#047857' } : { background: 'rgba(244,63,94,.16)', color: '#b91c1c' }}
  >
    {label}
  </span>
)

// View Camps modal — §2 of the build spec. All of this dietitian's Diet
// (non-cancelled) camps, sorted date desc, with the full expense/payment
// breakdown and per-camp payment-status pill.
const ViewCampsModal = ({ dietitianId, dietitianName, camps, adminLike, onClose, onAddPayment }: ViewCampsModalProps) => {
  const navigate = useNavigate()
  const rows = useMemo(() => {
    if (!dietitianId) return []
    return camps
      .filter((c) => c.type === 'Diet' && c.dietitianId === dietitianId && !/CANCEL/i.test(c.status))
      .sort((a, b) => (b.date || '').localeCompare(a.date || ''))
  }, [camps, dietitianId])

  return (
    <Dialog open={!!dietitianId} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-6xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Camps · {dietitianName}</DialogTitle>
        </DialogHeader>
        <p className="text-[12px] -mt-2" style={{ color: 'var(--qms-text-muted)' }}>{rows.length} camp(s) · all payments inline</p>

        <div className="overflow-x-auto">
          <table className="w-full text-[12px]">
            <thead>
              <tr style={{ background: 'var(--qms-surface-strong)' }}>
                {['Camp', 'Report', 'PO cost ₹', 'Base ₹', 'TA ₹', 'Printing ₹', 'Target ₹', 'Total ₹', 'Paid ₹', 'Status'].map((h) => (
                  <th key={h} className="text-left font-bold px-2 py-2 text-[10px] uppercase tracking-wide whitespace-nowrap" style={{ color: 'var(--qms-text-muted)' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((c) => {
                const e = dietitianExpense(c)
                const st = campPaymentStatus(c) ?? 'PENDING'
                const paid = paymentsForCamp(c.id).reduce((s, p) => s + Number(p.amount || 0), 0)
                const hasPatients = Number(c.patientCount || c.patientsDone || 0) > 0
                const hasPhotos = (Array.isArray(c.photos) && c.photos.length > 0)
                  || (Array.isArray(c.submissionData?.photos) && (c.submissionData?.photos.length ?? 0) > 0)
                return (
                  <tr key={c.id} className="border-t border-dashed" style={{ borderColor: 'var(--qms-border)' }}>
                    <td className="px-2 py-2">
                      <span className="font-bold" style={{ color: 'var(--qms-text)' }}>{c.id}</span>
                      <div className="text-[10.5px]" style={{ color: 'var(--qms-text-muted)' }}>{c.city || '—'} · {c.date}</div>
                      {c.submissionToken && (
                        <div className="text-[10px]" style={{ color: 'var(--qms-text-muted)' }}>📋 Submission link</div>
                      )}
                    </td>
                    <td className="px-2 py-2">
                      <div className="flex gap-1">
                        <ReportPill ok={hasPatients} label="PATIENTS" />
                        <ReportPill ok={hasPhotos} label="PHOTOS" />
                      </div>
                    </td>
                    <td className="px-2 py-2 font-semibold" style={{ color: '#6d28d9' }}>{poCampCost(c).toLocaleString('en-IN')}</td>
                    <td className="px-2 py-2">{e.base.toLocaleString('en-IN')}</td>
                    <td className="px-2 py-2">{e.ta.toLocaleString('en-IN')}</td>
                    <td className="px-2 py-2">{e.printing.toLocaleString('en-IN')}</td>
                    <td className="px-2 py-2">{(c.dietitianRates?.targetCost || 0).toLocaleString('en-IN')}</td>
                    <td className="px-2 py-2 font-bold">{e.total.toLocaleString('en-IN')}</td>
                    <td className="px-2 py-2">{paid.toLocaleString('en-IN')}</td>
                    <td className="px-2 py-2">
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full" style={statusStyle[st]}>{st}</span>
                    </td>
                  </tr>
                )
              })}
              {rows.length === 0 && (
                <tr><td colSpan={10} className="text-center py-8" style={{ color: 'var(--qms-text-muted)' }}>No camps for this dietitian.</td></tr>
              )}
            </tbody>
          </table>
        </div>

        <p className="text-[11px]" style={{ color: 'var(--qms-text-muted)' }}>
          PO cost = the per-camp value from the linked project's purchase order · Target = budget cap the Coord set at assignment.
        </p>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Close</Button>
          {dietitianId && (
            <Button variant="outline" onClick={() => navigate(`/diet/profiles?id=${dietitianId}`)}>
              <FiExternalLink size={13} /> Full profile
            </Button>
          )}
          {adminLike && dietitianId && (
            <Button onClick={() => onAddPayment(dietitianId)}><FiDollarSign size={13} /> Add payment for this dietitian</Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export default ViewCampsModal
