import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { useUpdateScreening } from '@/features/clinical/screening/hooks/useUpdateScreening'
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

// Symptoms are open-ended free text (e.g. "fatigue", "frequent thirst") — no
// fixed vocabulary to pick from, so a comma-separated textarea is the
// simplest honest editor rather than inventing a free-text tag-chip
// component for this one consumer.
const ScreeningDetail = ({ screening, canWrite, canMoveStage, onClose }: ScreeningDetailProps) => {
  const isPending = screening.status === 'pending'
  const [symptomsText, setSymptomsText] = useState(screening.symptoms.join(', '))
  const [referral, setReferral] = useState(screening.referral)
  const updateMutation = useUpdateScreening(screening.id)

  const handleSave = () => {
    const symptoms = symptomsText
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean)
    updateMutation.mutate({ symptoms, referral })
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
          <>
            <span className="font-semibold" style={{ color: 'var(--qms-text-muted)' }}>Not yet verified</span>
            <p className="text-[11px] mt-1" style={{ color: 'var(--qms-text-muted)' }}>
              Consent verification requires SMS delivery, not yet available.
            </p>
          </>
        )}
      </div>

      <ScreeningMoveStagePanel screening={screening} canMoveStage={canMoveStage} />
      <ScreeningStageHistoryList screening={screening} />

      <Button variant="secondary" onClick={onClose}>Back to list</Button>
    </div>
  )
}

export default ScreeningDetail
