import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { useUpdateScreening } from '@/features/clinical/screening/hooks/useUpdateScreening'
import { useRequestConsentOtp } from '@/features/clinical/screening/hooks/useRequestConsentOtp'
import { useVerifyConsent } from '@/features/clinical/screening/hooks/useVerifyConsent'
import ScreeningStageHistoryList from '@/features/clinical/screening/components/ScreeningStageHistoryList'
import ScreeningMoveStagePanel from '@/features/clinical/screening/components/ScreeningMoveStagePanel'
import { SCREENING_STATUS_LABEL, type ScreeningEntity } from '@/features/clinical/screening/screening.types'

interface ScreeningDetailProps {
  screening: ScreeningEntity
  canWrite: boolean
  canMoveStage: boolean
  onClose: () => void
}

const patientName = (screening: ScreeningEntity) => {
  const patient = screening.patient
  if (!patient) return 'Unknown patient'
  return [patient.firstName, patient.middleName, patient.lastName].filter(Boolean).join(' ')
}

// Symptoms have no fixed vocabulary, hence a comma-separated textarea rather than a tag-chip editor.
const ScreeningDetail = ({ screening, canWrite, canMoveStage, onClose }: ScreeningDetailProps) => {
  const isPending = screening.status === 'pending'
  const [symptomsText, setSymptomsText] = useState(screening.symptoms.join(', '))
  const [referral, setReferral] = useState(screening.referral)
  const updateMutation = useUpdateScreening(screening.id)

  const requestOtp = useRequestConsentOtp(screening.id)
  const verifyConsent = useVerifyConsent(screening.id)
  const [otpInput, setOtpInput] = useState('')
  // TEMP: no delivery sender exists yet, so request-consent-otp returns the code directly.
  const issuedCode = requestOtp.data?.data?.code

  const handleSave = () => {
    const submittedText = symptomsText
    const symptoms = submittedText
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean)
    // Re-sync only if the textarea still matches what was submitted — a fresher in-flight edit must survive.
    updateMutation.mutate(
      { symptoms, referral },
      { onSuccess: () => setSymptomsText((current) => (current === submittedText ? symptoms.join(', ') : current)) },
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-base font-bold" style={{ color: 'var(--qms-text)' }}>{patientName(screening)}</h2>
          <p className="text-[12px]" style={{ color: 'var(--qms-text-muted)' }}>
            {screening.patient?.code} · {screening.patient?.mobile}
          </p>
        </div>
        <span
          className="text-[11px] font-bold px-2 py-0.5 rounded-full"
          style={{
            background: screening.status === 'completed' ? 'var(--success-soft)' : screening.status === 'cancelled' ? 'var(--danger-soft)' : 'var(--qms-surface-strong)',
            color: screening.status === 'completed' ? 'var(--success)' : screening.status === 'cancelled' ? 'var(--danger)' : 'var(--qms-text-muted)',
          }}
        >
          {SCREENING_STATUS_LABEL[screening.status]}
        </span>
      </div>

      <div>
        <Label className="text-[10px] font-semibold tracking-widest uppercase mb-2" style={{ color: 'var(--qms-text-muted)' }}>
          Symptoms
        </Label>
        <Textarea
          value={symptomsText}
          onChange={(e) => setSymptomsText(e.target.value)}
          placeholder="Comma-separated, e.g. fatigue, frequent thirst"
          disabled={!isPending || !canWrite}
          rows={2}
        />
      </div>

      <label className="flex items-center gap-2 text-[13px]" style={{ color: 'var(--qms-text)' }}>
        <input
          type="checkbox"
          checked={referral}
          onChange={(e) => setReferral(e.target.checked)}
          disabled={!isPending || !canWrite}
        />
        Refer to doctor
      </label>

      {isPending && canWrite && (
        <Button size="sm" onClick={handleSave} disabled={updateMutation.isPending}>
          {updateMutation.isPending ? 'Saving…' : 'Save changes'}
        </Button>
      )}

      <div className="rounded-xl border p-3.5 text-[13px]" style={{ borderColor: 'var(--qms-border)', background: 'var(--qms-surface)' }}>
        <div className="text-[11px] font-semibold tracking-widest uppercase mb-1" style={{ color: 'var(--qms-text-muted)' }}>Consent</div>
        {screening.consent?.verified ? (
          <span className="font-semibold" style={{ color: 'var(--success)' }}>Verified</span>
        ) : (
          <div className="space-y-2">
            <span className="font-semibold" style={{ color: 'var(--qms-text-muted)' }}>Not yet verified</span>

            {canWrite && (
              <>
                <div>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => requestOtp.mutate()}
                    disabled={requestOtp.isPending}
                  >
                    {requestOtp.isPending ? 'Sending…' : issuedCode ? 'Resend OTP' : 'Send OTP'}
                  </Button>
                </div>
                {requestOtp.isError && (
                  <p className="text-[11px] text-danger">Couldn't send the OTP. Try again.</p>
                )}
                {issuedCode && (
                  <p className="text-[11px]" style={{ color: 'var(--qms-text-muted)' }}>
                    No SMS/WhatsApp delivery is wired up yet — the code is shown here directly for
                    testing: <span className="font-mono font-bold" style={{ color: 'var(--qms-text)' }}>{issuedCode}</span>
                  </p>
                )}
                <div className="flex items-center gap-2">
                  <Input
                    type="text"
                    inputMode="numeric"
                    placeholder="6-digit code"
                    value={otpInput}
                    onChange={(e) => setOtpInput(e.target.value)}
                    className="h-auto py-1.5 text-[13px] max-w-32"
                  />
                  <Button
                    size="sm"
                    onClick={() => verifyConsent.mutate({ otp: otpInput }, { onSuccess: () => setOtpInput('') })}
                    disabled={!otpInput.trim() || verifyConsent.isPending}
                  >
                    {verifyConsent.isPending ? 'Verifying…' : 'Verify'}
                  </Button>
                </div>
                {verifyConsent.isError && (
                  <p className="text-[11px] text-danger">
                    {(verifyConsent.error as { response?: { data?: { message?: string } } })?.response?.data?.message || "That code didn't match. Try again."}
                  </p>
                )}
              </>
            )}
          </div>
        )}
      </div>

      <ScreeningMoveStagePanel screening={screening} canMoveStage={canMoveStage} />
      <ScreeningStageHistoryList screening={screening} />

      <Button variant="secondary" onClick={onClose}>Back to list</Button>
    </div>
  )
}

export default ScreeningDetail
