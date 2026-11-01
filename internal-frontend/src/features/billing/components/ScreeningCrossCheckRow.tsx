import { useTestResults } from '@/features/clinical/test-result/hooks/useTestResults'
import { SCREENING_STATUS_LABEL, type ScreeningEntity } from '@/features/clinical/screening/screening.types'

interface ScreeningCrossCheckRowProps {
  screening: ScreeningEntity
}

const patientName = (screening: ScreeningEntity) => {
  const patient = screening.patient
  if (!patient) return 'Unknown patient'
  return [patient.firstName, patient.middleName, patient.lastName].filter(Boolean).join(' ')
}

// Photos are not shown — no backend field for them exists yet (md-files/BACKEND_REQUESTS.md).
const ScreeningCrossCheckRow = ({ screening }: ScreeningCrossCheckRowProps) => {
  const { data, isLoading, error, refetch } = useTestResults({ screening: screening.id, limit: '20' }, screening.status === 'completed')
  const results = data?.data?.items ?? []

  return (
    <div className="rounded-lg border px-3.5 py-3" style={{ borderColor: 'var(--qms-border)' }}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="text-[13px] font-semibold truncate" style={{ color: 'var(--qms-text)' }}>{patientName(screening)}</div>
          <div className="text-[11px]" style={{ color: 'var(--qms-text-muted)' }}>
            {screening.patient?.code} · {screening.patient?.mobile}
          </div>
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          {screening.referral && (
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full" style={{ background: 'var(--qms-surface-strong)', color: 'var(--qms-text-muted)' }}>
              REFERRED
            </span>
          )}
          <span
            className="text-[10px] font-bold px-2 py-0.5 rounded-full"
            style={{
              background: screening.status === 'completed' ? 'var(--success-soft)' : screening.status === 'cancelled' ? 'var(--danger-soft)' : 'var(--qms-surface-strong)',
              color: screening.status === 'completed' ? 'var(--success)' : screening.status === 'cancelled' ? 'var(--danger)' : 'var(--qms-text-muted)',
            }}
          >
            {SCREENING_STATUS_LABEL[screening.status].toUpperCase()}
          </span>
        </div>
      </div>

      {screening.symptoms.length > 0 && (
        <div className="text-[11px] mt-1.5" style={{ color: 'var(--qms-text-muted)' }}>
          <span className="font-semibold">Symptoms:</span> {screening.symptoms.join(', ')}
        </div>
      )}

      <div className="text-[11px] mt-1" style={{ color: 'var(--qms-text-muted)' }}>
        <span className="font-semibold">Consent:</span>{' '}
        {screening.consent?.verified ? <span style={{ color: 'var(--success)' }}>Verified</span> : 'Not verified'}
      </div>

      {screening.status === 'completed' && (
        <div className="mt-2 pt-2" style={{ borderTop: '1px solid var(--qms-border)' }}>
          <div className="text-[10px] font-semibold tracking-widest uppercase mb-1" style={{ color: 'var(--qms-text-muted)' }}>
            Test results
          </div>
          {isLoading ? (
            <div className="text-[11px]" style={{ color: 'var(--qms-text-muted)' }}>Loading test results…</div>
          ) : error ? (
            <div className="flex items-center gap-2 text-[11px] text-danger">
              <span>Couldn't load test results — don't treat this patient as having none.</span>
              <button onClick={() => refetch()} className="underline font-semibold shrink-0">Retry</button>
            </div>
          ) : results.length === 0 ? (
            <div className="text-[11px]" style={{ color: 'var(--qms-text-muted)' }}>No test results recorded.</div>
          ) : (
            <div className="flex flex-wrap gap-1.5">
              {results.map((r) => (
                <span
                  key={r.id}
                  className="text-[11px] px-2 py-1 rounded-md"
                  style={{ background: 'var(--qms-surface-strong)', color: 'var(--qms-text)' }}
                >
                  <span className="font-semibold">{r.type?.name ?? 'Unknown test'}:</span> {r.result.value}{r.result.unit ? ` ${r.result.unit}` : ''}
                  {r.result.interpretation && r.result.interpretation !== 'NORMAL' && (
                    <span className="ml-1 font-bold" style={{ color: r.result.interpretation === 'CRITICAL' ? 'var(--danger)' : 'var(--qms-text-muted)' }}>
                      ({r.result.interpretation})
                    </span>
                  )}
                </span>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export default ScreeningCrossCheckRow
