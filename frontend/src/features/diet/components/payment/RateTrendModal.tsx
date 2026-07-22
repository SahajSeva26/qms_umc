import { useMemo } from 'react'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { getDietitianRateHistory } from '@/features/diet/dietitians.service'
import { toCsv, downloadCsv, slugify, todayIso } from '@/features/diet/components/payment/paymentCsv'

interface RateTrendModalProps {
  dietitianId: string | null
  dietitianName: string
  onClose: () => void
}

// Hand-built inline SVG sparkline — no charting library. Points normalized
// to a 320x80 viewbox based on min/max total, oldest→newest left→right
// (history itself is newest-first, so we reverse for the chart).
const Sparkline = ({ totals }: { totals: number[] }) => {
  const w = 320, h = 80, pad = 6
  const min = Math.min(...totals)
  const max = Math.max(...totals)
  const range = max - min || 1
  const points = totals.map((t, i) => {
    const x = pad + (i / Math.max(1, totals.length - 1)) * (w - pad * 2)
    const y = h - pad - ((t - min) / range) * (h - pad * 2)
    return { x, y }
  })
  const path = points.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ')
  return (
    <svg viewBox={`0 0 ${w} ${h}`} width="100%" height={h} className="block">
      <path d={path} fill="none" stroke="#14b8a6" strokeWidth={2} />
      {points.map((p, i) => (
        <circle key={i} cx={p.x} cy={p.y} r={2.5} fill="#14b8a6" />
      ))}
    </svg>
  )
}

const RateTrendModal = ({ dietitianId, dietitianName, onClose }: RateTrendModalProps) => {
  const history = useMemo(() => (dietitianId ? getDietitianRateHistory(dietitianId) : []), [dietitianId])

  const exportTrend = () => {
    const rows = history.map((h) => ({
      When: h.setAt,
      Set_By: h.setBy,
      Remuneration_INR: h.remuneration,
      TA_INR: h.ta,
      Printing_INR: h.printing,
      Total_INR: h.remuneration + h.ta + h.printing,
      Reason: h.reason,
      Camp_ID: h.campId,
    }))
    downloadCsv(`rate-trend-${slugify(dietitianName)}-${todayIso()}.csv`, toCsv(rows))
  }

  return (
    <Dialog open={!!dietitianId} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-3xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Rate trend · {dietitianName}</DialogTitle>
        </DialogHeader>
        <p className="text-[12px] -mt-2" style={{ color: 'var(--qms-text-muted)' }}>{history.length} change(s) on record</p>

        {history.length === 0 ? (
          <div className="rounded-xl border p-4 text-[12.5px] text-center" style={{ borderColor: 'var(--qms-border)', color: 'var(--qms-text-muted)' }}>
            No rate changes recorded yet for {dietitianName}. The first camp assignment captures the baseline.
          </div>
        ) : (
          <>
            {history.length > 1 && (
              <div className="rounded-xl border p-3" style={{ borderColor: 'var(--qms-border)', background: 'var(--qms-surface-strong)' }}>
                <Sparkline totals={[...history].reverse().map((h) => h.remuneration + h.ta + h.printing)} />
              </div>
            )}
            <div className="overflow-x-auto">
              <table className="w-full text-[12px]">
                <thead>
                  <tr style={{ background: 'var(--qms-surface-strong)' }}>
                    {['When', 'Set by', 'Remuneration ₹', 'TA ₹', 'Printing ₹', 'Total ₹', 'Reason', 'Camp'].map((h) => (
                      <th key={h} className="text-left font-bold px-2 py-2 text-[10px] uppercase tracking-wide whitespace-nowrap" style={{ color: 'var(--qms-text-muted)' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {history.map((h, i) => {
                    const total = h.remuneration + h.ta + h.printing
                    const older = history[i + 1]
                    const olderTotal = older ? older.remuneration + older.ta + older.printing : null
                    let deltaPill: React.ReactNode = null
                    if (olderTotal !== null) {
                      const delta = total - olderTotal
                      if (delta > 0) deltaPill = <span className="ml-1.5 text-[9.5px] font-bold px-1.5 py-0.5 rounded-full" style={{ background: 'rgba(245,158,11,.18)', color: '#92400e' }}>+₹{delta.toLocaleString('en-IN')}</span>
                      else if (delta < 0) deltaPill = <span className="ml-1.5 text-[9.5px] font-bold px-1.5 py-0.5 rounded-full" style={{ background: 'rgba(16,185,129,.16)', color: '#047857' }}>-₹{Math.abs(delta).toLocaleString('en-IN')}</span>
                      else deltaPill = <span className="ml-1.5 text-[9.5px] font-bold px-1.5 py-0.5 rounded-full" style={{ background: 'rgba(59,109,255,.14)', color: '#1d4ed8' }}>=</span>
                    }
                    return (
                      <tr key={i} className="border-t border-dashed" style={{ borderColor: 'var(--qms-border)' }}>
                        <td className="px-2 py-2">
                          <div className="font-semibold">{new Date(h.setAt).toLocaleDateString('en-IN')}</div>
                          <div className="text-[10.5px]" style={{ color: 'var(--qms-text-muted)' }}>{new Date(h.setAt).toLocaleTimeString('en-IN')}</div>
                        </td>
                        <td className="px-2 py-2">{h.setBy}</td>
                        <td className="px-2 py-2 text-right">{h.remuneration.toLocaleString('en-IN')}</td>
                        <td className="px-2 py-2 text-right">{h.ta.toLocaleString('en-IN')}</td>
                        <td className="px-2 py-2 text-right">{h.printing.toLocaleString('en-IN')}</td>
                        <td className="px-2 py-2 text-right font-bold whitespace-nowrap">{total.toLocaleString('en-IN')}{deltaPill}</td>
                        <td className="px-2 py-2">{h.reason}</td>
                        <td className="px-2 py-2">{h.campId}</td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Close</Button>
          {history.length > 0 && (
            <Button onClick={exportTrend}>Export trend CSV</Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export default RateTrendModal
