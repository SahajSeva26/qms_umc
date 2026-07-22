import { useMemo, useState } from 'react'
import { FiCheck, FiX, FiPlus } from 'react-icons/fi'
import type { Person } from '@/types/people.types'
import type { Camp } from '@/types/camp.types'
import type { FoClaim, ClaimType } from '@/features/fo/fo.types'
import { Button } from '@/components/ui/button'
import KpiTile from '@/components/ui/KpiTile'
import FileClaimModal from '@/features/fo/components/FileClaimModal'
import { formatINR, formatDate } from '@/utils/formatters'

interface ExpensesTabProps {
  fos: Person[]
  camps: Camp[]
  claims: FoClaim[]
  defaultFoId?: string
  fileClaim: (claim: Omit<FoClaim, 'id' | 'filedOn' | 'status'>) => void
  decideClaim: (id: string, decision: 'APPROVED' | 'REJECTED') => void
}

const STATUS_STYLE: Record<string, { bg: string; color: string }> = {
  PENDING: { bg: 'var(--warning-soft)', color: 'var(--warning)' },
  SUBMITTED: { bg: 'var(--warning-soft)', color: 'var(--warning)' },
  APPROVED: { bg: 'rgba(59,109,255,.12)', color: 'var(--qms-brand)' },
  REJECTED: { bg: 'var(--danger-soft)', color: 'var(--danger)' },
  PAID: { bg: 'var(--success-soft)', color: 'var(--success)' },
  DRAFT: { bg: 'var(--qms-surface-strong)', color: 'var(--qms-text-muted)' },
}

const ExpensesTab = ({ fos, camps, claims, defaultFoId, fileClaim, decideClaim }: ExpensesTabProps) => {
  const [modalOpen, setModalOpen] = useState(false)

  const totals = useMemo(() => {
    const total = claims.reduce((s, c) => s + c.amount, 0)
    const pending = claims.filter((c) => c.status === 'PENDING' || c.status === 'SUBMITTED')
    const approved = claims.filter((c) => c.status === 'APPROVED' || c.status === 'PAID')
    const rejected = claims.filter((c) => c.status === 'REJECTED')
    return {
      total,
      pending: pending.reduce((s, c) => s + c.amount, 0),
      approved: approved.reduce((s, c) => s + c.amount, 0),
      rejected: rejected.reduce((s, c) => s + c.amount, 0),
    }
  }, [claims])

  const rows = useMemo(() => [...claims].sort((a, b) => (a.filedOn < b.filedOn ? 1 : -1)), [claims])

  return (
    <div>
      <div className="grid gap-3 mb-4" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))' }}>
        <KpiTile label="Total claims" value={formatINR(totals.total)} tone="brand" icon={FiPlus} />
        <KpiTile label="Pending" value={formatINR(totals.pending)} tone="amber" icon={FiPlus} />
        <KpiTile label="Approved" value={formatINR(totals.approved)} tone="teal" icon={FiCheck} />
        <KpiTile label="Rejected" value={formatINR(totals.rejected)} tone="rose" icon={FiX} />
      </div>

      <div className="flex justify-end mb-3">
        <Button onClick={() => setModalOpen(true)}><FiPlus size={13} /> File claim</Button>
      </div>

      <div className="rounded-xl border overflow-hidden" style={{ background: 'var(--qms-surface)', borderColor: 'var(--qms-border)' }}>
        <div className="overflow-x-auto">
          <table className="w-full text-[13px]">
            <thead>
              <tr style={{ background: 'var(--qms-surface-strong)' }}>
                {['ID', 'FO', 'Date', 'Type', 'Camp', 'Amount', 'Rule', 'Status', ''].map((h) => (
                  <th key={h} className="text-left font-semibold px-3 py-2.5 text-[11px] uppercase tracking-wide" style={{ color: 'var(--qms-text-muted)' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((c) => (
                <tr key={c.id} className="border-t" style={{ borderColor: 'var(--qms-border)' }}>
                  <td className="px-3 py-2.5 font-semibold" style={{ color: 'var(--qms-text)' }}>{c.id}</td>
                  <td className="px-3 py-2.5" style={{ color: 'var(--qms-text-soft)' }}>{c.foName}</td>
                  <td className="px-3 py-2.5 text-[12px]" style={{ color: 'var(--qms-text-muted)' }}>{formatDate(c.date)}</td>
                  <td className="px-3 py-2.5" style={{ color: 'var(--qms-text-soft)' }}>{c.type}</td>
                  <td className="px-3 py-2.5 text-[12px]" style={{ color: 'var(--qms-text-muted)' }}>{c.campId ?? '—'}</td>
                  <td className="px-3 py-2.5 font-extrabold" style={{ color: 'var(--qms-text)' }}>{formatINR(c.amount)}</td>
                  <td className="px-3 py-2.5 text-[12px]" style={{ color: 'var(--qms-text-muted)' }}>{c.rule ?? '—'}</td>
                  <td className="px-3 py-2.5">
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full" style={{ background: STATUS_STYLE[c.status]?.bg, color: STATUS_STYLE[c.status]?.color }}>{c.status}</span>
                  </td>
                  <td className="px-3 py-2.5 text-right whitespace-nowrap">
                    {(c.status === 'PENDING' || c.status === 'SUBMITTED') && (
                      <>
                        <Button size="sm" variant="ghost" style={{ color: '#10b981' }} onClick={() => decideClaim(c.id, 'APPROVED')}><FiCheck size={13} /></Button>
                        <Button size="sm" variant="ghost" style={{ color: 'var(--danger)' }} onClick={() => decideClaim(c.id, 'REJECTED')}><FiX size={13} /></Button>
                      </>
                    )}
                  </td>
                </tr>
              ))}
              {rows.length === 0 && (
                <tr><td colSpan={9} className="text-center py-8 text-[13px]" style={{ color: 'var(--qms-text-muted)' }}>No claims filed.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <FileClaimModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        fos={fos}
        camps={camps}
        defaultFoId={defaultFoId}
        onSubmit={(claim) => fileClaim({ ...claim, type: claim.type as ClaimType })}
      />
    </div>
  )
}

export default ExpensesTab
