import type { Camp } from '@/types/camp.types'
import { FiUnlock, FiX, FiCheckCircle } from 'react-icons/fi'
import { Button } from '@/components/ui/button'
import { clientName } from '@/types/campref.types'
import { useAuth } from '@/hooks/useAuth'
import type { useOm } from '@/features/om/hooks/useOm'
import { formatDate } from '@/utils/formatters'

interface ReopenRequestsTabProps {
  camps: Camp[]
  om: ReturnType<typeof useOm>
}

interface ReopenReq { id: string; reason: string; requestedAt: string; requestedBy: string; status: 'PENDING' | 'APPROVED' | 'DENIED' }

// Mirrors tabReopenRequests() exactly (om-portal.js:1929-1989) — card-list for
// pending requests + a full history table below for ALL reopen requests
// (approved/denied included), not just the pending ones. Denial requires a
// reason, matching the prototype's own prompt()-gated denial UX.
const ReopenRequestsTab = ({ camps, om }: ReopenRequestsTabProps) => {
  const { user } = useAuth()
  const byName = user ? `${user.firstName} ${user.lastName}` : 'Operations Manager · Diet'

  const handleApprove = (campId: string, requestId: string) => om.decideReopen(campId, requestId, 'APPROVED', byName)

  const handleDeny = (campId: string, requestId: string) => {
    const reason = window.prompt('Why are you denying this reopen request?')?.trim()
    if (!reason) return
    om.decideReopen(campId, requestId, 'DENIED', byName, reason)
  }

  const dietCamps = camps.filter((c) => c.type === 'Diet')
  const allRows = dietCamps.flatMap((c) => ((c as unknown as { reopenRequests?: ReopenReq[] }).reopenRequests ?? []).map((r) => ({ camp: c, request: r })))
  const pending = allRows.filter((row) => row.request.status === 'PENDING')

  return (
    <div>
      <div className="rounded-xl p-3.5 mb-3" style={{ background: 'rgba(245,158,11,.05)', borderLeft: '3px solid #f59e0b' }}>
        <div className="text-[13px] font-extrabold" style={{ color: 'var(--qms-text)' }}>Reopen requests ({pending.length})</div>
        <div className="text-[11px]" style={{ color: 'var(--qms-text-muted)' }}>
          Dietitians whose 24-hour data-submission window has expired and who have asked to reopen the unique link. Approve to grant another 24 hours.
        </div>
      </div>

      {pending.length === 0 ? (
        <div className="rounded-xl border p-6 text-center" style={{ background: 'var(--qms-surface)', borderColor: 'var(--qms-border)' }}>
          <FiCheckCircle size={22} style={{ color: '#10b981' }} className="mx-auto" />
          <div className="font-bold mt-1.5" style={{ color: 'var(--qms-text)' }}>Nothing pending</div>
          <div className="text-[11px]" style={{ color: 'var(--qms-text-muted)' }}>No reopen requests right now.</div>
        </div>
      ) : (
        <div className="space-y-2.5">
          {pending.map(({ camp, request }) => (
            <div key={request.id} className="rounded-xl border p-3.5" style={{ background: 'var(--qms-surface)', borderColor: 'var(--qms-border)' }}>
              <div className="flex justify-between gap-2.5 flex-wrap">
                <div>
                  <div className="font-extrabold text-[13px]" style={{ color: 'var(--qms-text)' }}>{camp.id} · {clientName(camp.clientId)}</div>
                  <div className="text-[11px]" style={{ color: 'var(--qms-text-muted)' }}>{camp.city || '—'} · {formatDate(camp.date)}</div>
                  <div className="rounded-lg px-2.5 py-2 mt-2 text-[12px]" style={{ background: 'rgba(59,109,255,.06)', color: 'var(--qms-text-soft)' }}>
                    <strong>Reason:</strong> {request.reason || '(none)'}
                  </div>
                  <div className="text-[11px] mt-1.5" style={{ color: 'var(--qms-text-muted)' }}>
                    Requested {formatDate(request.requestedAt)} by {request.requestedBy}
                  </div>
                </div>
                <div className="flex flex-col gap-1.5 shrink-0">
                  <Button size="sm" onClick={() => handleApprove(camp.id, request.id)}><FiUnlock size={13} /> Approve · grant 24h</Button>
                  <Button size="sm" variant="ghost" style={{ color: 'var(--danger)' }} onClick={() => handleDeny(camp.id, request.id)}><FiX size={13} /> Deny</Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {allRows.length > 0 && (
        <div className="rounded-xl border p-3.5 mt-3.5" style={{ background: 'var(--qms-surface)', borderColor: 'var(--qms-border)' }}>
          <div className="text-[13px] font-extrabold mb-1.5" style={{ color: 'var(--qms-text)' }}>All reopen-request history</div>
          <div className="overflow-x-auto">
            <table className="w-full text-[12px]">
              <thead>
                <tr style={{ background: 'var(--qms-surface-strong)' }}>
                  {['Camp', 'Requested at', 'Reason', 'Status'].map((h) => (
                    <th key={h} className="text-left font-bold px-2 py-2 text-[10px] uppercase tracking-wide" style={{ color: 'var(--qms-text-muted)' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {allRows.map(({ camp, request }) => (
                  <tr key={request.id} className="border-t border-dashed" style={{ borderColor: 'var(--qms-border)' }}>
                    <td className="px-2 py-2"><span className="font-bold" style={{ color: 'var(--qms-text)' }}>{camp.id}</span><div className="text-[10.5px]" style={{ color: 'var(--qms-text-muted)' }}>{camp.city || ''}</div></td>
                    <td className="px-2 py-2">{formatDate(request.requestedAt)}</td>
                    <td className="px-2 py-2 text-[11.5px]">{request.reason}</td>
                    <td className="px-2 py-2">
                      {request.status === 'APPROVED' && <span className="font-extrabold" style={{ color: '#047857' }}>✓ APPROVED</span>}
                      {request.status === 'DENIED' && <span className="font-extrabold" style={{ color: '#b91c1c' }}>✗ DENIED</span>}
                      {request.status === 'PENDING' && <span className="font-extrabold" style={{ color: '#92400e' }}>PENDING</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}

export default ReopenRequestsTab
