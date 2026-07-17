import type { Camp } from '@/types/camp.types'
import type { CampPerspective } from '@/features/camps/camps.perspective'
import { formatINR } from '@/utils/formatters'
import DossierSection from '@/features/camps/components/DossierSection'
import KeyValueGrid from '@/components/ui/KeyValueGrid'

interface SectionProps {
  camp: Camp
  perspective: CampPerspective
}

export const ConsumablesSection = ({ camp, perspective }: SectionProps) => {
  if (perspective === 'pharma') return null
  if (camp.devicesAllocated.length === 0) return null

  return (
    <DossierSection title="Consumables · device kit">
      <ul className="text-[13px] list-disc list-inside space-y-1" style={{ color: 'var(--qms-text)' }}>
        {camp.devicesAllocated.map((d) => (
          <li key={d}>{d}</li>
        ))}
      </ul>
    </DossierSection>
  )
}

// TODO: mock — no real expense-claim data exists for camps yet. Amounts are
// deterministically derived so the same camp always shows the same figures.
export const ExpensesSection = ({ camp, perspective }: SectionProps) => {
  if (perspective === 'pharma') return null
  if (!camp.foId) return null

  const base = camp.patientsExpected * 45
  const travel = Math.round(base * 0.4)
  const da = Math.round(base * 0.25)
  const remuneration = Math.round(base * 0.3)
  const misc = base - travel - da - remuneration
  const total = travel + da + remuneration + misc

  return (
    <DossierSection title="Expenses">
      <KeyValueGrid
        columns={3}
        items={[
          { label: 'Travel', value: formatINR(travel) },
          { label: 'DA', value: formatINR(da) },
          { label: 'Remuneration', value: formatINR(remuneration) },
          { label: 'Misc', value: formatINR(misc) },
          { label: 'Total', value: formatINR(total) },
          { label: 'Status', value: camp.status === 'CLOSED' ? 'Approved' : 'Pending' },
        ]}
      />
    </DossierSection>
  )
}

export const RatingSection = ({ camp }: SectionProps) => {
  const rating = camp.rating ?? { overall: camp.foRating }
  if (!rating.overall) return null

  const stars = (value: number) => '★'.repeat(Math.round(value)) + '☆'.repeat(5 - Math.round(value))

  return (
    <DossierSection title="FO / camp rating">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: 'Overall', value: rating.overall },
          { label: 'On-time', value: rating.onTime },
          { label: 'Attire', value: rating.attire },
          { label: 'Communication', value: rating.communication },
        ].filter((r) => r.value).map((r) => (
          <div key={r.label}>
            <div className="text-[10px] font-semibold uppercase tracking-wider mb-0.5" style={{ color: 'var(--qms-text-muted)' }}>{r.label}</div>
            <div className="text-sm" style={{ color: 'var(--warning)' }}>{stars(r.value!)}</div>
          </div>
        ))}
      </div>
    </DossierSection>
  )
}

export const RemarksSection = ({ camp, perspective }: SectionProps) => {
  if (perspective === 'pharma') return null
  if (!camp.notes && (!camp.foRemarks || camp.foRemarks.length === 0)) return null

  return (
    <DossierSection title="FO remarks">
      {camp.notes && <p className="text-[13px] mb-2" style={{ color: 'var(--qms-text)' }}>{camp.notes}</p>}
      {camp.foRemarks && camp.foRemarks.length > 0 && (
        <ul className="text-[13px] list-disc list-inside space-y-1" style={{ color: 'var(--qms-text-soft)' }}>
          {camp.foRemarks.map((r, i) => <li key={i}>{r}</li>)}
        </ul>
      )}
    </DossierSection>
  )
}

// TODO: mock — no real invoicing data exists for camps yet.
export const PaymentSection = ({ camp, perspective }: SectionProps) => {
  if (perspective === 'pharma') return null
  if (camp.status !== 'CLOSED') return null

  return (
    <DossierSection title="Payment status">
      <KeyValueGrid
        columns={3}
        items={[
          { label: 'Invoice status', value: 'UNBILLED' },
          { label: 'Invoice ID', value: '—' },
          { label: 'Payment ref', value: '—' },
        ]}
      />
    </DossierSection>
  )
}

export const EffortsSection = ({ camp, perspective }: SectionProps) => {
  if (perspective === 'pharma') return null
  if (!camp.extraEfforts || camp.extraEfforts.length === 0) return null

  return (
    <DossierSection title="Extra efforts by QMS team">
      <ul className="text-[13px] list-disc list-inside space-y-1" style={{ color: 'var(--qms-text)' }}>
        {camp.extraEfforts.map((e, i) => <li key={i}>{e}</li>)}
      </ul>
    </DossierSection>
  )
}

// TODO: mock — no real reminder-thread data exists for camps yet.
export const RemindersSection = ({ camp, perspective }: SectionProps) => {
  if (perspective === 'pharma') return null
  if (camp.status === 'CANCELLED' || camp.status === 'CANCELLED_CHARGED') return null

  return (
    <DossierSection title="Reminders & responses">
      <KeyValueGrid
        columns={2}
        items={[
          { label: 'T-24h reminder', value: camp.status === 'REQUESTED' ? 'Scheduled' : 'Sent · Confirmed' },
          { label: 'T-2h reminder', value: camp.status === 'LIVE' || camp.status === 'CLOSED' ? 'Sent · Confirmed' : 'Pending' },
        ]}
      />
    </DossierSection>
  )
}

export const DietitianCoordSection = ({ camp, perspective }: SectionProps) => {
  if (perspective === 'pharma' || camp.type !== 'Diet') return null

  return (
    <DossierSection title="Dietitian coordination">
      <KeyValueGrid
        columns={2}
        items={[
          { label: 'Dietitian', value: camp.dietitianId ?? 'Unassigned' },
          { label: 'BCA status', value: camp.status === 'CLOSED' ? 'Verified' : 'Align BCA scale' },
        ]}
      />
    </DossierSection>
  )
}
