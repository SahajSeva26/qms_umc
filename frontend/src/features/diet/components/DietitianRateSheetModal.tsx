import { useMemo, useState } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { toast } from '@/components/ui/sonner'
import { FiCheck, FiAlertOctagon, FiAlertCircle, FiArrowLeft, FiUserCheck, FiClock } from 'react-icons/fi'
import { useAuth } from '@/hooks/useAuth'
import { useCampsData } from '@/hooks/useCampsData'
import {
  suggestDietitianRates, getDietitianRateHistory, poCampCost,
} from '@/features/diet/services/dietitianRates.service'
import { dietitianApproved } from '@/features/diet/services/dietitianRoster.service'
import { useDietitianCandidates } from '@/features/diet/hooks/useDietitianCandidates'
import { useAssignDietitianWithRates } from '@/features/diet/hooks/useDietitianRates'
import { errorMessage } from '@/features/diet/utils/errorMessage'

interface DietitianRateSheetModalProps {
  open: boolean
  onClose: () => void
  campId: string
}

type Step = 'PICK' | 'RATES'

// Assign-a-dietitian-and-set-rates flow launched from the Diet Camps board.
//
// Every figure here comes from the Diet domain services — the same ones the
// sibling approvals/AssignDietitianModal.tsx uses, so both assignment screens
// rank, price and gate identically. This file previously ran on fabricated
// data (a local Person-based ranker, a hardcoded ₹500 TA, a 3-row demo rate
// history, a flat ₹4,000 PO camp cost and a machinesAssigned-based BCA
// guess) and its Save button was a no-op toast; all of that is gone.
const DietitianRateSheetModal = ({ open, onClose, campId }: DietitianRateSheetModalProps) => {
  const { user } = useAuth()
  const { camps } = useCampsData()
  const userName = user ? `${user.firstName} ${user.lastName}`.trim() : 'QMS Ops'
  const assignDietitian = useAssignDietitianWithRates()

  const camp = useMemo(() => camps.find((c) => c.id === campId) ?? null, [camps, campId])

  const [step, setStep] = useState<Step>('PICK')
  const [dietitianId, setDietitianId] = useState('')
  const [cameFromPicker, setCameFromPicker] = useState(false)

  // Whether this camp needs a BCA scale is derived from the camp's own tests,
  // not passed in — the caller never supplied the old `requiresBca` prop, so
  // the BCA gate below was previously unreachable.
  //
  // The shortlist arrives ranked, BCA-tiered and fully annotated (rating, last
  // remuneration, BCA status, doctor preference) from ONE bulk read — the row
  // loop below does no service calls at all.
  const { requiresBca, candidates } = useDietitianCandidates(camp, camps)

  const selected = candidates.find((c) => c.dietitian.id === dietitianId)
  const dietitian = selected?.dietitian
  const sug = useMemo(
    () => (camp && dietitianId ? suggestDietitianRates(dietitianId, camp) : null),
    [camp, dietitianId],
  )

  const [remuneration, setRemuneration] = useState('0')
  const [ta, setTa] = useState('0')
  const [printing, setPrinting] = useState('0')
  const [reason, setReason] = useState('')

  const reset = () => {
    setStep('PICK')
    setDietitianId('')
    setCameFromPicker(false)
    setRemuneration('0')
    setTa('0')
    setPrinting('0')
    setReason('')
  }

  const handleClose = () => {
    reset()
    onClose()
  }

  const handlePick = (id: string) => {
    if (!camp) return
    const s = suggestDietitianRates(id, camp)
    setDietitianId(id)
    setRemuneration(String(s.remuneration))
    setTa(String(s.ta))
    setPrinting(String(s.printing))
    setReason('')
    setCameFromPicker(true)
    setStep('RATES')
  }

  const remNum = Number(remuneration || 0)
  const taNum = Number(ta || 0)
  const printNum = Number(printing || 0)
  const total = remNum + taNum + printNum

  // Target cost stays the computed total in this screen (the field is
  // read-only here and labelled "Computed · Rem + TA + Print"), so it is not
  // part of the changed-vs-suggested comparison.
  const hasHistory = !!sug?.hasHistory
  const changed = !sug || !hasHistory
    || remNum !== (sug?.remuneration ?? 0) || taNum !== (sug?.ta ?? 0) || printNum !== (sug?.printing ?? 0)
  const reasonRequired = changed
  const reasonOk = !reasonRequired || reason.trim().length > 0

  const dietitianBcaVerified = selected?.bca.verified ?? false
  const bcaBlocked = requiresBca && !!dietitian && !dietitianBcaVerified
  const notApproved = !!dietitianId && !dietitianApproved(dietitianId)

  const poCost = camp ? poCampCost(camp) : 0
  const povar = poCost ? total - poCost : 0
  const overBudget = povar > 0

  const rateHistory = dietitianId ? getDietitianRateHistory(dietitianId).slice(0, 5) : []

  const canSave = !!dietitianId && reasonOk && !bcaBlocked && !notApproved && !assignDietitian.isPending

  // Same mutation as approvals/AssignDietitianModal — the camp patch and the
  // rate-history entry are one action, owned by the hook.
  const handleSave = async () => {
    if (!camp || !dietitianId || !dietitian) return
    const rates = {
      remuneration: remNum,
      ta: taNum,
      printing: printNum,
      targetCost: total,
      reason: reason.trim() || (hasHistory ? 'No change · reused previous rates' : 'First assignment'),
    }
    try {
      await assignDietitian.mutateAsync({ camp, dietitianId, by: userName, rates })
    } catch (err) {
      // The hook rejects with DIETITIAN_NOT_APPROVED when the OM·Diet gate
      // blocks the assignment — the same message this screen showed before.
      toast.error(errorMessage(err, 'Could not assign — try again.'))
      return
    }
    toast.success(`Assigned · ${dietitian.name} · Total ₹${total.toLocaleString('en-IN')}`)
    handleClose()
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !o && handleClose()}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>
            {step === 'PICK' ? 'Assign dietitian · select from list' : `Assign · ${dietitian?.name ?? dietitianId}`}
          </DialogTitle>
          <p className="text-[11.5px]" style={{ color: 'var(--qms-text-muted)' }}>Camp {campId}</p>
        </DialogHeader>

        {step === 'PICK' ? (
          <div className="space-y-2">
            <p className="text-[11.5px]" style={{ color: 'var(--qms-text-muted)' }}>
              Doctor-preferred dietitians are highlighted{requiresBca ? ' · BCA-verified dietitians are pinned for this camp' : ''}. Select one to set the rates.
            </p>
            {candidates.length === 0 ? (
              <div className="p-6 text-center text-[13px] rounded-lg" style={{ color: 'var(--qms-text-muted)', background: 'var(--qms-surface)' }}>
                No dietitians available — enrol one in the master first.
              </div>
            ) : (
              <div className="max-h-110 overflow-auto rounded-lg" style={{ border: '1px solid var(--qms-border)' }}>
                <table className="w-full text-[12px] border-collapse">
                  <thead>
                    <tr style={{ background: 'var(--qms-surface)' }}>
                      <th className="text-left px-2.5 py-1.5 text-[9.5px] uppercase tracking-wide" style={{ color: 'var(--qms-text-muted)' }}>Dietitian</th>
                      <th className="text-center px-2.5 py-1.5 text-[9.5px] uppercase tracking-wide" style={{ color: 'var(--qms-text-muted)' }}>Rating</th>
                      <th className="text-right px-2.5 py-1.5 text-[9.5px] uppercase tracking-wide" style={{ color: 'var(--qms-text-muted)' }}>Rate</th>
                      <th className="px-2.5 py-1.5" />
                    </tr>
                  </thead>
                  <tbody>
                    {candidates.map((c) => {
                      const d = c.dietitian
                      const preferred = c.preferred
                      const isBcaVerified = c.bca.verified
                      const rating = c.rating
                      const lastRate = c.lastRates
                      return (
                        <tr key={d.id} style={{ borderTop: '1px dashed var(--qms-border)' }}>
                          <td className="px-2.5 py-2 align-top">
                            <div className="font-extrabold text-[12.5px] flex items-center gap-1 flex-wrap" style={{ color: 'var(--qms-text)' }}>
                              {d.name}
                              {preferred && (
                                <span className="inline-block text-[9px] font-extrabold px-1.5 py-0.5 rounded-full" style={{ background: 'rgba(124,92,255,.16)', color: '#6d28d9' }}>
                                  ★ DOCTOR'S PICK
                                </span>
                              )}
                            </div>
                            <div className="text-[10.5px]" style={{ color: 'var(--qms-text-muted)' }}>
                              {d.hq || '—'}{d.specialty ? ` · ${d.specialty}` : ''}
                            </div>
                            {requiresBca && (
                              <div className="mt-1 flex gap-1 flex-wrap">
                                <span className="inline-block text-[9px] font-extrabold px-1.5 py-0.5 rounded-full" style={isBcaVerified ? { background: 'var(--success-soft)', color: 'var(--success)' } : { background: 'var(--danger-soft)', color: 'var(--danger)' }}>
                                  {isBcaVerified ? 'BCA ✓' : 'no BCA'}
                                </span>
                              </div>
                            )}
                          </td>
                          <td className="px-2.5 py-2 text-center align-top text-[11.5px] font-bold" style={{ color: 'var(--qms-text)' }}>
                            {rating ? `★ ${rating.avg}` : 'no ratings'}
                          </td>
                          <td className="px-2.5 py-2 text-right align-top text-[11.5px] font-bold" style={{ color: 'var(--qms-text)' }}>
                            {lastRate ? `₹${lastRate.remuneration.toLocaleString('en-IN')}` : 'first time'}
                            <div className="text-[9.5px] font-semibold" style={{ color: 'var(--qms-text-muted)' }}>last remuneration</div>
                          </td>
                          <td className="px-2.5 py-2 text-right align-top">
                            <Button size="sm" onClick={() => handlePick(d.id)}>
                              <FiCheck className="size-3" /> Select
                            </Button>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        ) : (
          <div className="space-y-3">
            <div className="rounded-lg px-3 py-2.5 text-[11.5px] leading-relaxed" style={hasHistory ? { background: 'rgba(59,109,255,.06)', border: '1px dashed rgba(59,109,255,.3)', color: '#1d4ed8' } : { background: 'var(--warning-soft)', border: '1px dashed rgba(245,158,11,.35)', color: 'var(--warning)' }}>
              <FiClock className="inline size-3.5 -mt-0.5 mr-1" />
              {hasHistory
                ? <>Loaded from previous assignment for <b>{dietitian?.name}</b>. No change needed? Click <b>Assign</b>. Editing any field will require a reason.</>
                : <>First assignment for <b>{dietitian?.name}</b>. Set the baseline rates · a reason is required for the audit trail.</>}
            </div>

            {requiresBca && !dietitianBcaVerified && dietitian && (
              <div className="rounded-lg px-3 py-2.5 text-[12px] leading-relaxed" style={{ background: 'rgba(249,115,22,.1)', border: '2px solid #f97316', color: '#c2410c' }}>
                <div className="flex items-center gap-1.5 font-extrabold mb-1">
                  <FiAlertOctagon className="size-3.5" />
                  BCA required · dietitian does not have a verified BCA scale
                </div>
                <div>Camp tests include BCA / Body Composition. Assigning <b>{dietitian.name}</b> will mark this camp <b>ORANGE</b>. Kindly align the BCA scale · QMS team verifies on receipt to flip it GREEN.</div>
              </div>
            )}

            <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5">
              <div>
                <label className="block text-[10.5px] font-extrabold uppercase tracking-wide mb-1" style={{ color: 'var(--qms-text-muted)' }}>Remuneration (₹) *</label>
                <Input
                  type="number"
                  min={0}
                  value={remuneration}
                  onChange={(e) => setRemuneration(e.target.value)}
                  className="font-bold"
                  style={hasHistory && remNum !== (sug?.remuneration ?? 0) ? { borderColor: 'var(--warning)', background: 'var(--warning-soft)' } : undefined}
                />
                <div className="text-[10px] font-semibold mt-1" style={{ color: 'var(--qms-text-muted)' }}>
                  Previous: <span style={{ color: 'var(--qms-brand)', fontWeight: 800 }}>{hasHistory ? `₹${(sug?.remuneration ?? 0)}` : '— first —'}</span>
                </div>
              </div>
              <div>
                <label className="block text-[10.5px] font-extrabold uppercase tracking-wide mb-1" style={{ color: 'var(--qms-text-muted)' }}>TA / Travel (₹) *</label>
                <Input
                  type="number"
                  min={0}
                  value={ta}
                  onChange={(e) => setTa(e.target.value)}
                  className="font-bold"
                  style={hasHistory && taNum !== (sug?.ta ?? 0) ? { borderColor: 'var(--warning)', background: 'var(--warning-soft)' } : undefined}
                />
                <div className="text-[10px] font-semibold mt-1" style={{ color: 'var(--qms-text-muted)' }}>
                  Previous: <span style={{ color: 'var(--qms-brand)', fontWeight: 800 }}>{hasHistory ? `₹${(sug?.ta ?? 0)}` : '— first —'}</span>
                </div>
              </div>
              <div>
                <label className="block text-[10.5px] font-extrabold uppercase tracking-wide mb-1" style={{ color: 'var(--qms-text-muted)' }}>Printing (₹) *</label>
                <Input
                  type="number"
                  min={0}
                  value={printing}
                  onChange={(e) => setPrinting(e.target.value)}
                  className="font-bold"
                  style={hasHistory && printNum !== (sug?.printing ?? 0) ? { borderColor: 'var(--warning)', background: 'var(--warning-soft)' } : undefined}
                />
                <div className="text-[10px] font-semibold mt-1" style={{ color: 'var(--qms-text-muted)' }}>
                  Previous: <span style={{ color: 'var(--qms-brand)', fontWeight: 800 }}>{hasHistory ? `₹${(sug?.printing ?? 0)}` : '— first —'}</span>
                </div>
              </div>
              <div>
                <label className="block text-[10.5px] font-extrabold uppercase tracking-wide mb-1" style={{ color: 'var(--qms-text-muted)' }}>Target cost (₹)</label>
                <Input type="number" value={total} readOnly disabled className="font-bold" />
                <div className="text-[10px] font-semibold mt-1" style={{ color: 'var(--qms-text-muted)' }}>Computed · Rem + TA + Print</div>
              </div>
            </div>

            <div className="rounded-lg px-3 py-2 flex items-center justify-between text-[11.5px]" style={{ background: 'rgba(59,109,255,.07)' }}>
              <span style={{ color: 'var(--qms-text-muted)' }}>PO camp cost (project budget per camp):</span>
              <span className="font-extrabold text-[13px]" style={{ color: 'var(--qms-brand)' }}>
                {/* Stub — real project-budget wiring comes in a later pass. */}
                ₹{poCost.toLocaleString('en-IN')}
              </span>
            </div>
            <div className="rounded-lg px-3 py-2 flex items-center justify-between text-[11.5px]" style={{ background: 'var(--qms-surface)' }}>
              <span style={{ color: 'var(--qms-text-muted)' }}>Total payable per camp (Rem + TA + Print):</span>
              <span className="font-extrabold text-[14px]" style={{ color: 'var(--qms-teal)' }}>₹{total.toLocaleString('en-IN')}</span>
            </div>
            {poCost > 0 && (
              <div className="px-1 text-[10.5px] font-bold" style={{ color: overBudget ? 'var(--danger)' : 'var(--success)' }}>
                {overBudget
                  ? `⚠ ₹${povar.toLocaleString('en-IN')} over the PO camp cost (₹${poCost.toLocaleString('en-IN')})`
                  : `✓ ₹${Math.abs(povar).toLocaleString('en-IN')} within the PO camp cost (₹${poCost.toLocaleString('en-IN')})`}
              </div>
            )}

            {changed && (
              <div className="rounded-lg px-3 py-2 flex items-center gap-1.5 text-[11.5px]" style={{ background: 'var(--warning-soft)', border: '1px dashed rgba(245,158,11,.35)', color: 'var(--warning)' }}>
                <FiAlertCircle className="size-3.5" />
                <span>{hasHistory ? 'Values changed from previous · reason mandatory' : 'First-time rates · reason mandatory'}</span>
              </div>
            )}

            {reasonRequired && (
              <div>
                <label className="block text-[10.5px] font-extrabold uppercase tracking-wide mb-1" style={{ color: 'var(--qms-text-muted)' }}>
                  Reason for {hasHistory ? 'change' : 'these baseline rates'} *
                </label>
                <Textarea
                  rows={2}
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder={hasHistory ? 'e.g. Long-distance camp · weather surcharge · printing material cost up' : 'e.g. Standard onboarding rate per dietitian master rate-card'}
                />
              </div>
            )}

            {rateHistory.length > 0 && (
              <div className="pt-2" style={{ borderTop: '1px dashed var(--qms-border)' }}>
                <div className="text-[11px] font-extrabold uppercase tracking-wide mb-1.5" style={{ color: 'var(--qms-text-muted)' }}>
                  Rate trend · last {rateHistory.length}
                </div>
                <div className="overflow-auto rounded-lg" style={{ border: '1px solid var(--qms-border)' }}>
                  <table className="w-full text-[11.5px] border-collapse">
                    <thead>
                      <tr style={{ background: 'var(--qms-surface)' }}>
                        <th className="text-left px-2 py-1 text-[9.5px] uppercase" style={{ color: 'var(--qms-text-muted)' }}>Date</th>
                        <th className="text-right px-2 py-1 text-[9.5px] uppercase" style={{ color: 'var(--qms-text-muted)' }}>Rem ₹</th>
                        <th className="text-right px-2 py-1 text-[9.5px] uppercase" style={{ color: 'var(--qms-text-muted)' }}>TA ₹</th>
                        <th className="text-right px-2 py-1 text-[9.5px] uppercase" style={{ color: 'var(--qms-text-muted)' }}>Print ₹</th>
                        <th className="text-right px-2 py-1 text-[9.5px] uppercase" style={{ color: 'var(--qms-text-muted)' }}>Total ₹</th>
                        <th className="text-left px-2 py-1 text-[9.5px] uppercase" style={{ color: 'var(--qms-text-muted)' }}>Reason</th>
                      </tr>
                    </thead>
                    <tbody>
                      {/* DietitianRateEntry carries no `total` — the column is
                          the same Rem + TA + Print sum shown above. */}
                      {rateHistory.map((r, i) => (
                        <tr key={`${r.setAt}-${i}`} style={{ borderTop: '1px dashed var(--qms-border)' }}>
                          <td className="px-2 py-1" style={{ color: 'var(--qms-text)' }}>{(r.setAt || '').slice(0, 10)}</td>
                          <td className="px-2 py-1 text-right font-bold" style={{ color: 'var(--qms-text)' }}>{r.remuneration}</td>
                          <td className="px-2 py-1 text-right font-bold" style={{ color: 'var(--qms-text)' }}>{r.ta}</td>
                          <td className="px-2 py-1 text-right font-bold" style={{ color: 'var(--qms-text)' }}>{r.printing}</td>
                          <td className="px-2 py-1 text-right font-bold" style={{ color: 'var(--qms-text)' }}>{r.remuneration + r.ta + r.printing}</td>
                          <td className="px-2 py-1" style={{ color: 'var(--qms-text-muted)' }}>{r.reason}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            <div className="rounded-lg px-3 py-2 text-[11px] leading-relaxed" style={{ background: 'var(--qms-surface)', color: 'var(--qms-text-muted)' }}>
              This assignment will be sent to the Ops Manager for rate approval before finalizing.
            </div>
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={handleClose}>Cancel</Button>
          {step === 'RATES' && cameFromPicker && (
            <Button variant="outline" onClick={() => setStep('PICK')}>
              <FiArrowLeft className="size-3.5" /> Back to list
            </Button>
          )}
          {step === 'RATES' && (
            <Button onClick={handleSave} disabled={!canSave}>
              <FiUserCheck className="size-3.5" /> Assign &amp; record rates
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export default DietitianRateSheetModal
