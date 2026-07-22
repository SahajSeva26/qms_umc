import { useMemo, useState } from 'react'
import { FiPlus, FiFileText, FiCheckCircle, FiClock, FiXCircle, FiAlertTriangle, FiFile } from 'react-icons/fi'
import type { Person } from '@/types/people.types'
import type { Camp } from '@/types/camp.types'
import type { FoClaim, ClaimType } from '@/features/fo/fo.types'
import KpiTile from '@/components/ui/KpiTile'
import { Button } from '@/components/ui/button'
import { toast } from '@/components/ui/sonner'
import FileClaimWorkspaceModal from '@/features/fo/components/workspace/FileClaimWorkspaceModal'
import { formatINR, formatDate } from '@/utils/formatters'

interface ExpensesModuleProps {
  me: Person
  camps: Camp[]
  claims: FoClaim[]
  fileClaim: (claim: Omit<FoClaim, 'id' | 'filedOn' | 'status'>, status?: FoClaim['status']) => Promise<unknown>
}

const STATUS_STYLE: Record<string, { bg: string; color: string }> = {
  DRAFT: { bg: 'var(--qms-surface-strong)', color: 'var(--qms-text-muted)' },
  PENDING: { bg: 'var(--warning-soft)', color: 'var(--warning)' },
  SUBMITTED: { bg: 'var(--warning-soft)', color: 'var(--warning)' },
  APPROVED: { bg: 'rgba(59,109,255,.12)', color: 'var(--qms-brand)' },
  REJECTED: { bg: 'var(--danger-soft)', color: 'var(--danger)' },
  PAID: { bg: 'var(--success-soft)', color: 'var(--success)' },
}

function daysSince(iso: string): number {
  return Math.floor((Date.now() - new Date(iso).getTime()) / 86_400_000)
}

function daysBetween(a: string, b: string): number {
  return Math.round((new Date(b).getTime() - new Date(a).getTime()) / 86_400_000)
}

const POLICY_LINES = [
  'Bills are mandatory · upload PDF or photo with the claim',
  '15-day window from camp date · later submissions need manager exception',
  'Duplicate detection is automated · re-using a bill triggers an audit ticket',
  'OCR auto-fills vendor + amount + GST when the bill image is clear',
]

const ExpensesModule = ({ me, camps, claims, fileClaim }: ExpensesModuleProps) => {
  const [modalOpen, setModalOpen] = useState(false)

  const totals = useMemo(() => {
    const draft = claims.filter((c) => c.status === 'DRAFT')
    const review = claims.filter((c) => c.status === 'PENDING' || c.status === 'SUBMITTED')
    const approvedPaid = claims.filter((c) => c.status === 'APPROVED' || c.status === 'PAID')
    const rejected = claims.filter((c) => c.status === 'REJECTED')
    return {
      total: claims.length,
      draft: draft.reduce((s, c) => s + c.amount, 0),
      review: review.reduce((s, c) => s + c.amount, 0),
      approvedPaid: approvedPaid.reduce((s, c) => s + c.amount, 0),
      rejected: rejected.reduce((s, c) => s + c.amount, 0),
    }
  }, [claims])

  const rows = useMemo(() => [...claims].sort((a, b) => (a.filedOn < b.filedOn ? 1 : -1)), [claims])

  const handleFile = (claim: { date: string; type: ClaimType; amount: number; gst: number; vendor: string; campId?: string; notes?: string; billUrl: string }) => {
    // Stub OCR (pretend we extracted vendor+amount from the bill) + fraud check
    // (same vendor + same amount filed within 30 days) — exact port of
    // fo-portal.js:813-817's submitClaim().
    const ocr = { vendor: claim.vendor, amount: claim.amount, gst: claim.gst, confidence: 0.84 }
    const existing = claims.filter((c) =>
      c.foId === me.id && c.vendor === claim.vendor && c.amount === claim.amount &&
      Math.abs(daysBetween(c.date, claim.date)) < 30
    )
    const fraudFlag = existing.length > 0

    fileClaim({
      foId: me.id,
      foName: me.name,
      date: claim.date,
      type: claim.type,
      amount: claim.amount,
      gst: claim.gst,
      vendor: claim.vendor,
      campId: claim.campId,
      notes: claim.notes,
      billUrl: claim.billUrl,
      ocr,
      fraudFlag,
    }, 'SUBMITTED')

    if (fraudFlag) toast.info('Possible duplicate — flagged for manager review')
  }

  return (
    <div>
      <div className="grid gap-3 mb-4" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(170px, 1fr))' }}>
        <KpiTile label="Total claims" value={String(totals.total)} tone="brand" icon={FiFileText} />
        <KpiTile label="Draft" value={formatINR(totals.draft)} tone="teal" icon={FiClock} />
        <KpiTile label="In review" value={formatINR(totals.review)} tone="amber" icon={FiClock} />
        <KpiTile label="Approved / Paid" value={formatINR(totals.approvedPaid)} tone="emerald" icon={FiCheckCircle} />
        <KpiTile label="Rejected" value={formatINR(totals.rejected)} tone="rose" icon={FiXCircle} />
      </div>

      <div className="flex justify-end mb-3">
        <Button onClick={() => setModalOpen(true)}><FiPlus size={13} /> File claim</Button>
      </div>

      <div className="rounded-xl border overflow-hidden mb-4" style={{ background: 'var(--qms-surface)', borderColor: 'var(--qms-border)' }}>
        <div className="overflow-x-auto">
          <table className="w-full text-[13px]">
            <thead>
              <tr style={{ background: 'var(--qms-surface-strong)' }}>
                {['ID', 'Date', 'Type', 'Camp', 'Bill', 'Status'].map((h) => (
                  <th key={h} className="text-left font-semibold px-3 py-2.5 text-[11px] uppercase tracking-wide" style={{ color: 'var(--qms-text-muted)' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((c) => {
                const late = daysSince(c.date) > 15
                return (
                  <tr key={c.id} className="border-t" style={{ borderColor: 'var(--qms-border)' }}>
                    <td className="px-3 py-2.5 font-semibold" style={{ color: 'var(--qms-text)' }}>{c.id}</td>
                    <td className="px-3 py-2.5 text-[12px]" style={{ color: 'var(--qms-text-muted)' }}>
                      {formatDate(c.date)}
                      {late && <span className="ml-1.5 text-[10px] font-bold px-1.5 py-0.5 rounded-full" style={{ background: 'var(--danger-soft)', color: 'var(--danger)' }}>LATE</span>}
                    </td>
                    <td className="px-3 py-2.5" style={{ color: 'var(--qms-text-soft)' }}>{c.type}</td>
                    <td className="px-3 py-2.5 text-[12px]" style={{ color: 'var(--qms-text-muted)' }}>{c.campId ?? '—'}</td>
                    <td className="px-3 py-2.5">
                      {c.billUrl ? (
                        <span className="inline-flex items-center gap-1 text-[11px] font-semibold" style={{ color: 'var(--qms-text-soft)' }}><FiFile size={12} /> Attached</span>
                      ) : (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full" style={{ background: 'var(--danger-soft)', color: 'var(--danger)' }}>MISSING</span>
                      )}
                    </td>
                    <td className="px-3 py-2.5">
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full" style={{ background: STATUS_STYLE[c.status]?.bg, color: STATUS_STYLE[c.status]?.color }}>{c.status}</span>
                    </td>
                  </tr>
                )
              })}
              {rows.length === 0 && (
                <tr><td colSpan={6} className="text-center py-8 text-[13px]" style={{ color: 'var(--qms-text-muted)' }}>No claims filed yet.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="rounded-xl border p-3.5" style={{ background: 'var(--warning-soft)', borderColor: 'var(--qms-border)' }}>
        <div className="flex items-center gap-2 mb-2">
          <FiAlertTriangle size={14} style={{ color: 'var(--warning)' }} />
          <div className="text-[11px] font-bold uppercase tracking-wide" style={{ color: 'var(--warning)' }}>Policy reminders</div>
        </div>
        <ul className="space-y-1.5 text-[12.5px] pl-4 list-disc" style={{ color: 'var(--qms-text-soft)' }}>
          {POLICY_LINES.map((line) => <li key={line}>{line}</li>)}
        </ul>
      </div>

      <FileClaimWorkspaceModal open={modalOpen} onClose={() => setModalOpen(false)} camps={camps} onSubmit={handleFile} />
    </div>
  )
}

export default ExpensesModule
