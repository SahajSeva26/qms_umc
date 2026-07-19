import { useMemo, useState } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { FiSend, FiCheckCircle, FiXCircle, FiClock, FiUserCheck, FiMessageSquare } from 'react-icons/fi'
import { toast } from '@/components/ui/sonner'
import type { Person } from '@/types/people.types'

interface InviteDietitiansModalProps {
  open: boolean
  onClose: () => void
  campId: string
  dietitians: Person[]
  onProceedToRateSheet?: (dietitianId: string) => void
}

type InviteResponse = 'PENDING' | 'ACCEPTED' | 'DECLINED'

interface InviteEntry {
  dietitianId: string
  sentAt: string
  response: InviteResponse
}

// Deterministic pseudo-random derivation from a string id — stands in for
// the real ranking/rating/history data (om.rankDietitiansForCamp,
// om.getLastDietitianRates, om.dietitianAverageRating, om.dietitianDoctorHistory,
// om.bcaVerified, om.doctorPreferredDietitians — diet-invite-modal.js:49-70)
// until the data-wiring pass connects these to real stores.
function seedOf(id: string): number {
  let h = 0
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) >>> 0
  return h
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
// doctor-preferred mark, BCA scale status) → SEND (simulated WhatsApp
// invite, multi-select) → RECORD (Accepted/Declined per dietitian) →
// ASSIGN (accepted dietitian → rate sheet). Data wiring (om.* helpers,
// real invite persistence) is a later pass — this UI shell derives
// display-only ranking/rating/history/BCA data locally and keeps invite
// state in component state only.
const InviteDietitiansModal = ({ open, onClose, campId, dietitians, onProceedToRateSheet }: InviteDietitiansModalProps) => {
  const requiresBca = useMemo(() => seedOf(campId) % 3 === 0, [campId])

  const ranked = useMemo(() => {
    const withSeed = dietitians.map((d) => {
      const seed = seedOf(d.id)
      const lastRem = 1500 + (seed % 12) * 250
      const ratingAvg = 3 + ((seed >> 3) % 21) / 10
      const ratingCount = 1 + (seed % 9)
      const docHistCount = seed % 5 === 0 ? (seed % 4) + 1 : 0
      const docHistLast = new Date(Date.now() - ((seed % 60) + 5) * 86400000).toISOString()
      const hasBca = seed % 2 === 0
      const bcaVerified = hasBca && seed % 4 === 0
      const score = -((seed % 100)) + (docHistCount > 0 ? -30 : 0)
      return { dietitian: d, seed, lastRem, ratingAvg, ratingCount, docHistCount, docHistLast, hasBca, bcaVerified, score }
    })
    withSeed.sort((a, b) => a.score - b.score)
    if (requiresBca) {
      withSeed.sort((a, b) => {
        const aTier = a.bcaVerified ? 0 : a.hasBca ? 1 : 2
        const bTier = b.bcaVerified ? 0 : b.hasBca ? 1 : 2
        return aTier - bTier
      })
    }
    return withSeed
  }, [dietitians, requiresBca])

  const preferredId = useMemo(() => {
    if (!ranked.length) return undefined
    const withHistory = ranked.filter((r) => r.docHistCount > 0)
    return withHistory.length ? withHistory[0].dietitian.id : undefined
  }, [ranked])

  const [selected, setSelected] = useState<Set<string>>(
    () => new Set(ranked.slice(0, 3).map((r) => r.dietitian.id))
  )
  const [invites, setInvites] = useState<Record<string, InviteEntry>>({})

  const invMap = invites
  const summary = useMemo(() => {
    const list = Object.values(invMap)
    return {
      total: list.length,
      accepted: list.filter((e) => e.response === 'ACCEPTED').length,
      declined: list.filter((e) => e.response === 'DECLINED').length,
      pending: list.filter((e) => e.response === 'PENDING').length,
    }
  }, [invMap])

  const pickable = ranked.filter((r) => !invMap[r.dietitian.id])
  const allPickableChecked = pickable.length > 0 && pickable.every((r) => selected.has(r.dietitian.id))

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
      pickable.forEach((r) => {
        if (checked) next.add(r.dietitian.id)
        else next.delete(r.dietitian.id)
      })
      return next
    })
  }

  const handleSend = () => {
    const picked = pickable.filter((r) => selected.has(r.dietitian.id)).map((r) => r.dietitian.id)
    if (!picked.length) {
      toast.error('Tick at least one dietitian to invite')
      return
    }
    const now = new Date().toISOString()
    setInvites((prev) => {
      const next = { ...prev }
      picked.forEach((id) => {
        next[id] = { dietitianId: id, sentAt: now, response: 'PENDING' }
      })
      return next
    })
    toast.success(`WhatsApp invites sent · ${picked.length} dietitian${picked.length === 1 ? '' : 's'}`)
  }

  const recordResponse = (dietitianId: string, response: 'ACCEPTED' | 'DECLINED') => {
    setInvites((prev) => ({
      ...prev,
      [dietitianId]: { ...prev[dietitianId], dietitianId, response },
    }))
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
                {!ranked.length && (
                  <tr>
                    <td colSpan={7} style={{ padding: 20, textAlign: 'center', color: 'var(--qms-text-soft)' }}>
                      No dietitians available — enrol one first.
                    </td>
                  </tr>
                )}
                {ranked.map((r) => {
                  const d = r.dietitian
                  const inv = invMap[d.id]
                  const preferred = preferredId === d.id
                  const lastRemStr = `₹${r.lastRem.toLocaleString('en-IN')}`
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
                        {inv?.response === 'PENDING' && <FiClock size={15} style={{ color: 'var(--warning)' }} />}
                      </td>
                      <td style={{ padding: '7px 8px', borderBottom: '1px dashed var(--qms-border)' }}>
                        <div className="font-extrabold" style={{ fontSize: '12.5px', color: 'var(--qms-text)' }}>
                          {d.name}
                          {preferred && <Tag tone="violet">⭐ DOCTOR&apos;S PICK</Tag>}
                          {inv?.response === 'ACCEPTED' && <Tag tone="green">ACCEPTED</Tag>}
                          {inv?.response === 'DECLINED' && <Tag tone="red">DECLINED</Tag>}
                          {inv?.response === 'PENDING' && <Tag tone="blue">AWAITING REPLY</Tag>}
                        </div>
                        <div style={{ fontSize: '10.5px', color: 'var(--qms-text-muted)' }}>
                          {d.hq || d.city || '—'}{d.specialty ? ` · ${d.specialty}` : ''}
                        </div>
                      </td>
                      <td className="text-right font-bold" style={{ padding: '7px 8px', borderBottom: '1px dashed var(--qms-border)', color: 'var(--qms-text)' }}>
                        {lastRemStr}
                      </td>
                      <td className="text-center" style={{ padding: '7px 8px', borderBottom: '1px dashed var(--qms-border)' }}>
                        <b style={{ color: 'var(--qms-text)' }}>{r.ratingAvg.toFixed(1)}</b>
                        <span style={{ color: 'var(--warning)' }}> ★</span>
                        <div style={{ fontSize: 9, color: 'var(--qms-text-muted)' }}>{r.ratingCount} rating{r.ratingCount === 1 ? '' : 's'}</div>
                      </td>
                      <td className="text-center" style={{ padding: '7px 8px', borderBottom: '1px dashed var(--qms-border)' }}>
                        {r.bcaVerified ? (
                          <Tag tone="green">✓ BCA</Tag>
                        ) : r.hasBca ? (
                          <Tag tone="amber">BCA · unverified</Tag>
                        ) : (
                          <Tag tone="red">no BCA</Tag>
                        )}
                      </td>
                      <td className="text-center" style={{ padding: '7px 8px', borderBottom: '1px dashed var(--qms-border)' }}>
                        {r.docHistCount > 0 ? (
                          <>
                            <b style={{ color: 'var(--qms-text)' }}>{r.docHistCount}</b>
                            <div style={{ fontSize: 9, color: 'var(--qms-text-muted)' }}>
                              camp{r.docHistCount === 1 ? '' : 's'} · last {fmtDate(r.docHistLast)}
                            </div>
                          </>
                        ) : (
                          <span className="text-xs" style={{ color: 'var(--qms-text-soft)' }}>never</span>
                        )}
                      </td>
                      <td style={{ padding: '7px 8px', borderBottom: '1px dashed var(--qms-border)', whiteSpace: 'nowrap' }}>
                        {!inv && <span className="text-xs" style={{ color: 'var(--qms-text-soft)' }}>not invited</span>}
                        {inv?.response === 'PENDING' && (
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
