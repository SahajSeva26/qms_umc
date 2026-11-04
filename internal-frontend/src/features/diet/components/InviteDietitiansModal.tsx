import { useMemo, useState } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { FiSend, FiCheckCircle, FiXCircle, FiClock, FiUserCheck, FiMessageSquare } from 'react-icons/fi'
import { toast } from '@/components/ui/sonner'
import { useAuth } from '@/hooks/useAuth'
import { useCampsData } from '@/hooks/useCampsData'
import { summarizeInvites } from '@/features/diet/services/dietitianInvite.service'
import { invitesByDietitianId } from '@/features/diet/services/dietitianCandidates.service'
import { useCampInvites, useAddCampInvites, useRecordInviteResponse } from '@/features/diet/hooks/useDietitianInvites'
import { useDietitianCandidates } from '@/features/diet/hooks/useDietitianCandidates'
import { errorMessage } from '@/features/diet/utils/errorMessage'

interface InviteDietitiansModalProps {
  open: boolean
  onClose: () => void
  campId: string
  onProceedToRateSheet?: (dietitianId: string) => void
}

function fmtDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })
  } catch {
    return iso || '—'
  }
}

const TAG_STYLES: Record<string, { background: string; color: string }> = {
  violet: { background: 'rgba(124,92,255,.16)', color: '#6d28d9' },
  green: { background: 'var(--success-soft)', color: 'var(--success)' },
  red: { background: 'var(--danger-soft)', color: 'var(--danger)' },
  amber: { background: 'var(--warning-soft)', color: 'var(--warning)' },
  blue: { background: 'rgba(59,109,255,.14)', color: '#1d4ed8' },
  grey: { background: 'var(--qms-surface-strong)', color: 'var(--qms-text-muted)' },
}

function Tag({ tone, children }: { tone: keyof typeof TAG_STYLES; children: React.ReactNode }) {
  return (
    <span
      className="inline-block font-extrabold rounded-full ml-1"
      style={{ fontSize: '8.5px', padding: '2px 6px', letterSpacing: '.02em', ...TAG_STYLES[tone] }}
    >
      {children}
    </span>
  )
}

// Mirrors diet-invite-modal.js in full (213 lines) — SHORTLIST (ranked
// nearest dietitians, last remuneration, rating, same-doctor history,
// doctor-preferred mark, BCA scale status) → SEND (WhatsApp invite,
// multi-select) → RECORD (Accepted/Declined per dietitian) → ASSIGN
// (accepted dietitian → rate sheet).
//
// Every value below comes from the Diet domain services — the same business
// functions the sibling approvals/InviteDietitianModal.tsx uses, so both
// invite screens rank and rate identically. Invites are persisted through the
// invite mutations, NOT held in component state.
const InviteDietitiansModal = ({ open, onClose, campId, onProceedToRateSheet }: InviteDietitiansModalProps) => {
  const { user } = useAuth()
  const { camps } = useCampsData()
  const userName = user ? `${user.firstName} ${user.lastName}`.trim() : 'QMS Ops'

  const camp = useMemo(() => camps.find((c) => c.id === campId) ?? null, [camps, campId])

  const { data: inviteList = [] } = useCampInvites(campId)
  const addInvites = useAddCampInvites(campId)
  const recordResponseMutation = useRecordInviteResponse(campId)

  // One bulk read produces the ranked, BCA-tiered, fully annotated shortlist
  // (rating, last remuneration, BCA status, same-doctor history, doctor
  // preference) — the row loop below performs no service calls.
  const { requiresBca, candidates } = useDietitianCandidates(camp, camps)

  // Derived from the cached invite list — no store reads here. The list
  // refreshes because the mutations below invalidate its query key.
  const summary = summarizeInvites(inviteList)
  const invMap = useMemo(() => invitesByDietitianId(inviteList), [inviteList])

  const pickable = candidates.filter((c) => !invMap.has(c.dietitian.id))

  const [selected, setSelected] = useState<Set<string>>(
    () => new Set(candidates.filter((c) => !invMap.has(c.dietitian.id)).slice(0, 3).map((c) => c.dietitian.id))
  )

  const allPickableChecked = pickable.length > 0 && pickable.every((c) => selected.has(c.dietitian.id))

  const toggleOne = (id: string, checked: boolean) => {
    setSelected((prev) => {
      const next = new Set(prev)
      if (checked) next.add(id)
      else next.delete(id)
      return next
    })
  }

  const toggleAll = (checked: boolean) => {
    setSelected((prev) => {
      const next = new Set(prev)
      pickable.forEach((c) => {
        if (checked) next.add(c.dietitian.id)
        else next.delete(c.dietitian.id)
      })
      return next
    })
  }

  // addCampInvites() itself skips ids that already hold a non-DECLINED
  // invite, so re-sending can't double-record; `pickable` also hides anyone
  // already invited from the checkbox list.
  const handleSend = async () => {
    if (!camp) return
    const picked = pickable.filter((c) => selected.has(c.dietitian.id)).map((c) => c.dietitian.id)
    if (!picked.length) {
      toast.error('Tick at least one dietitian to invite')
      return
    }
    try {
      await addInvites.mutateAsync({ dietitianIds: picked, sentBy: userName })
    } catch (err) {
      toast.error(errorMessage(err, 'Could not send the invites — try again.'))
      return
    }
    setSelected(new Set())
    toast.success(`WhatsApp invites sent · ${picked.length} dietitian${picked.length === 1 ? '' : 's'}`)
  }

  const recordResponse = async (dietitianId: string, response: 'ACCEPTED' | 'DECLINED') => {
    if (!camp) return
    try {
      await recordResponseMutation.mutateAsync({ dietitianId, response, note: `Recorded by ${userName}` })
    } catch (err) {
      toast.error(errorMessage(err, 'Could not record the response — try again.'))
      return
    }
    toast[response === 'ACCEPTED' ? 'success' : 'info'](`Response recorded · ${response}`)
  }

  const handleAssign = (dietitianId: string) => {
    onProceedToRateSheet?.(dietitianId)
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle>Invite &amp; confirm dietitians · {campId}</DialogTitle>
          <div className="text-xs" style={{ color: 'var(--qms-text-muted)' }}>
            {requiresBca ? 'BCA required' : 'No BCA requirement flagged'}
          </div>
        </DialogHeader>

        <div className="space-y-2">
          {summary.total ? (
            <div className="flex gap-1.5 flex-wrap">
              <Tag tone="grey">📨 {summary.total} invited</Tag>
              <Tag tone="green">{summary.accepted} accepted</Tag>
              <Tag tone="blue">{summary.pending} awaiting reply</Tag>
              <Tag tone="red">{summary.declined} declined</Tag>
            </div>
          ) : (
            <div className="text-[11.5px]" style={{ color: 'var(--qms-text-muted)' }}>
              No invites sent yet — tick the dietitians you want and send the WhatsApp invite.
            </div>
          )}

          <div className="rounded-lg border overflow-auto" style={{ borderColor: 'var(--qms-border)', maxHeight: 360 }}>
            <table className="w-full border-collapse text-[12px]">
              <thead>
                <tr>
                  <th
                    className="text-center align-middle"
                    style={{ width: 34, padding: '7px 8px', borderBottom: '1px dashed var(--qms-border)', background: 'var(--qms-surface)', fontSize: 9, textTransform: 'uppercase', color: 'var(--qms-text-muted)', fontWeight: 800, letterSpacing: '.04em' }}
                  >
                    <input
                      type="checkbox"
                      title="Select all not-yet-invited"
                      checked={allPickableChecked}
                      onChange={(e) => toggleAll(e.target.checked)}
                    />
                  </th>
                  {['Dietitian', 'Last rem.', 'Rating', 'BCA', 'Same doctor', 'Response / action'].map((h, i) => (
                    <th
                      key={h}
                      className={i === 1 ? 'text-right' : i >= 2 && i <= 4 ? 'text-center' : 'text-left'}
                      style={{ padding: '7px 8px', borderBottom: '1px dashed var(--qms-border)', background: 'var(--qms-surface)', fontSize: 9, textTransform: 'uppercase', color: 'var(--qms-text-muted)', fontWeight: 800, letterSpacing: '.04em' }}
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {!candidates.length && (
                  <tr>
                    <td colSpan={7} style={{ padding: 20, textAlign: 'center', color: 'var(--qms-text-soft)' }}>
                      No dietitians available — enrol one first.
                    </td>
                  </tr>
                )}
                {candidates.map((c) => {
                  const d = c.dietitian
                  const inv = invMap.get(d.id)
                  const preferred = c.topPreferred
                  const lastRate = c.lastRates
                  const avg = c.rating
                  const hist = c.doctorHistory
                  const hasBca = c.bca.owned
                  const isBcaVerified = c.bca.verified
                  const rowBg = inv?.response === 'ACCEPTED' ? 'rgba(16,185,129,.05)' : undefined

                  return (
                    <tr key={d.id} style={{ background: rowBg }}>
                      <td className="text-center align-middle" style={{ padding: '7px 8px', borderBottom: '1px dashed var(--qms-border)' }}>
                        {!inv && (
                          <input
                            type="checkbox"
                            checked={selected.has(d.id)}
                            onChange={(e) => toggleOne(d.id, e.target.checked)}
                          />
                        )}
                        {inv?.response === 'ACCEPTED' && <FiCheckCircle size={15} style={{ color: 'var(--success)' }} />}
                        {inv?.response === 'DECLINED' && <FiXCircle size={15} style={{ color: 'var(--danger)' }} />}
                        {inv && inv.response === null && <FiClock size={15} style={{ color: 'var(--warning)' }} />}
                      </td>
                      <td style={{ padding: '7px 8px', borderBottom: '1px dashed var(--qms-border)' }}>
                        <div className="font-extrabold" style={{ fontSize: '12.5px', color: 'var(--qms-text)' }}>
                          {d.name}
                          {preferred && <Tag tone="violet">⭐ DOCTOR&apos;S PICK</Tag>}
                          {inv?.response === 'ACCEPTED' && <Tag tone="green">ACCEPTED</Tag>}
                          {inv?.response === 'DECLINED' && <Tag tone="red">DECLINED</Tag>}
                          {inv && inv.response === null && <Tag tone="blue">AWAITING REPLY</Tag>}
                        </div>
                        <div style={{ fontSize: '10.5px', color: 'var(--qms-text-muted)' }}>
                          {d.hq || '—'}{d.specialty ? ` · ${d.specialty}` : ''}
                        </div>
                      </td>
                      <td className="text-right font-bold" style={{ padding: '7px 8px', borderBottom: '1px dashed var(--qms-border)', color: 'var(--qms-text)' }}>
                        {lastRate ? `₹${lastRate.remuneration.toLocaleString('en-IN')}` : '—'}
                      </td>
                      <td className="text-center" style={{ padding: '7px 8px', borderBottom: '1px dashed var(--qms-border)' }}>
                        {avg ? (
                          <>
                            <b style={{ color: 'var(--qms-text)' }}>{avg.avg.toFixed(1)}</b>
                            <span style={{ color: 'var(--warning)' }}> ★</span>
                            <div style={{ fontSize: 9, color: 'var(--qms-text-muted)' }}>{avg.count} rating{avg.count === 1 ? '' : 's'}</div>
                          </>
                        ) : (
                          <span style={{ color: 'var(--qms-text-soft)' }}>—</span>
                        )}
                      </td>
                      <td className="text-center" style={{ padding: '7px 8px', borderBottom: '1px dashed var(--qms-border)' }}>
                        {isBcaVerified ? (
                          <Tag tone="green">✓ BCA</Tag>
                        ) : hasBca ? (
                          <Tag tone="amber">BCA · unverified</Tag>
                        ) : (
                          <Tag tone="red">no BCA</Tag>
                        )}
                      </td>
                      <td className="text-center" style={{ padding: '7px 8px', borderBottom: '1px dashed var(--qms-border)' }}>
                        {hist.count > 0 ? (
                          <>
                            <b style={{ color: 'var(--qms-text)' }}>{hist.count}</b>
                            <div style={{ fontSize: 9, color: 'var(--qms-text-muted)' }}>
                              camp{hist.count === 1 ? '' : 's'}{hist.lastDate ? ` · last ${fmtDate(hist.lastDate)}` : ''}
                            </div>
                          </>
                        ) : (
                          <span className="text-xs" style={{ color: 'var(--qms-text-soft)' }}>never</span>
                        )}
                      </td>
                      <td style={{ padding: '7px 8px', borderBottom: '1px dashed var(--qms-border)', whiteSpace: 'nowrap' }}>
                        {!inv && <span className="text-xs" style={{ color: 'var(--qms-text-soft)' }}>not invited</span>}
                        {inv && inv.response === null && (
                          <div>
                            <div style={{ fontSize: '9.5px', color: 'var(--qms-text-muted)', fontWeight: 700 }}>RECORD REPLY</div>
                            <div className="flex gap-1 mt-0.5">
                              <button
                                className="rounded-md border font-extrabold"
                                style={{ fontSize: 10, padding: '3px 8px', borderColor: 'rgba(16,185,129,.4)', color: 'var(--success)', background: 'var(--qms-surface)' }}
                                onClick={() => recordResponse(d.id, 'ACCEPTED')}
                              >
                                ✓ Accepted
                              </button>
                              <button
                                className="rounded-md border font-extrabold"
                                style={{ fontSize: 10, padding: '3px 8px', borderColor: 'rgba(244,63,94,.4)', color: 'var(--danger)', background: 'var(--qms-surface)' }}
                                onClick={() => recordResponse(d.id, 'DECLINED')}
                              >
                                ✗ Declined
                              </button>
                            </div>
                          </div>
                        )}
                        {inv?.response === 'ACCEPTED' && (
                          <button
                            className="inline-flex items-center gap-1 rounded-md font-extrabold text-white"
                            style={{ fontSize: 10, padding: '3px 8px', background: 'linear-gradient(135deg,#10b981,#0ea5e9)' }}
                            onClick={() => handleAssign(d.id)}
                          >
                            <FiUserCheck size={11} /> Assign
                          </button>
                        )}
                        {inv?.response === 'DECLINED' && <Tag tone="red">DECLINED</Tag>}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>

          <div
            className="rounded-lg text-[11px] leading-relaxed"
            style={{ marginTop: 9, padding: '8px 11px', background: 'var(--success-soft)', border: '1px dashed rgba(16,185,129,.25)', color: 'var(--success)' }}
          >
            <FiMessageSquare size={12} style={{ verticalAlign: -2, marginRight: 4 }} />
            Selected dietitians get a WhatsApp invite with the camp details. As they reply, hit{' '}
            <b>✓ Accepted / ✗ Declined</b> to record it. Then click <b>Assign</b> on an accepted dietitian to set the rates.
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Close</Button>
          <Button onClick={handleSend}><FiSend size={13} /> Send WhatsApp invites</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export default InviteDietitiansModal
