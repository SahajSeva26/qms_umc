import { useEffect, useMemo, useState } from 'react'
import { FiUserCheck } from 'react-icons/fi'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { toast } from '@/components/ui/sonner'
import { applyInviteTierOrder, invitesByDietitianId } from '@/features/diet/services/dietitianCandidates.service'
import { suggestDietitianRates, poCampCost, getDietitianRateHistory } from '@/features/diet/services/dietitianRates.service'
import { dietitianApproved } from '@/features/diet/services/dietitianRoster.service'
import { clientName } from '@/features/diet/services/dietScope.service'
import { errorMessage } from '@/features/diet/utils/errorMessage'
import { useCampsShared } from '@/features/camps/hooks/useCampsShared'
import { useCampInvites } from '@/features/diet/hooks/useDietitianInvites'
import { useDietitianCandidates } from '@/features/diet/hooks/useDietitianCandidates'
import { useAssignDietitianWithRates } from '@/features/diet/hooks/useDietitianRates'
import { fmtDate, fmtDateYear, fmtDt } from './helpers'

interface AssignDietitianModalProps {
  open: boolean
  onClose: () => void
  campId: string | null
  preSelectedDietitianId?: string | null
  onDone?: () => void
  userName: string
}

const AssignDietitianModal = ({ open, onClose, campId, preSelectedDietitianId, onDone, userName }: AssignDietitianModalProps) => {
  const { camps } = useCampsShared()
  const camp = useMemo(() => camps.find((c) => c.id === campId) || null, [camps, campId])
  const assignDietitian = useAssignDietitianWithRates()

  const [step, setStep] = useState<'pick' | 'rates'>('pick')
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [rem, setRem] = useState('')
  const [ta, setTa] = useState('')
  const [printing, setPrinting] = useState('')
  const [targetCost, setTargetCost] = useState('')
  const [reason, setReason] = useState('')
  const [error, setError] = useState('')

  useEffect(() => {
    if (!open) return
    setError('')
    setReason('')
    if (preSelectedDietitianId) {
      setSelectedId(preSelectedDietitianId)
      setStep('rates')
    } else {
      setSelectedId(null)
      setStep('pick')
    }
  }, [open, preSelectedDietitianId, campId])

  // One bulk read for the whole shortlist (ranking, BCA tier, rating, last
  // remuneration, doctor history/preference) — no per-row service calls below.
  const { requiresBca, candidates } = useDietitianCandidates(camp, camps)

  // Invites now come from the cached `dietKeys.invites` query, the same source
  // the invite modal writes through, instead of a second synchronous store read.
  const { data: invites = [] } = useCampInvites(campId)
  const inviteById = useMemo(() => invitesByDietitianId(invites), [invites])
  const hasInvites = invites.length > 0

  // Invite-accepted → doctor-preferred → rest → declined (spec §3a step 3).
  const ordered = useMemo(() => applyInviteTierOrder(candidates, invites), [candidates, invites])
  const hasPreferred = candidates.some((c) => c.preferred)

  const selected = selectedId ? ordered.find((c) => c.dietitian.id === selectedId) : undefined
  const selectedDietitian = selected?.dietitian
  const sug = useMemo(() => (camp && selectedId ? suggestDietitianRates(selectedId, camp) : null), [camp, selectedId])

  useEffect(() => {
    if (!open || !sug) return
    setRem(String(sug.remuneration))
    setTa(String(sug.ta))
    setPrinting(String(sug.printing))
    setTargetCost(String(sug.targetCost))
  }, [open, sug, selectedId])

  if (!camp) return null

  const campSubtitle = (withYear: boolean) =>
    `Camp ${camp.id} · ${camp.city} · ${withYear ? fmtDateYear(camp.date) : fmtDate(camp.date)}`

  const selectDietitian = (id: string) => {
    setSelectedId(id)
    setStep('rates')
  }

  const poCost = poCampCost(camp)
  const total = (Number(rem) || 0) + (Number(ta) || 0) + (Number(printing) || 0)
  const changed = !!sug && (!sug.hasHistory
    || Number(rem) !== sug.remuneration || Number(ta) !== sug.ta
    || Number(printing) !== sug.printing || Number(targetCost) !== sug.targetCost)

  // ONE read of the selected dietitian's history serves both the "loaded from
  // previous assignment" banner and the rate-trend table (the banner used to
  // call getLastDietitianRates four times in a single JSX block, each a full
  // store parse).
  const fullRateHistory = selectedId ? getDietitianRateHistory(selectedId) : []
  const lastRates = fullRateHistory[0] ?? null
  const rateHistory = fullRateHistory.slice(0, 5)

  const handleSubmit = async () => {
    if (!selectedId || !selectedDietitian) return
    setError('')
    const remN = Number(rem)
    const taN = Number(ta)
    const printN = Number(printing)
    const targetN = Number(targetCost)
    if (!isFinite(remN) || remN < 0) { setError('Remuneration is required'); return }
    if (!isFinite(taN) || taN < 0) { setError('TA is required'); return }
    if (!isFinite(printN) || printN < 0) { setError('Printing charge is required'); return }
    if (!isFinite(targetN) || targetN < 0) { setError('Target cost is required'); return }
    if (changed && !reason.trim()) { setError('Reason is required when values change'); return }
    if (!dietitianApproved(selectedId)) { setError('Dietitian pending OM·Diet approval — cannot assign'); return }

    const rates = {
      remuneration: remN, ta: taN, printing: printN, targetCost: targetN,
      reason: reason.trim() || (sug?.hasHistory ? 'No change · reused previous rates' : 'First assignment'),
    }
    try {
      await assignDietitian.mutateAsync({ camp, dietitianId: selectedId, by: userName, rates })
    } catch (err) {
      setError(errorMessage(err, 'Could not assign — try again.'))
      return
    }
    toast.success(`Assigned · ${selectedDietitian.name} · Total ₹${total.toLocaleString('en-IN')}`)
    onClose()
    onDone?.()
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-3xl max-h-[85vh] overflow-y-auto">
        {step === 'pick' && (
          <>
            <DialogHeader>
              <DialogTitle>Assign dietitian · select from list</DialogTitle>
              <p className="text-[12px]" style={{ color: 'var(--qms-text-muted)' }}>{campSubtitle(false)}</p>
            </DialogHeader>
            {ordered.length === 0 ? (
              <p className="text-[12.5px] py-6 text-center" style={{ color: 'var(--qms-text-muted)' }}>No dietitians available — enrol one in the master first.</p>
            ) : (
              <>
                <p className="text-[11.5px] mb-2" style={{ color: 'var(--qms-text-muted)' }}>
                  {hasInvites
                    ? 'Dietitians who accepted your WhatsApp invite are shown first, followed by doctor-preferred picks.'
                    : hasPreferred
                      ? 'This doctor has preferred dietitians from prior camps — shown first below.'
                      : 'Ranked by same-city match first, then positive last-camp feedback.'}
                </p>
                <div className="overflow-x-auto">
                  <table className="w-full text-[12.5px]" style={{ color: 'var(--qms-text)' }}>
                    <thead>
                      <tr>
                        <th className="text-left py-1.5 px-2 text-[11px] font-semibold uppercase" style={{ color: 'var(--qms-text-muted)' }}>Dietitian</th>
                        <th className="text-left py-1.5 px-2 text-[11px] font-semibold uppercase" style={{ color: 'var(--qms-text-muted)' }}>Rating</th>
                        <th className="text-left py-1.5 px-2 text-[11px] font-semibold uppercase" style={{ color: 'var(--qms-text-muted)' }}>Rate</th>
                        <th className="py-1.5 px-2" />
                      </tr>
                    </thead>
                    <tbody>
                      {ordered.map((c) => {
                        const d = c.dietitian
                        const invite = inviteById.get(d.id)
                        const isPreferred = c.preferred
                        const hist = c.doctorHistory
                        const avg = c.rating
                        const lastRate = c.lastRates
                        return (
                          <tr key={d.id} className="border-t align-top" style={{ borderColor: 'var(--qms-border)' }}>
                            <td className="py-2 px-2">
                              <div className="flex flex-wrap items-center gap-1.5">
                                <b>{d.name}</b>
                                {isPreferred && <Badge color="#6d28d9" bg="rgba(124,92,255,.16)">★ DOCTOR'S PICK</Badge>}
                                {invite?.response === 'ACCEPTED' && <Badge color="#047857" bg="rgba(16,185,129,.16)">✓ ACCEPTED INVITE</Badge>}
                                {invite?.response === 'DECLINED' && <Badge color="#b91c1c" bg="rgba(244,63,94,.16)">declined invite</Badge>}
                                {invite && invite.response === null && <Badge color="#1d4ed8" bg="rgba(59,109,255,.14)">invite pending</Badge>}
                                {requiresBca && (
                                  c.bca.verified
                                    ? <Badge color="#047857" bg="rgba(16,185,129,.16)">BCA verified</Badge>
                                    : <Badge color="#c2410c" bg="rgba(249,115,22,.08)">no BCA</Badge>
                                )}
                              </div>
                              <div className="text-[11px] mt-0.5" style={{ color: 'var(--qms-text-muted)' }}>
                                {d.hq || '—'}{d.specialty ? ` · ${d.specialty}` : ''}
                                {hist.count > 0 && ` · ${hist.count} camp(s) with this doctor`}
                              </div>
                            </td>
                            <td className="py-2 px-2">{avg ? `★ ${avg.avg} (${avg.count})` : <span style={{ color: 'var(--qms-text-muted)' }}>no ratings</span>}</td>
                            <td className="py-2 px-2">
                              {lastRate ? <b>₹{lastRate.remuneration.toLocaleString('en-IN')}</b> : <span style={{ color: 'var(--qms-text-muted)' }}>first time</span>}
                              <div className="text-[10.5px]" style={{ color: 'var(--qms-text-muted)' }}>last remuneration</div>
                            </td>
                            <td className="py-2 px-2 text-right">
                              <Button size="sm" onClick={() => selectDietitian(d.id)}>Select</Button>
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              </>
            )}
            <DialogFooter>
              <Button variant="outline" onClick={onClose}>Cancel</Button>
            </DialogFooter>
          </>
        )}

        {step === 'rates' && selectedDietitian && sug && (
          <>
            <DialogHeader>
              <DialogTitle>Assign · {selectedDietitian.name}</DialogTitle>
              <p className="text-[12px]" style={{ color: 'var(--qms-text-muted)' }}>{campSubtitle(false)} · {clientName(camp.clientId)}</p>
            </DialogHeader>

            {sug.hasHistory ? (
              <div className="rounded-lg px-3 py-2 text-[12px] mb-2" style={{ background: 'rgba(59,109,255,.06)', color: 'var(--qms-text)' }}>
                Loaded from previous assignment for {selectedDietitian.name} · set {fmtDate(lastRates?.setAt)} by {lastRates?.setBy || 'Coord'}
                {lastRates?.reason ? ` · reason: ${lastRates.reason}` : ''}.
                <br />No change needed? Click Assign. Editing any field will require a reason.
              </div>
            ) : (
              <div className="rounded-lg px-3 py-2 text-[12px] mb-2" style={{ background: 'rgba(245,158,11,.12)', color: 'var(--qms-text)' }}>
                First assignment for {selectedDietitian.name}. Set the baseline rates · a reason is required for the audit trail.
              </div>
            )}

            {requiresBca && !selected?.bca.verified && (
              <div className="rounded-lg px-3 py-2 text-[12px] mb-2" style={{ border: '2px solid #f97316', background: 'rgba(249,115,22,.08)' }}>
                <b style={{ color: '#c2410c' }}>BCA required · dietitian does not have a verified BCA scale</b>
                <div style={{ color: 'var(--qms-text)' }}>
                  Camp tests include BCA / Body Composition. Assigning {selectedDietitian.name} will mark this camp ORANGE. Kindly align the BCA scale · QMS team verifies on receipt to flip it GREEN.
                </div>
              </div>
            )}

            {!dietitianApproved(selectedId!) && (
              <div className="rounded-lg px-3 py-2 text-[12px] mb-2" style={{ border: '2px solid #b91c1c', background: 'rgba(244,63,94,.08)', color: '#b91c1c' }}>
                <b>{selectedDietitian.name} is pending OM·Diet approval</b> — onboarding interview not yet cleared. This dietitian cannot be assigned to a camp until OM·Diet approves.
              </div>
            )}

            <div className="grid grid-cols-2 gap-3 text-[13px] mb-2">
              <Field label="Remuneration ₹" value={rem} onChange={setRem} highlight={!!sug && Number(rem) !== sug.remuneration} />
              <Field label="TA / Travel ₹" value={ta} onChange={setTa} highlight={!!sug && Number(ta) !== sug.ta} />
              <Field label="Printing ₹" value={printing} onChange={setPrinting} highlight={!!sug && Number(printing) !== sug.printing} />
              <Field label="Target cost ₹" value={targetCost} onChange={setTargetCost} highlight={!!sug && Number(targetCost) !== sug.targetCost} />
            </div>

            <div className="rounded-lg px-3 py-2 text-[12px] mb-2" style={{ background: 'var(--qms-surface-strong)' }}>
              <div>PO camp cost: {poCost > 0 ? <b>₹{poCost.toLocaleString('en-IN')}</b> : <span style={{ color: 'var(--qms-text-muted)' }}>— no PO budget on file —</span>}</div>
              <div className="mt-1">Total (Rem + TA + Printing): <b>₹{total.toLocaleString('en-IN')}</b></div>
              {poCost > 0 && (
                total > poCost
                  ? <div style={{ color: '#b91c1c' }}>⚠ ₹{(total - poCost).toLocaleString('en-IN')} over the PO camp cost (₹{poCost.toLocaleString('en-IN')})</div>
                  : <div style={{ color: '#047857' }}>✓ ₹{(poCost - total).toLocaleString('en-IN')} within the PO camp cost (₹{poCost.toLocaleString('en-IN')})</div>
              )}
            </div>

            {changed && (
              <div className="mb-2">
                <label className="block text-[11px] font-semibold mb-1" style={{ color: 'var(--qms-text-muted)' }}>Reason for change *</label>
                <Textarea value={reason} onChange={(e) => setReason(e.target.value)} rows={2} placeholder="Why are the rates different from the suggested defaults?" />
              </div>
            )}

            {rateHistory.length > 0 && (
              <div className="mb-2 overflow-x-auto">
                <div className="text-[11px] font-semibold mb-1" style={{ color: 'var(--qms-text-muted)' }}>Rate trend (last {rateHistory.length})</div>
                <table className="w-full text-[11.5px]">
                  <thead>
                    <tr>
                      <Th>When</Th><Th>By</Th><Th align="right">Rem ₹</Th><Th align="right">TA ₹</Th><Th align="right">Print ₹</Th><Th>Reason</Th>
                    </tr>
                  </thead>
                  <tbody>
                    {rateHistory.map((h, i) => (
                      <tr key={i} className="border-t" style={{ borderColor: 'var(--qms-border)' }}>
                        <Td>{fmtDt(h.setAt)}</Td>
                        <Td>{h.setBy}</Td>
                        <Td align="right">{h.remuneration}</Td>
                        <Td align="right">{h.ta}</Td>
                        <Td align="right">{h.printing}</Td>
                        <Td>{h.reason}</Td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {error && <p className="text-[12px] mb-2" style={{ color: 'var(--danger)' }}>{error}</p>}

            <DialogFooter>
              <Button variant="outline" onClick={onClose}>Cancel</Button>
              {!preSelectedDietitianId && <Button variant="outline" onClick={() => setStep('pick')}>Back to list</Button>}
              <Button onClick={handleSubmit} disabled={assignDietitian.isPending}><FiUserCheck size={13} /> Assign & record rates</Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  )
}

function Badge({ children, color, bg }: { children: React.ReactNode; color: string; bg: string }) {
  return <span className="text-[10px] font-bold px-2 py-0.5 rounded-full" style={{ color, background: bg }}>{children}</span>
}

function Field({ label, value, onChange, highlight }: { label: string; value: string; onChange: (v: string) => void; highlight?: boolean }) {
  return (
    <div>
      <label className="block text-[11px] font-semibold mb-1" style={{ color: 'var(--qms-text-muted)' }}>{label}</label>
      <Input
        type="number" min={0} value={value} onChange={(e) => onChange(e.target.value)}
        style={highlight ? { borderColor: '#f59e0b', background: 'rgba(245,158,11,.08)' } : undefined}
      />
    </div>
  )
}

function Th({ children, align }: { children: React.ReactNode; align?: 'right' }) {
  return <th className={`py-1 px-1.5 font-semibold ${align === 'right' ? 'text-right' : 'text-left'}`} style={{ color: 'var(--qms-text-muted)' }}>{children}</th>
}
function Td({ children, align }: { children: React.ReactNode; align?: 'right' }) {
  return <td className={`py-1 px-1.5 ${align === 'right' ? 'text-right' : 'text-left'}`}>{children}</td>
}

export default AssignDietitianModal
