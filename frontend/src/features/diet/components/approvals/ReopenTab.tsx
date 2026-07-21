import { useMemo, useState } from 'react'
import { FiCheckCircle, FiUnlock, FiX } from 'react-icons/fi'
import type { Camp } from '@/types/camp.types'
import { pendingReopenRequests, isCoordCamp, reopenRequestDecisionPatch } from '@/features/diet/dietitians.service'
import { useCampsData } from '@/hooks/useCampsData'
import { fmtDate, fmtDt } from './helpers'
import DenyReopenModal from './DenyReopenModal'
import { toast } from '@/components/ui/sonner'

interface ReopenTabProps {
  camps: Camp[]
  allCamps: Camp[]
  adminLike: boolean
  coordId: string | null
  userName: string
}

const ReopenTab = ({ allCamps, adminLike, coordId, userName }: ReopenTabProps) => {
  const { patchCamp } = useCampsData()
  const [denyFor, setDenyFor] = useState<string | null>(null)

  const requests = useMemo(() => {
    const all = pendingReopenRequests(allCamps)
    if (adminLike) return all
    if (!coordId) return []
    return all.filter((r) => {
      const camp = allCamps.find((c) => c.id === r.campId)
      return camp && isCoordCamp(camp, coordId)
    })
  }, [allCamps, adminLike, coordId])

  const approve = async (campId: string) => {
    const camp = allCamps.find((c) => c.id === campId)
    if (!camp) return
    await patchCamp(campId, reopenRequestDecisionPatch(camp, 'APPROVED', userName))
    toast.success(`Reopen approved · 24h window restarted for ${campId}`)
  }

  const deny = async (campId: string, reason: string) => {
    const camp = allCamps.find((c) => c.id === campId)
    if (!camp) return
    await patchCamp(campId, reopenRequestDecisionPatch(camp, 'DENIED', userName, reason))
    toast.info(`Reopen denied · ${campId}`)
    setDenyFor(null)
  }

  return (
    <div>
      <div className="rounded-lg px-3.5 py-2.5 mb-4" style={{ background: 'rgba(245,158,11,.05)', borderLeft: '3px solid #f59e0b' }}>
        <div className="text-[13px] font-bold" style={{ color: 'var(--qms-text)' }}>Reopen requests ({requests.length})</div>
        <div className="text-[12px] mt-0.5" style={{ color: 'var(--qms-text-muted)' }}>
          The 24-hour submission window has expired for these camps. Dietitians have requested a new window — approve to give them another 24 hours, or deny.
        </div>
      </div>

      {requests.length === 0 ? (
        <div className="rounded-xl border p-8 text-center" style={{ background: 'var(--qms-surface)', borderColor: 'var(--qms-border)' }}>
          <FiCheckCircle size={22} color="#10b981" className="mx-auto mb-2" />
          <div className="font-bold text-[13.5px]" style={{ color: 'var(--qms-text)' }}>Nothing to action</div>
          <div className="text-[12px] mt-1" style={{ color: 'var(--qms-text-muted)' }}>No pending reopen requests in your scope.</div>
        </div>
      ) : (
        <div className="space-y-3">
          {requests.map((r) => (
            <div key={r.request.id} className="rounded-xl border p-3.5" style={{ background: 'var(--qms-surface)', borderColor: 'var(--qms-border)' }}>
              <div className="font-bold text-[13.5px]" style={{ color: 'var(--qms-text)' }}>
                {r.campId}{r.dietitianName ? ` · ${r.dietitianName}` : ''}
              </div>
              <div className="text-[11.5px] mt-0.5" style={{ color: 'var(--qms-text-muted)' }}>{r.city || '—'} · {fmtDate(r.date)}</div>
              <div className="rounded-lg mt-2 p-2.5 text-[12.5px]" style={{ background: 'rgba(59,109,255,.06)', color: 'var(--qms-text)' }}>
                Reason: {r.request.reason || '(none provided)'}
              </div>
              <div className="text-[11px] mt-1.5" style={{ color: 'var(--qms-text-muted)' }}>
                Requested {fmtDt(r.request.requestedAt)} by {r.request.requestedBy}
              </div>
              <div className="flex items-center gap-2 mt-3">
                <button
                  onClick={() => approve(r.campId)}
                  className="flex items-center gap-1.5 text-[12.5px] font-bold px-3.5 py-1.5 rounded-lg text-white"
                  style={{ background: 'linear-gradient(135deg, var(--qms-brand), var(--qms-teal))' }}
                >
                  <FiUnlock size={13} /> Approve · grant 24h
                </button>
                <button
                  onClick={() => setDenyFor(r.campId)}
                  className="flex items-center gap-1.5 text-[12px] font-semibold px-3 py-1.5 rounded-lg"
                  style={{ background: 'var(--qms-surface-strong)', color: '#b91c1c' }}
                >
                  <FiX size={12} /> Deny
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      <DenyReopenModal
        open={!!denyFor}
        onClose={() => setDenyFor(null)}
        onConfirm={(reason) => denyFor && deny(denyFor, reason)}
      />
    </div>
  )
}

export default ReopenTab
