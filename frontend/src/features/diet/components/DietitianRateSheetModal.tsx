import { useMemo, useState } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { toast } from '@/components/ui/sonner'
import { FiCheck, FiAlertOctagon, FiAlertCircle, FiArrowLeft, FiUserCheck, FiClock } from 'react-icons/fi'
import type { Person } from '@/types/people.types'

interface DietitianRateSheetModalProps {
  open: boolean
  onClose: () => void
  campId: string
  dietitians: Person[]
  requiresBca?: boolean
}

type Step = 'PICK' | 'RATES'

// Ranking signals mirror rankDietitiansForCamp/sortDietitiansForBcaCamp
// (diet-rates-modal.js:71-89) — doctor-preferred pinned above the rest,
// BCA-verified surfaced when the camp requires BCA. Real invite-response
// and doctor-history ranking wiring comes in a later pass; for now this
// picker orders on the two signals we can compute from Person alone.
function rankDietitians(dietitians: Person[], requiresBca: boolean): Person[] {
  return dietitians
    .slice()
    .sort((a, b) => {
      const aPref = a.specialty ? 1 : 0
      const bPref = b.specialty ? 1 : 0
      if (requiresBca) {
        const aBca = (a.machinesAssigned?.length ?? 0) > 0 ? 1 : 0
        const bBca = (b.machinesAssigned?.length ?? 0) > 0 ? 1 : 0
        if (aBca !== bBca) return bBca - aBca
      }
      if (aPref !== bPref) return bPref - aPref
      return (b.feedbackAvg ?? 0) - (a.feedbackAvg ?? 0)
    })
}

// Stub: pre-fill from the dietitian's most-recent rate history. Real
// history lookup (om.getLastDietitianRates / suggestDietitianRates) comes
// in a later wiring pass — for now fall back to the Person master's own
// rate fields, matching the "first assignment" path when absent.
function suggestRates(dietitian: Person | undefined) {
  const hasHistory = !!(dietitian?.ratePerCamp || dietitian?.printingChargePerCamp)
  return {
    hasHistory,
    remuneration: dietitian?.ratePerCamp ?? 0,
    ta: 500,
    printing: dietitian?.printingChargePerCamp ?? 0,
  }
}

// Placeholder rate-history trend rows — real history wiring (per-dietitian
// getDietitianRateHistory) comes in a later pass.
const DEMO_HISTORY = [
  { date: '2026-04-12', remuneration: 3000, ta: 500, printing: 300, total: 3800, reason: 'Standard onboarding rate' },
  { date: '2026-05-20', remuneration: 3000, ta: 500, printing: 300, total: 3800, reason: 'No change · reused previous rates' },
  { date: '2026-06-30', remuneration: 3200, ta: 600, printing: 350, total: 4150, reason: 'Long-distance camp · fuel surcharge' },
]

// Placeholder PO camp cost (project budget per camp) — real project-budget
// wiring (poCampCost, diet-rates-modal.js:170-185) comes in a later pass.
const DEMO_PO_CAMP_COST = 4000

const DietitianRateSheetModal = ({ open, onClose, campId, dietitians, requiresBca = false }: DietitianRateSheetModalProps) => {
  const [step, setStep] = useState<Step>('PICK')
  const [dietitianId, setDietitianId] = useState('')
  const [cameFromPicker, setCameFromPicker] = useState(false)

  const ranked = useMemo(() => rankDietitians(dietitians, requiresBca), [dietitians, requiresBca])
  const dietitian = dietitians.find((d) => d.id === dietitianId)
  const sug = useMemo(() => suggestRates(dietitian), [dietitian])

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
    const d = dietitians.find((p) => p.id === id)
    const s = suggestRates(d)
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

  const changed = !sug.hasHistory || remNum !== sug.remuneration || taNum !== sug.ta || printNum !== sug.printing
  const reasonRequired = changed
  const reasonOk = !reasonRequired || reason.trim().length > 0

  // BCA-verification gate — stubbed as a simple boolean prop; real
  // per-dietitian verification lookup (om.bcaVerified) comes in a later pass.
  const dietitianBcaVerified = !!dietitian?.machinesAssigned?.length
  const bcaBlocked = requiresBca && !!dietitian && !dietitianBcaVerified

  const povar = DEMO_PO_CAMP_COST ? total - DEMO_PO_CAMP_COST : 0
  const overBudget = povar > 0

  const canSave = !!dietitianId && reasonOk && !bcaBlocked

  const handleSave = () => {
    toast.info('UI only — wiring comes next pass')
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
            {ranked.length === 0 ? (
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
                    {ranked.map((d) => {
                      const preferred = !!d.specialty
                      const bcaVerified = (d.machinesAssigned?.length ?? 0) > 0
                      const rating = d.feedbackAvg
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
                                <span className="inline-block text-[9px] font-extrabold px-1.5 py-0.5 rounded-full" style={bcaVerified ? { background: 'var(--success-soft)', color: 'var(--success)' } : { background: 'var(--danger-soft)', color: 'var(--danger)' }}>
                                  {bcaVerified ? 'BCA ✓' : 'no BCA'}
                                </span>
                              </div>
                            )}
                          </td>
                          <td className="px-2.5 py-2 text-center align-top text-[11.5px] font-bold" style={{ color: 'var(--qms-text)' }}>
                            {rating ? `★ ${rating}` : 'no ratings'}
                          </td>
                          <td className="px-2.5 py-2 text-right align-top text-[11.5px] font-bold" style={{ color: 'var(--qms-text)' }}>
                            {d.ratePerCamp ? `₹${d.ratePerCamp.toLocaleString('en-IN')}` : 'first time'}
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
            <div className="rounded-lg px-3 py-2.5 text-[11.5px] leading-relaxed" style={sug.hasHistory ? { background: 'rgba(59,109,255,.06)', border: '1px dashed rgba(59,109,255,.3)', color: '#1d4ed8' } : { background: 'var(--warning-soft)', border: '1px dashed rgba(245,158,11,.35)', color: 'var(--warning)' }}>
              <FiClock className="inline size-3.5 -mt-0.5 mr-1" />
              {sug.hasHistory
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
                  style={sug.hasHistory && remNum !== sug.remuneration ? { borderColor: 'var(--warning)', background: 'var(--warning-soft)' } : undefined}
                />
                <div className="text-[10px] font-semibold mt-1" style={{ color: 'var(--qms-text-muted)' }}>
                  Previous: <span style={{ color: 'var(--qms-brand)', fontWeight: 800 }}>{sug.hasHistory ? `₹${sug.remuneration}` : '— first —'}</span>
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
                  style={sug.hasHistory && taNum !== sug.ta ? { borderColor: 'var(--warning)', background: 'var(--warning-soft)' } : undefined}
                />
                <div className="text-[10px] font-semibold mt-1" style={{ color: 'var(--qms-text-muted)' }}>
                  Previous: <span style={{ color: 'var(--qms-brand)', fontWeight: 800 }}>{sug.hasHistory ? `₹${sug.ta}` : '— first —'}</span>
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
                  style={sug.hasHistory && printNum !== sug.printing ? { borderColor: 'var(--warning)', background: 'var(--warning-soft)' } : undefined}
                />
                <div className="text-[10px] font-semibold mt-1" style={{ color: 'var(--qms-text-muted)' }}>
                  Previous: <span style={{ color: 'var(--qms-brand)', fontWeight: 800 }}>{sug.hasHistory ? `₹${sug.printing}` : '— first —'}</span>
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
                ₹{DEMO_PO_CAMP_COST.toLocaleString('en-IN')}
              </span>
            </div>
            <div className="rounded-lg px-3 py-2 flex items-center justify-between text-[11.5px]" style={{ background: 'var(--qms-surface)' }}>
              <span style={{ color: 'var(--qms-text-muted)' }}>Total payable per camp (Rem + TA + Print):</span>
              <span className="font-extrabold text-[14px]" style={{ color: 'var(--qms-teal)' }}>₹{total.toLocaleString('en-IN')}</span>
            </div>
            {DEMO_PO_CAMP_COST > 0 && (
              <div className="px-1 text-[10.5px] font-bold" style={{ color: overBudget ? 'var(--danger)' : 'var(--success)' }}>
                {overBudget
                  ? `⚠ ₹${povar.toLocaleString('en-IN')} over the PO camp cost (₹${DEMO_PO_CAMP_COST.toLocaleString('en-IN')})`
                  : `✓ ₹${Math.abs(povar).toLocaleString('en-IN')} within the PO camp cost (₹${DEMO_PO_CAMP_COST.toLocaleString('en-IN')})`}
              </div>
            )}

            {changed && (
              <div className="rounded-lg px-3 py-2 flex items-center gap-1.5 text-[11.5px]" style={{ background: 'var(--warning-soft)', border: '1px dashed rgba(245,158,11,.35)', color: 'var(--warning)' }}>
                <FiAlertCircle className="size-3.5" />
                <span>{sug.hasHistory ? 'Values changed from previous · reason mandatory' : 'First-time rates · reason mandatory'}</span>
              </div>
            )}

            {reasonRequired && (
              <div>
                <label className="block text-[10.5px] font-extrabold uppercase tracking-wide mb-1" style={{ color: 'var(--qms-text-muted)' }}>
                  Reason for {sug.hasHistory ? 'change' : 'these baseline rates'} *
                </label>
                <Textarea
                  rows={2}
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder={sug.hasHistory ? 'e.g. Long-distance camp · weather surcharge · printing material cost up' : 'e.g. Standard onboarding rate per dietitian master rate-card'}
                />
              </div>
            )}

            <div className="pt-2" style={{ borderTop: '1px dashed var(--qms-border)' }}>
              <div className="text-[11px] font-extrabold uppercase tracking-wide mb-1.5" style={{ color: 'var(--qms-text-muted)' }}>
                Rate trend · last {DEMO_HISTORY.length} (demo data)
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
                    {DEMO_HISTORY.map((r) => (
                      <tr key={r.date} style={{ borderTop: '1px dashed var(--qms-border)' }}>
                        <td className="px-2 py-1" style={{ color: 'var(--qms-text)' }}>{r.date}</td>
                        <td className="px-2 py-1 text-right font-bold" style={{ color: 'var(--qms-text)' }}>{r.remuneration}</td>
                        <td className="px-2 py-1 text-right font-bold" style={{ color: 'var(--qms-text)' }}>{r.ta}</td>
                        <td className="px-2 py-1 text-right font-bold" style={{ color: 'var(--qms-text)' }}>{r.printing}</td>
                        <td className="px-2 py-1 text-right font-bold" style={{ color: 'var(--qms-text)' }}>{r.total}</td>
                        <td className="px-2 py-1" style={{ color: 'var(--qms-text-muted)' }}>{r.reason}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

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
