import { useMemo, useState } from 'react'
import { FiPlus, FiCalendar, FiCheckCircle, FiClock, FiXCircle } from 'react-icons/fi'
import type { Person } from '@/types/people.types'
import type { Camp } from '@/types/camp.types'
import type { LeaveRequest, LeaveType } from '@/features/fo/fo.types'
import KpiTile from '@/components/ui/KpiTile'
import { Button } from '@/components/ui/button'
import ApplyLeaveModal from '@/features/fo/components/workspace/ApplyLeaveModal'
import { toast } from '@/components/ui/sonner'
import { formatDate } from '@/utils/formatters'

interface LeaveModuleProps {
  me: Person
  camps: Camp[]
  leaves: LeaveRequest[]
  applyLeave: (leave: Omit<LeaveRequest, 'id' | 'filedOn' | 'status'>) => Promise<unknown>
}

const ANNUAL_ENTITLEMENT = 24

const STATUS_STYLE: Record<string, { bg: string; color: string }> = {
  PENDING: { bg: 'var(--warning-soft)', color: 'var(--warning)' },
  APPROVED: { bg: 'var(--success-soft)', color: 'var(--success)' },
  REJECTED: { bg: 'var(--danger-soft)', color: 'var(--danger)' },
}

function daysBetween(fromIso: string, toIso: string): number {
  return Math.round((new Date(toIso).getTime() - new Date(fromIso).getTime()) / 86_400_000) + 1
}

const LeaveModule = ({ me, camps, leaves, applyLeave }: LeaveModuleProps) => {
  const [modalOpen, setModalOpen] = useState(false)

  const usedDays = useMemo(
    () => leaves.filter((l) => l.status === 'APPROVED').reduce((s, l) => s + daysBetween(l.fromDate, l.toDate), 0),
    [leaves]
  )
  const approved = leaves.filter((l) => l.status === 'APPROVED').length
  const pending = leaves.filter((l) => l.status === 'PENDING').length
  const rejected = leaves.filter((l) => l.status === 'REJECTED').length

  const rows = useMemo(() => [...leaves].sort((a, b) => (a.filedOn < b.filedOn ? 1 : -1)), [leaves])

  const handleSubmit = (leave: { fromDate: string; toDate: string; type: LeaveType; reason: string; documentUrl?: string }) => {
    const conflicting = camps.filter((c) => {
      const d = c.date?.slice(0, 10) ?? ''
      return d >= leave.fromDate && d <= leave.toDate && c.status !== 'CANCELLED' && c.status !== 'CANCELLED_CHARGED'
    })
    applyLeave({
      foId: me.id,
      foName: me.name,
      fromDate: leave.fromDate,
      toDate: leave.toDate,
      type: leave.type,
      reason: leave.reason,
      conflictCampIds: conflicting.map((c) => c.id),
      documentUrl: leave.documentUrl,
    })
    if (conflicting.length > 0) {
      toast.info(`Leave submitted — ${conflicting.length} camp(s) in this range flagged as conflicts`)
    } else {
      toast.success('Leave request submitted')
    }
  }

  return (
    <div>
      <div className="grid gap-3 mb-4" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(170px, 1fr))' }}>
        <KpiTile label="Annual balance" value={String(Math.max(ANNUAL_ENTITLEMENT - usedDays, 0))} sub={`of ${ANNUAL_ENTITLEMENT}`} tone="brand" icon={FiCalendar} />
        <KpiTile label="Approved" value={String(approved)} tone="emerald" icon={FiCheckCircle} />
        <KpiTile label="Pending" value={String(pending)} tone="amber" icon={FiClock} />
        <KpiTile label="Rejected" value={String(rejected)} tone="rose" icon={FiXCircle} />
      </div>

      <div className="flex justify-end mb-3">
        <Button onClick={() => setModalOpen(true)}><FiPlus size={13} /> Apply leave</Button>
      </div>

      <div className="rounded-xl border overflow-hidden" style={{ background: 'var(--qms-surface)', borderColor: 'var(--qms-border)' }}>
        <div className="overflow-x-auto">
          <table className="w-full text-[13px]">
            <thead>
              <tr style={{ background: 'var(--qms-surface-strong)' }}>
                {['From', 'To', 'Days', 'Type', 'Reason', 'Status'].map((h) => (
                  <th key={h} className="text-left font-semibold px-3 py-2.5 text-[11px] uppercase tracking-wide" style={{ color: 'var(--qms-text-muted)' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((l) => (
                <tr key={l.id} className="border-t" style={{ borderColor: 'var(--qms-border)' }}>
                  <td className="px-3 py-2.5 text-[12px]" style={{ color: 'var(--qms-text-muted)' }}>{formatDate(l.fromDate)}</td>
                  <td className="px-3 py-2.5 text-[12px]" style={{ color: 'var(--qms-text-muted)' }}>{formatDate(l.toDate)}</td>
                  <td className="px-3 py-2.5" style={{ color: 'var(--qms-text)' }}>{daysBetween(l.fromDate, l.toDate)}</td>
                  <td className="px-3 py-2.5" style={{ color: 'var(--qms-text-soft)' }}>{l.type}</td>
                  <td className="px-3 py-2.5 truncate max-w-[220px]" style={{ color: 'var(--qms-text-muted)' }}>{l.reason}</td>
                  <td className="px-3 py-2.5">
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full" style={{ background: STATUS_STYLE[l.status]?.bg, color: STATUS_STYLE[l.status]?.color }}>{l.status}</span>
                  </td>
                </tr>
              ))}
              {rows.length === 0 && (
                <tr><td colSpan={6} className="text-center py-8 text-[13px]" style={{ color: 'var(--qms-text-muted)' }}>No leave history.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <ApplyLeaveModal open={modalOpen} onClose={() => setModalOpen(false)} onSubmit={handleSubmit} />
    </div>
  )
}

export default LeaveModule
