import { useState } from 'react'
import { FiActivity } from 'react-icons/fi'
import { useDashboardData } from '@/features/dashboard/hooks/useDashboardData'
import SectionCard from '@/features/dashboard/components/SectionCard'
import MiniKpiCard from '@/features/dashboard/components/MiniKpiCard'
import BarListRow from '@/features/dashboard/components/BarListRow'
import FilterChips from '@/features/dashboard/components/FilterChips'
import { formatPercent } from '@/utils/formatters'

const SPECIALTY_FILTERS = ['ALL', 'Cardio', 'Diabetes', 'Pulmo', 'GP', 'Other']

interface DoctorsSectionProps {
  onDrill: (title: string, content: string) => void
}

const DoctorsSection = ({ onDrill }: DoctorsSectionProps) => {
  const [specialtyFilter, setSpecialtyFilter] = useState('ALL')
  const { data } = useDashboardData()

  if (!data) return null
  const { doctors } = data

  const rows =
    specialtyFilter === 'ALL'
      ? doctors.bySpecialty
      : doctors.bySpecialty.filter((r) => r.specialty.toLowerCase().includes(specialtyFilter.toLowerCase()))

  const totalInFilter = rows.reduce((sum, r) => sum + r.count, 0)
  const maxCount = Math.max(...rows.map((r) => r.count), 1)

  return (
    <SectionCard
      icon={FiActivity}
      iconGradient="linear-gradient(135deg, var(--qms-teal), #0ea5e9)"
      title="Doctors"
      subtitle={`${rows.length} specialty bucket(s) shown`}
    >
      <div className="grid gap-2.5 mb-4" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))' }}>
        <MiniKpiCard label="Total Doctors" data={doctors.total} />
        <MiniKpiCard label="In Current Filter" data={{ v: totalInFilter }} />
      </div>

      <FilterChips options={SPECIALTY_FILTERS} active={specialtyFilter} onChange={setSpecialtyFilter} />

      <h3 className="text-[12px] font-bold uppercase tracking-wider mb-2" style={{ color: 'var(--qms-text-muted)' }}>
        Specialty bifurcation
      </h3>
      {rows.map((row) => {
        const delta = row.ly ? ((row.count - row.ly) / row.ly) * 100 : 0
        return (
          <BarListRow
            key={row.specialty}
            label={row.specialty}
            value={`${row.count} · ${delta >= 0 ? '+' : ''}${formatPercent(delta, 1)} vs LY`}
            share={(row.count / maxCount) * 100}
            gradient="linear-gradient(90deg, var(--qms-teal), #0ea5e9)"
            onClick={() => onDrill(row.specialty, `${row.count} doctors · ${formatPercent((row.count / (doctors.total.v || 1)) * 100, 1)} of total`)}
          />
        )
      })}
    </SectionCard>
  )
}

export default DoctorsSection
