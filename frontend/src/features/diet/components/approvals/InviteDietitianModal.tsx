import { useEffect, useMemo, useState } from 'react'
import { FiSend, FiCheckCircle, FiXCircle, FiClock } from 'react-icons/fi'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { toast } from '@/components/ui/sonner'
import {
  rankDietitiansForCamp, sortDietitiansForBcaCamp, campRequiresBca, getCampInvites, inviteSummary,
  doctorPreferredDietitians, dietitianDoctorHistory, dietitianAverageRating, getLastDietitianRates,
  bcaVerified, dietitianHasBca, addCampInvites, recordInviteResponse,
} from '@/features/diet/dietitians.service'
import { useCampsData } from '@/hooks/useCampsData'
import { fmtDate } from './helpers'
import AssignDietitianModal from './AssignDietitianModal'

interface InviteDietitianModalProps {
  open: boolean
  onClose: () => void
  campId: string | null
  userName: string
}

const InviteDietitianModal = ({ open, onClose, campId, userName }: InviteDietitianModalProps) => {
  const { camps } = useCampsData()
  const camp = useMemo(() => camps.find((c) => c.id === campId) || null, [camps, campId])
  const [checked, setChecked] = useState<Set<string>>(new Set())
  const [, setVersion] = useState(0)
  const [assignFor, setAssignFor] = useState<string | null>(null)

  // Recomputed on every render (plus a manual version bump forces a
  // re-render after invite/response mutations) — invite + rank state reads
  // live from localStorage, not React Query cache.
  let ranked: ReturnType<typeof rankDietitiansForCamp> = []
  if (camp) {
    ranked = rankDietitiansForCamp(camp, camps)
    if (campRequiresBca(camp)) ranked = sortDietitiansForBcaCamp(camp, ranked)
  }

  const invites = camp ? getCampInvites(camp.id) : []
  const summary = camp ? inviteSummary(camp.id) : { total: 0, accepted: 0, pending: 0, declined: 0 }
  const preferredIds = camp ? new Set(doctorPreferredDietitians(camp.doctorId, camps)) : new Set<string>()

  useEffect(() => {
    if (!open || !camp) return
    setVersion((v) => v + 1)
    const notYetInvited = ranked.filter((r) => !getCampInvites(camp.id).some((i) => i.dietitianId === r.dietitian.id))
    setChecked(new Set(notYetInvited.slice(0, 3).map((r) => r.dietitian.id)))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, campId])

  if (!camp) return null

  const toggle = (id: string) => {
    setChecked((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const sendInvites = async () => {
    const picked = Array.from(checked)
    if (!picked.length) { toast.error('Tick at least one dietitian to invite'); return }
    await addCampInvites(camp.id, picked, userName, 'WHATSAPP')
    toast.success(`WhatsApp invites sent · ${picked.length} dietitian(s)`)
    setChecked(new Set())
    setVersion((v) => v + 1)
  }

  const respond = async (dietitianId: string, response: 'ACCEPTED' | 'DECLINED') => {
    await recordInviteResponse(camp.id, dietitianId, response, `Recorded by ${userName}`)
    if (response === 'ACCEPTED') toast.success(`Response recorded · ${response}`)
    else toast.info(`Response recorded · ${response}`)
    setVersion((v) => v + 1)
  }

  return (
    <>
      <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
        <DialogContent className="sm:max-w-3xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Invite & confirm dietitians · {camp.id}</DialogTitle>
            <p className="text-[12px]" style={{ color: 'var(--qms-text-muted)' }}>
              {camp.city} · {fmtDate(camp.date)}{campRequiresBca(camp) ? ' · BCA required' : ''}
            </p>
          </DialogHeader>

          {summary.total > 0 ? (
            <div className="flex flex-wrap gap-1.5 mb-2">
              <Pill bg="var(--qms-surface-strong)" color="var(--qms-text-soft)">📨 {summary.total} invited</Pill>
              <Pill bg="rgba(16,185,129,.16)" color="#047857">{summary.accepted} accepted</Pill>
              <Pill bg="rgba(59,109,255,.14)" color="#1d4ed8">{summary.pending} awaiting reply</Pill>
              <Pill bg="rgba(244,63,94,.16)" color="#b91c1c">{summary.declined} declined</Pill>
            </div>
          ) : (
            <p className="text-[12px] mb-2" style={{ color: 'var(--qms-text-muted)' }}>No invites sent yet — tick the dietitians you want and send the WhatsApp invite.</p>
          )}

          <div className="overflow-x-auto">
            <table className="w-full text-[12.5px]" style={{ color: 'var(--qms-text)' }}>
              <thead>
                <tr>
                  <Th />
                  <Th>Dietitian</Th>
                  <Th align="right">Last rem.</Th>
                  <Th align="center">Rating</Th>
                  <Th align="center">BCA</Th>
                  <Th align="center">Same doctor</Th>
                  <Th>Response</Th>
                </tr>
              </thead>
              <tbody>
                {ranked.map((r) => {
                  const d = r.dietitian
                  const invite = invites.find((i) => i.dietitianId === d.id)
                  const isPreferred = preferredIds.has(d.id)
                  const hist = dietitianDoctorHistory(d.id, camp.doctorId, camps)
                  const avg = dietitianAverageRating(d.id, camps)
                  const lastRate = getLastDietitianRates(d.id)
                  return (
                    <tr key={d.id} className="border-t align-top" style={{ borderColor: 'var(--qms-border)' }}>
                      <td className="py-2 px-2">
                        {!invite ? (
                          <input type="checkbox" checked={checked.has(d.id)} onChange={() => toggle(d.id)} />
                        ) : invite.response === 'ACCEPTED' ? (
                          <FiCheckCircle color="#10b981" />
                        ) : invite.response === 'DECLINED' ? (
                          <FiXCircle color="#b91c1c" />
                        ) : (
                          <FiClock color="#f59e0b" />
                        )}
                      </td>
                      <td className="py-2 px-2">
                        <div className="flex flex-wrap items-center gap-1.5">
                          <b>{d.name}</b>
                          {isPreferred && <Pill bg="rgba(124,92,255,.16)" color="#6d28d9">★ DOCTOR'S PICK</Pill>}
                          {invite?.response === 'ACCEPTED' && <Pill bg="rgba(16,185,129,.16)" color="#047857">accepted</Pill>}
                          {invite?.response === 'DECLINED' && <Pill bg="rgba(244,63,94,.16)" color="#b91c1c">declined</Pill>}
                        </div>
                        <div className="text-[11px]" style={{ color: 'var(--qms-text-muted)' }}>{d.hq || '—'}{d.specialty ? ` · ${d.specialty}` : ''}</div>
                      </td>
                      <td className="py-2 px-2 text-right">{lastRate ? `₹${lastRate.remuneration.toLocaleString('en-IN')}` : '—'}</td>
                      <td className="py-2 px-2 text-center">{avg ? `★ ${avg.avg}` : '—'}</td>
                      <td className="py-2 px-2 text-center">
                        {campRequiresBca(camp) ? (
                          bcaVerified(d.id)
                            ? <span style={{ color: '#047857' }}>✓ BCA</span>
                            : dietitianHasBca(d.id)
                              ? <span style={{ color: '#92400e' }}>BCA · unverified</span>
                              : <span style={{ color: '#b91c1c' }}>no BCA</span>
                        ) : '—'}
                      </td>
                      <td className="py-2 px-2 text-center">{hist.count > 0 ? hist.count : '—'}</td>
                      <td className="py-2 px-2">
                        {!invite ? (
                          <span style={{ color: 'var(--qms-text-muted)' }}>not invited</span>
                        ) : invite.response === null ? (
                          <div className="flex items-center gap-1.5">
                            <span className="text-[10.5px] font-semibold" style={{ color: 'var(--qms-text-muted)' }}>RECORD REPLY</span>
                            <button className="text-[11px] font-bold" style={{ color: '#047857' }} onClick={() => respond(d.id, 'ACCEPTED')}>✓ Accepted</button>
                            <button className="text-[11px] font-bold" style={{ color: '#b91c1c' }} onClick={() => respond(d.id, 'DECLINED')}>✗ Declined</button>
                          </div>
                        ) : invite.response === 'ACCEPTED' ? (
                          <Button size="sm" onClick={() => setAssignFor(d.id)}>Assign</Button>
                        ) : (
                          <Pill bg="rgba(244,63,94,.16)" color="#b91c1c">DECLINED</Pill>
                        )}
                      </td>
                    </tr>
                  )
                })}
                {ranked.length === 0 && (
                  <tr><td colSpan={7} className="py-4 text-center" style={{ color: 'var(--qms-text-muted)' }}>No dietitians available.</td></tr>
                )}
              </tbody>
            </table>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={onClose}>Close</Button>
            <Button onClick={sendInvites}><FiSend size={13} /> Send WhatsApp invites</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AssignDietitianModal
        open={!!assignFor}
        onClose={() => setAssignFor(null)}
        campId={campId}
        preSelectedDietitianId={assignFor}
        userName={userName}
        onDone={() => setAssignFor(null)}
      />
    </>
  )
}

function Pill({ children, bg, color }: { children: React.ReactNode; bg: string; color: string }) {
  return <span className="text-[10.5px] font-bold px-2 py-0.5 rounded-full" style={{ background: bg, color }}>{children}</span>
}
function Th({ children, align }: { children?: React.ReactNode; align?: 'right' | 'center' }) {
  return <th className={`py-1.5 px-2 text-[11px] font-semibold uppercase ${align === 'right' ? 'text-right' : align === 'center' ? 'text-center' : 'text-left'}`} style={{ color: 'var(--qms-text-muted)' }}>{children}</th>
}

export default InviteDietitianModal
