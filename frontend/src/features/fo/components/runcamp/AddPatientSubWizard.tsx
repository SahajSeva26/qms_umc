import { useState } from 'react'
import { FiChevronLeft, FiChevronRight, FiCheck, FiSend, FiAlertTriangle } from 'react-icons/fi'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select'
import { toast } from '@/components/ui/sonner'
import type { PatientFieldDef, FoTestDef } from '@/features/fo/foConfig.types'
import { DEFAULT_PATIENT_FIELDS } from '@/features/fo/foConfig.types'
import { interpret, getTest } from '@/features/fo/foConfig.service'
import type { RunCampScreeningResult } from '@/types/camp.types'

const FALLBACK_TESTS = ['BP_SYS', 'BP_DIA', 'RBS', 'WT', 'HT', 'BMI']

const DPDP_BULLETS = [
  'We collect your health data (age, gender, vitals, test results) solely to conduct this screening camp and share findings with you and the referring doctor.',
  'Your data is stored securely and is not sold or shared with third parties for marketing purposes, per the Digital Personal Data Protection (DPDP) Act, 2023.',
  'You may request access to, correction of, or withdrawal of consent for your data at any time by contacting the camp organiser or the number on your report.',
  'Anonymised, aggregated data may be used for public-health research and quality reporting unless you opt out below.',
]

type ConsentMethod = 'otp' | 'signature' | 'upload' | null

interface RegForm {
  [fieldId: string]: string
}

interface AddPatientSubWizardProps {
  open: boolean
  patientFields: PatientFieldDef[] | undefined
  testIds: string[] | undefined
  patientNumber: number
  onSave: (result: RunCampScreeningResult) => void
  onClose: () => void
}

function genUhid(): string {
  return 'UHID-' + String(Math.floor(100000 + Math.random() * 900000))
}

function widthClass(width: PatientFieldDef['width']): string {
  if (width === '1-4') return 'col-span-1'
  if (width === '1-1') return 'col-span-2'
  return 'col-span-1'
}

const AddPatientSubWizard = ({ open, patientFields, testIds, patientNumber, onSave, onClose }: AddPatientSubWizardProps) => {
  const fields = patientFields && patientFields.length > 0 ? patientFields : DEFAULT_PATIENT_FIELDS
  const tests = testIds && testIds.length > 0 ? testIds : FALLBACK_TESTS

  const [step, setStep] = useState(0)
  const [form, setForm] = useState<RegForm>({})

  const [dpdpChecked, setDpdpChecked] = useState(false)
  const [researchChecked, setResearchChecked] = useState(false)
  const [withdrawChecked, setWithdrawChecked] = useState(false)
  const [consentMethod, setConsentMethod] = useState<ConsentMethod>(null)
  const [otpSent, setOtpSent] = useState<string | null>(null)
  const [otpInput, setOtpInput] = useState('')
  const [otpVerified, setOtpVerified] = useState(false)
  const [signatureText, setSignatureText] = useState('')
  const [consentPhotoName, setConsentPhotoName] = useState('')

  const [testDefs, setTestDefs] = useState<Record<string, FoTestDef | undefined>>({})
  const [testValues, setTestValues] = useState<Record<string, string>>({})
  const [testMessages, setTestMessages] = useState<Record<string, { level: string; message: string; color: string } | null>>({})
  const [symptoms, setSymptoms] = useState('')
  const [reportName, setReportName] = useState('')
  const [referToDoctor, setReferToDoctor] = useState(false)

  const resetAll = () => {
    setStep(0)
    setForm({})
    setDpdpChecked(false)
    setResearchChecked(false)
    setWithdrawChecked(false)
    setConsentMethod(null)
    setOtpSent(null)
    setOtpInput('')
    setOtpVerified(false)
    setSignatureText('')
    setConsentPhotoName('')
    setTestDefs({})
    setTestValues({})
    setTestMessages({})
    setSymptoms('')
    setReportName('')
    setReferToDoctor(false)
  }

  const handleClose = () => { resetAll(); onClose() }

  // Ensure test definitions are loaded once when entering step 2.
  const ensureTestDef = async (testId: string) => {
    if (testDefs[testId] !== undefined) return testDefs[testId]
    const def = await getTest(testId)
    setTestDefs((prev) => ({ ...prev, [testId]: def }))
    return def
  }

  const loadAllTestDefs = async () => {
    for (const t of tests) await ensureTestDef(t)
  }

  const setField = (id: string, value: string) => setForm((prev) => ({ ...prev, [id]: value }))

  const validateStep1 = (): string | null => {
    for (const f of fields) {
      const val = form[f.id] ?? ''
      if (f.required && !val.trim() && f.id !== 'uhid') return `${f.label} is required`
      if (f.type === 'number' && val) {
        const num = Number(val)
        if (f.min != null && num < f.min) return `${f.label} must be ≥ ${f.min}`
        if (f.max != null && num > f.max) return `${f.label} must be ≤ ${f.max}`
      }
      if (f.pattern && val && !new RegExp(f.pattern).test(val)) return `${f.label} format is invalid`
    }
    return null
  }

  const handleNextFromStep1 = () => {
    const err = validateStep1()
    if (err) { toast.error(err); return }
    if (!form.uhid || !form.uhid.trim()) setField('uhid', genUhid())
    setStep(1)
  }

  const handleSendOtp = () => {
    const code = String(Math.floor(100000 + Math.random() * 900000))
    setOtpSent(code)
    setOtpVerified(false)
    setOtpInput('')
    toast.info(`Demo OTP sent: ${code}`)
  }

  const handleVerifyOtp = () => {
    if (otpInput === otpSent) { setOtpVerified(true); toast.success('OTP verified') }
    else toast.error('OTP does not match')
  }

  const consentMethodSatisfied = () => {
    if (consentMethod === 'otp') return otpVerified
    if (consentMethod === 'signature') return signatureText.trim().length > 0
    if (consentMethod === 'upload') return consentPhotoName.length > 0
    return false
  }

  const handleNextFromStep2 = () => {
    if (!dpdpChecked) { toast.error('DPDP data-collection consent is mandatory'); return }
    if (!withdrawChecked) { toast.error('Withdrawal acknowledgement is mandatory'); return }
    if (!consentMethodSatisfied()) { toast.error('Complete at least one consent method (OTP, signature, or photo upload)'); return }
    loadAllTestDefs()
    setStep(2)
  }

  const applyBmiAutoCompute = (nextValues: Record<string, string>) => {
    if (!tests.includes('BMI')) return nextValues
    const htRaw = nextValues['HT']
    const wtRaw = nextValues['WT']
    if (!htRaw || !wtRaw) return nextValues
    const heightM = Number(htRaw) / 100
    const weightKg = Number(wtRaw)
    if (!heightM || !weightKg) return nextValues
    const bmi = weightKg / (heightM * heightM)
    return { ...nextValues, BMI: bmi.toFixed(1) }
  }

  const runInterpretation = async (testId: string, value: string, values: Record<string, string>) => {
    const def = await ensureTestDef(testId)
    const age = form.age ? Number(form.age) : undefined
    const gender = form.gender
    const result = interpret(def, value, { age, gender })
    setTestMessages((prev) => ({ ...prev, [testId]: result ? { level: result.level, message: result.message, color: result.color } : null }))
    void values
  }

  const handleTestChange = (testId: string, value: string) => {
    setTestValues((prev) => {
      const next = applyBmiAutoCompute({ ...prev, [testId]: value })
      // Re-interpret every affected test (the changed one + BMI if auto-computed).
      runInterpretation(testId, value, next)
      if (next.BMI !== prev.BMI && testId !== 'BMI') runInterpretation('BMI', next.BMI, next)
      return next
    })
  }

  const criticalFinding = Object.values(testMessages).some((m) => m?.level === 'critical')

  const buildResults = (): RunCampScreeningResult['results'] => {
    const out: RunCampScreeningResult['results'] = {}
    for (const t of tests) {
      if (testValues[t] === undefined || testValues[t] === '') continue
      const msg = testMessages[t]
      out[t] = { value: testValues[t], level: msg?.level, message: msg?.message }
    }
    return out
  }

  const handleSave = () => {
    const results = buildResults()
    const result: RunCampScreeningResult = {
      patientCode: form.uhid || genUhid(),
      name: form.name || 'Unnamed',
      age: Number(form.age) || 0,
      gender: form.gender || 'Other',
      results,
      criticalFinding,
      referredToDoctor: referToDoctor,
      at: new Date().toISOString(),
    }
    onSave(result)
    resetAll()
  }

  const stepLabels = ['Registration', 'DPDP Consent', 'Test & Result']

  return (
    <Dialog open={open} onOpenChange={(o) => !o && handleClose()}>
      <DialogContent className="max-h-[88vh] overflow-hidden flex flex-col p-0 gap-0 sm:max-w-2xl" showCloseButton={false}>
        <DialogHeader className="px-5 py-4" style={{ borderBottom: '1px solid var(--qms-border)' }}>
          <div className="flex items-center justify-between">
            <DialogTitle>Add patient</DialogTitle>
            <span className="text-[11px] font-bold px-2 py-0.5 rounded-full" style={{ background: 'var(--qms-surface-strong)', color: 'var(--qms-text-muted)' }}>
              Patient {patientNumber}/3
            </span>
          </div>
          <div className="flex items-center gap-1.5 mt-2">
            {stepLabels.map((label, i) => (
              <div
                key={label}
                className="flex-1 flex items-center gap-1.5 px-2 py-1 rounded-full border text-[10.5px] font-bold justify-center"
                style={
                  i === step
                    ? { borderColor: 'var(--qms-brand)', color: 'var(--qms-brand)', background: 'color-mix(in oklab, var(--qms-brand) 8%, transparent)' }
                    : i < step
                    ? { borderColor: 'color-mix(in oklab, var(--success) 40%, transparent)', color: 'var(--success)' }
                    : { borderColor: 'var(--qms-border)', color: 'var(--qms-text-muted)' }
                }
              >
                {i + 1}. {label}
              </div>
            ))}
          </div>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto px-5 py-4">
          {step === 0 && (
            <div className="grid grid-cols-2 gap-3">
              {fields.map((f) => (
                <div key={f.id} className={widthClass(f.width)}>
                  <label className="block text-[11px] font-semibold mb-1" style={{ color: 'var(--qms-text-muted)' }}>
                    {f.label}{f.required && f.id !== 'uhid' ? ' *' : ''}
                  </label>
                  {f.type === 'select' || f.type === 'radio' ? (
                    <Select value={form[f.id] ?? ''} onValueChange={(v) => setField(f.id, v ?? '')}>
                      <SelectTrigger className="w-full"><SelectValue placeholder="Select" /></SelectTrigger>
                      <SelectContent>
                        {(f.options ?? []).map((o) => <SelectItem key={o} value={o}>{o}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  ) : f.type === 'textarea' ? (
                    <Textarea value={form[f.id] ?? ''} onChange={(e) => setField(f.id, e.target.value)} rows={2} />
                  ) : f.type === 'file' ? (
                    <input
                      type="file"
                      className="block w-full text-[12px]"
                      onChange={(e) => setField(f.id, e.target.files?.[0]?.name ?? '')}
                    />
                  ) : (
                    <Input
                      type={f.type === 'number' ? 'number' : f.type === 'tel' ? 'tel' : f.type === 'email' ? 'email' : f.type === 'date' ? 'date' : f.type === 'time' ? 'time' : 'text'}
                      value={form[f.id] ?? ''}
                      placeholder={f.id === 'uhid' ? (f.placeholder ?? 'auto-generated if blank') : f.placeholder}
                      min={f.min}
                      max={f.max}
                      onChange={(e) => setField(f.id, e.target.value)}
                    />
                  )}
                </div>
              ))}
            </div>
          )}

          {step === 1 && (
            <div className="space-y-4">
              <div className="rounded-lg border p-3.5 space-y-2 text-[12.5px]" style={{ background: 'var(--qms-surface-strong)', borderColor: 'var(--qms-border)' }}>
                <div className="font-bold" style={{ color: 'var(--qms-text)' }}>India DPDP Act — patient notice</div>
                <ul className="list-disc pl-4 space-y-1" style={{ color: 'var(--qms-text-muted)' }}>
                  {DPDP_BULLETS.map((b, i) => <li key={i}>{b}</li>)}
                </ul>
              </div>

              <div className="space-y-2">
                <label className="flex items-start gap-2 text-[12.5px]" style={{ color: 'var(--qms-text)' }}>
                  <input type="checkbox" className="mt-0.5" checked={dpdpChecked} onChange={(e) => setDpdpChecked(e.target.checked)} />
                  I consent to collection of my health data for this screening camp. *
                </label>
                <label className="flex items-start gap-2 text-[12.5px]" style={{ color: 'var(--qms-text)' }}>
                  <input type="checkbox" className="mt-0.5" checked={researchChecked} onChange={(e) => setResearchChecked(e.target.checked)} />
                  I consent to anonymised use of my data for public-health research (optional).
                </label>
                <label className="flex items-start gap-2 text-[12.5px]" style={{ color: 'var(--qms-text)' }}>
                  <input type="checkbox" className="mt-0.5" checked={withdrawChecked} onChange={(e) => setWithdrawChecked(e.target.checked)} />
                  I acknowledge I may withdraw this consent at any time. *
                </label>
              </div>

              <div className="space-y-2">
                <div className="text-[11px] font-semibold" style={{ color: 'var(--qms-text-muted)' }}>Consent method — choose one *</div>

                <div className="rounded-lg border p-3 space-y-2" style={{ borderColor: consentMethod === 'otp' ? 'var(--qms-brand)' : 'var(--qms-border)' }}>
                  <label className="flex items-center gap-2 text-[12.5px] font-semibold" style={{ color: 'var(--qms-text)' }}>
                    <input type="radio" name="consent-method" checked={consentMethod === 'otp'} onChange={() => setConsentMethod('otp')} />
                    Mobile OTP
                  </label>
                  {consentMethod === 'otp' && (
                    <div className="flex items-center gap-2 pl-6">
                      <Button size="sm" variant="outline" onClick={handleSendOtp}>{otpSent ? 'Resend' : 'Send'}</Button>
                      <Input placeholder="Enter 6-digit code" value={otpInput} onChange={(e) => setOtpInput(e.target.value)} className="w-36" />
                      <Button size="sm" onClick={handleVerifyOtp} disabled={!otpSent}>Verify</Button>
                      {otpVerified && <span className="text-[11px] font-bold" style={{ color: 'var(--success)' }}><FiCheck className="inline" size={12} /> Verified</span>}
                    </div>
                  )}
                </div>

                <div className="rounded-lg border p-3 space-y-2" style={{ borderColor: consentMethod === 'signature' ? 'var(--qms-brand)' : 'var(--qms-border)' }}>
                  <label className="flex items-center gap-2 text-[12.5px] font-semibold" style={{ color: 'var(--qms-text)' }}>
                    <input type="radio" name="consent-method" checked={consentMethod === 'signature'} onChange={() => setConsentMethod('signature')} />
                    Digital signature (simulated)
                  </label>
                  {consentMethod === 'signature' && (
                    <div className="pl-6">
                      <Input placeholder="Type patient's full name as a demo signature" value={signatureText} onChange={(e) => setSignatureText(e.target.value)} />
                      <div className="text-[10.5px] mt-1" style={{ color: 'var(--qms-text-muted)' }}>Demo capture only — not a real signature pad.</div>
                    </div>
                  )}
                </div>

                <div className="rounded-lg border p-3 space-y-2" style={{ borderColor: consentMethod === 'upload' ? 'var(--qms-brand)' : 'var(--qms-border)' }}>
                  <label className="flex items-center gap-2 text-[12.5px] font-semibold" style={{ color: 'var(--qms-text)' }}>
                    <input type="radio" name="consent-method" checked={consentMethod === 'upload'} onChange={() => setConsentMethod('upload')} />
                    Consent-form photo upload
                  </label>
                  {consentMethod === 'upload' && (
                    <div className="pl-6">
                      <input type="file" accept="image/*" className="text-[12px]" onChange={(e) => setConsentPhotoName(e.target.files?.[0]?.name ?? '')} />
                      {consentPhotoName && <div className="text-[11px] mt-1" style={{ color: 'var(--qms-text-muted)' }}>Attached: {consentPhotoName}</div>}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-4">
              {criticalFinding && (
                <div className="flex items-center gap-2 rounded-lg px-3.5 py-2.5 text-[12.5px] font-semibold" style={{ background: 'var(--danger-soft)', color: 'var(--danger)' }}>
                  <FiAlertTriangle size={15} /> Critical finding detected — recommend immediate doctor referral.
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                {tests.map((testId) => {
                  const def = testDefs[testId]
                  const msg = testMessages[testId]
                  const isBmiAuto = testId === 'BMI' && !!testValues.HT && !!testValues.WT
                  return (
                    <div key={testId} className="rounded-lg border p-3" style={{ borderColor: 'var(--qms-border)', background: 'var(--qms-surface)' }}>
                      <div className="flex items-baseline justify-between gap-2">
                        <div className="text-[12.5px] font-bold" style={{ color: 'var(--qms-text)' }}>{def?.name ?? testId}</div>
                        <div className="text-[10.5px]" style={{ color: 'var(--qms-text-muted)' }}>{def?.unit ?? ''}</div>
                      </div>
                      {def?.refRange && <div className="text-[10.5px] mb-1.5" style={{ color: 'var(--qms-text-muted)' }}>Ref: {def.refRange}</div>}

                      {def?.inputType === 'select' && def.options ? (
                        <Select value={testValues[testId] ?? ''} onValueChange={(v) => handleTestChange(testId, v ?? '')}>
                          <SelectTrigger className="w-full"><SelectValue placeholder="Select" /></SelectTrigger>
                          <SelectContent>
                            {def.options.map((o) => <SelectItem key={o} value={o}>{o}</SelectItem>)}
                          </SelectContent>
                        </Select>
                      ) : def?.inputType === 'positive_negative' ? (
                        <Select value={testValues[testId] ?? ''} onValueChange={(v) => handleTestChange(testId, v ?? '')}>
                          <SelectTrigger className="w-full"><SelectValue placeholder="Select" /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="Positive">Positive</SelectItem>
                            <SelectItem value="Negative">Negative</SelectItem>
                          </SelectContent>
                        </Select>
                      ) : def?.inputType === 'text' ? (
                        <Input value={testValues[testId] ?? ''} onChange={(e) => handleTestChange(testId, e.target.value)} />
                      ) : (
                        <Input
                          type="number"
                          step={0.1}
                          min={def?.min ?? undefined}
                          max={def?.max ?? undefined}
                          value={testValues[testId] ?? ''}
                          disabled={isBmiAuto}
                          onChange={(e) => handleTestChange(testId, e.target.value)}
                        />
                      )}
                      {isBmiAuto && <div className="text-[10px] mt-1" style={{ color: 'var(--qms-text-muted)' }}>Auto-computed from HT + WT</div>}

                      {msg && (
                        <div className="text-[11px] font-semibold mt-1.5" style={{ color: msg.color }}>{msg.message}</div>
                      )}
                    </div>
                  )
                })}
              </div>

              <div>
                <label className="block text-[11px] font-semibold mb-1" style={{ color: 'var(--qms-text-muted)' }}>Symptoms</label>
                <Textarea value={symptoms} onChange={(e) => setSymptoms(e.target.value)} rows={2} />
              </div>

              <div>
                <label className="block text-[11px] font-semibold mb-1" style={{ color: 'var(--qms-text-muted)' }}>Report upload (optional)</label>
                <input type="file" className="block w-full text-[12px]" onChange={(e) => setReportName(e.target.files?.[0]?.name ?? '')} />
                {reportName && <div className="text-[11px] mt-1" style={{ color: 'var(--qms-text-muted)' }}>Attached: {reportName}</div>}
              </div>

              <label className="flex items-center gap-2 text-[12.5px] font-semibold" style={{ color: 'var(--qms-text)' }}>
                <input type="checkbox" checked={referToDoctor} onChange={(e) => setReferToDoctor(e.target.checked)} />
                Refer to doctor
              </label>
            </div>
          )}
        </div>

        <DialogFooter>
          {step > 0 ? (
            <Button variant="outline" onClick={() => setStep(step - 1)}><FiChevronLeft size={13} /> Back</Button>
          ) : (
            <Button variant="outline" onClick={handleClose}>Cancel</Button>
          )}
          {step === 0 && <Button onClick={handleNextFromStep1}>Next <FiChevronRight size={13} /></Button>}
          {step === 1 && <Button onClick={handleNextFromStep2}>Next <FiChevronRight size={13} /></Button>}
          {step === 2 && <Button onClick={handleSave}><FiSend size={13} /> Save patient</Button>}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export default AddPatientSubWizard
