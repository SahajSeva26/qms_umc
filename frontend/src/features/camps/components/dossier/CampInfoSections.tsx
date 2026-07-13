import { FiMapPin, FiExternalLink } from 'react-icons/fi'
import type { Camp } from '@/types/camp.types'
import type { CampPerspective } from '@/features/camps/camps.perspective'
import { getDoctor } from '@/features/camps/camps.utils'
import { clientName, divisionName, foName } from '@/features/camps/camps.refs'
import { SLOTS } from '@/features/camps/camps.mock'
import DossierSection from '@/features/camps/components/DossierSection'
import KeyValueGrid from '@/components/ui/KeyValueGrid'
import { formatDate } from '@/utils/formatters'

interface SectionProps {
  camp: Camp
  perspective: CampPerspective
}

export const CampDetailsSection = ({ camp }: SectionProps) => {
  const slot = SLOTS.find((s) => s.id === camp.slot)
  return (
    <DossierSection title="Camp details">
      <KeyValueGrid
        columns={3}
        items={[
          { label: 'Camp ID', value: camp.id },
          { label: 'Type', value: camp.type },
          { label: 'Status', value: camp.status },
          { label: 'Date', value: formatDate(camp.date) },
          { label: 'Slot', value: slot?.label ?? camp.slot },
          { label: 'Company', value: clientName(camp.clientId) },
          { label: 'Division', value: divisionName(camp.divisionId) },
          { label: 'City / State', value: `${camp.city}, ${camp.state}` },
          { label: 'Address', value: camp.address },
        ]}
      />
      {camp.gmapLink && (
        <a
          href={camp.gmapLink}
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center gap-1.5 text-[12px] font-semibold mt-3"
          style={{ color: 'var(--qms-brand)' }}
        >
          <FiMapPin size={12} /> View on Maps <FiExternalLink size={11} />
        </a>
      )}
    </DossierSection>
  )
}

export const DoctorSection = ({ camp }: SectionProps) => {
  const doctor = getDoctor(camp.doctorId)
  if (!doctor) return null

  return (
    <DossierSection title="Doctor details">
      <div className="flex items-start gap-3">
        <div
          className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold shrink-0"
          style={{ background: 'linear-gradient(135deg, var(--qms-brand), var(--qms-teal))' }}
        >
          {doctor.name.split(' ').map((p) => p[0]).slice(0, 2).join('').toUpperCase()}
        </div>
        <div className="min-w-0 flex-1">
          <div className="text-[13px] font-bold" style={{ color: 'var(--qms-text)' }}>{doctor.name}</div>
          <div className="text-[11px] mb-2" style={{ color: 'var(--qms-text-muted)' }}>{doctor.code} · {doctor.specialty}</div>
          <KeyValueGrid
            columns={2}
            items={[
              { label: 'Phone', value: doctor.phone },
              { label: 'Email', value: doctor.email },
              { label: 'City', value: doctor.city },
              { label: 'State', value: doctor.state },
              { label: 'Pincode', value: doctor.pincode },
            ]}
          />
        </div>
      </div>
    </DossierSection>
  )
}

export const MrSection = ({ camp, perspective }: SectionProps) => {
  if (!camp.mrId || perspective === 'pharma') return null

  return (
    <DossierSection title="MR details">
      <KeyValueGrid
        columns={2}
        items={[
          { label: 'Name', value: camp.mrName },
          { label: 'Region', value: camp.rsmRegion },
          { label: 'ASM', value: camp.asmName },
        ]}
      />
    </DossierSection>
  )
}

export const FieldSection = ({ camp, perspective }: SectionProps) => {
  const fo = foName(camp.foId)
  const showClosure = perspective === 'internal' && (
    camp.mrAvailable !== undefined || camp.doctorAvailabilityHrs !== undefined || camp.mrFeedback || camp.incidentReport || camp.mrFeedbackRating
  )

  return (
    <DossierSection title="Field Officer / Dietitian">
      <div className="grid md:grid-cols-2 gap-4">
        <div>
          <div className="text-[10px] font-semibold uppercase tracking-wider mb-1" style={{ color: 'var(--qms-text-muted)' }}>Field Officer</div>
          {fo ? (
            <div className="text-[13px]" style={{ color: 'var(--qms-text)' }}>{fo}</div>
          ) : (
            <div className="text-[13px] font-semibold text-danger">Unassigned</div>
          )}
        </div>
        {camp.dietitianId && (
          <div>
            <div className="text-[10px] font-semibold uppercase tracking-wider mb-1" style={{ color: 'var(--qms-text-muted)' }}>Dietitian</div>
            <div className="text-[13px]" style={{ color: 'var(--qms-text)' }}>{camp.dietitianId}</div>
          </div>
        )}
      </div>

      {showClosure && (
        <div className="mt-4 pt-4" style={{ borderTop: '1px dashed var(--qms-border)' }}>
          <div className="text-[11px] font-bold uppercase tracking-wider mb-2" style={{ color: 'var(--qms-text-muted)' }}>
            Camp closure · stakeholders
          </div>
          <KeyValueGrid
            columns={2}
            items={[
              { label: 'MR available', value: camp.mrAvailable === undefined ? undefined : camp.mrAvailable ? 'Yes' : 'No' },
              { label: 'Doctor availability (hrs)', value: camp.doctorAvailabilityHrs },
              { label: 'MR feedback', value: camp.mrFeedback },
              { label: 'MR feedback rating', value: camp.mrFeedbackRating },
              { label: 'Incident report', value: camp.incidentReport },
            ]}
          />
        </div>
      )}
    </DossierSection>
  )
}

export const CoordinatorSection = ({ camp }: SectionProps) => {
  if (!camp.coordId && !camp.coordinatorId) return null
  return (
    <DossierSection title="Camp coordinator">
      <KeyValueGrid columns={2} items={[{ label: 'Coordinator', value: camp.coordId ?? camp.coordinatorId }]} />
    </DossierSection>
  )
}

export const SalesSection = ({ camp, perspective }: SectionProps) => {
  if (perspective === 'pharma') return null
  return (
    <DossierSection title="Sales team">
      <KeyValueGrid
        columns={2}
        items={[
          { label: 'Key Account Manager', value: foName(camp.foId) || 'Unassigned' },
          { label: 'Project', value: camp.projectId },
        ]}
      />
    </DossierSection>
  )
}

export const PoSection = ({ camp, perspective }: SectionProps) => {
  if (perspective === 'pharma') return null
  return (
    <DossierSection title="PO details">
      <KeyValueGrid
        columns={3}
        items={[
          { label: 'Project', value: camp.projectId },
          { label: 'Camps target', value: camp.patientsExpected },
          { label: 'Camps done', value: camp.patientsDone },
        ]}
      />
    </DossierSection>
  )
}

export const TimingSection = ({ camp, perspective }: SectionProps) => {
  if (perspective === 'pharma') return null
  if (!camp.checkInAt && !camp.checkOutAt) return null

  const hours = camp.checkInAt && camp.checkOutAt
    ? ((new Date(camp.checkOutAt).getTime() - new Date(camp.checkInAt).getTime()) / 3_600_000).toFixed(1)
    : undefined

  return (
    <DossierSection title="Camp timing">
      <KeyValueGrid
        columns={3}
        items={[
          { label: 'Check-in', value: camp.checkInAt },
          { label: 'Check-out', value: camp.checkOutAt },
          { label: 'Total hours', value: hours },
        ]}
      />
    </DossierSection>
  )
}
