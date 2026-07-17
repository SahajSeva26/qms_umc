import { useState } from 'react'
import { FiUserCheck } from 'react-icons/fi'
import { useDashboardData } from '@/features/dashboard/hooks/useDashboardData'
import SectionCard from '@/features/dashboard/components/SectionCard'
import MiniKpiCard from '@/features/dashboard/components/MiniKpiCard'
import FilterChips from '@/features/dashboard/components/FilterChips'
import GenderDonut from '@/features/dashboard/components/GenderDonut'
import { formatPercent } from '@/utils/formatters'
import type { InterpretationClass, PatientsData } from '@/types/dashboard.types'

const GENDER_FILTERS = ['ALL', 'Male', 'Female', 'Other']

const SEVERITY_COLOR: Record<InterpretationClass['severity'], string> = {
  NORMAL: 'var(--success)',
  MEDIUM: 'var(--warning)',
  HIGH: 'var(--danger)',
}

function genderScale(patients: PatientsData, genderFilter: string): number {
  if (genderFilter === 'Male') return patients.male.share / 100
  if (genderFilter === 'Female') return patients.female.share / 100
  if (genderFilter === 'Other') return patients.other.share / 100
  return 1
}

interface PatientsSectionProps {
  onDrill: (title: string, content: string) => void
}

const PatientsSection = ({ onDrill }: PatientsSectionProps) => {
  const [genderFilter, setGenderFilter] = useState('ALL')
  const { data } = useDashboardData()

  if (!data) return null
  const { patients } = data

  const scale = genderScale(patients, genderFilter)

  return (
    <SectionCard
      icon={FiUserCheck}
      iconGradient="linear-gradient(135deg, var(--qms-role-super-admin), #ec4899)"
      title="Patients"
      subtitle="Reach · gender split · interpretations"
    >
      <div className="grid gap-2.5 mb-4" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))' }}>
        <MiniKpiCard label="Total Patients" data={patients.total} />
        <MiniKpiCard label="Male" data={{ v: patients.male.v }} suffix={`· ${patients.male.share}%`} />
        <MiniKpiCard label="Female" data={{ v: patients.female.v }} suffix={`· ${patients.female.share}%`} />
        <MiniKpiCard label="Other" data={{ v: patients.other.v }} suffix={`· ${patients.other.share}%`} />
      </div>

      <FilterChips options={GENDER_FILTERS} active={genderFilter} onChange={setGenderFilter} />

      <div className="grid md:grid-cols-2 gap-5 mb-5">
        <GenderDonut
          slices={[
            { label: 'Male', value: patients.male.v, share: patients.male.share, color: '#3b6dff' },
            { label: 'Female', value: patients.female.v, share: patients.female.share, color: '#ec4899' },
            { label: 'Other', value: patients.other.v, share: patients.other.share, color: '#a855f7' },
          ]}
        />
        <p className="text-[13px] leading-relaxed self-center" style={{ color: 'var(--qms-text-soft)' }}>
          Reach is up <span className="font-bold" style={{ color: 'var(--success)' }}>+{formatPercent(((patients.total.v - (patients.total.ly ?? patients.total.v)) / (patients.total.ly ?? 1)) * 100, 1)}</span> vs
          last FY. The mix skews male in metro areas. Interpretation distribution below flags clinical burden — drives
          doctor outreach and PSP enrollment.
        </p>
      </div>

      <h3 className="text-[12px] font-bold uppercase tracking-wider mb-2" style={{ color: 'var(--qms-text-muted)' }}>
        Interpretations by project
      </h3>
      <div className="space-y-4">
        {patients.interpretations.map((proj) => {
          const scaledTotal = Math.round(proj.total * scale)
          return (
            <div key={proj.project}>
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-[13px] font-semibold" style={{ color: 'var(--qms-text)' }}>{proj.project}</span>
                <span className="text-[12px] tabular-nums" style={{ color: 'var(--qms-text-muted)' }}>{scaledTotal.toLocaleString('en-IN')} patients</span>
              </div>
              <div className="flex h-4 rounded-full overflow-hidden border" style={{ borderColor: 'var(--qms-border)' }}>
                {proj.classes.map((cls) => (
                  <button
                    key={cls.label}
                    onClick={() => onDrill(`${proj.project} · ${cls.label}`, `${Math.round(cls.count * scale).toLocaleString('en-IN')} patients · ${formatPercent((cls.count / proj.total) * 100, 1)} of project · ${cls.severity}`)}
                    style={{ width: `${(cls.count / proj.total) * 100}%`, background: SEVERITY_COLOR[cls.severity] }}
                  />
                ))}
              </div>
              <div className="flex flex-wrap gap-3 mt-1.5">
                {proj.classes.map((cls) => (
                  <div key={cls.label} className="flex items-center gap-1.5 text-[11px]" style={{ color: 'var(--qms-text-muted)' }}>
                    <span className="w-2 h-2 rounded-full" style={{ background: SEVERITY_COLOR[cls.severity] }} />
                    {cls.label}: {Math.round(cls.count * scale).toLocaleString('en-IN')}
                  </div>
                ))}
              </div>
            </div>
          )
        })}
      </div>
    </SectionCard>
  )
}

export default PatientsSection
