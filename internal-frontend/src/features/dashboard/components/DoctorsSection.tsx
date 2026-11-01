import { FiActivity } from 'react-icons/fi'
import { useDashboardData } from '@/features/dashboard/hooks/useDashboardData'
import SectionCard from '@/features/dashboard/components/SectionCard'
import MiniKpiCard from '@/features/dashboard/components/MiniKpiCard'
import BarListRow from '@/features/dashboard/components/BarListRow'
import EmptyLiveData from '@/features/dashboard/components/EmptyLiveData'

const DoctorsSection = () => {
  const { data } = useDashboardData()

  if (!data) return null
  const { doctors } = data

  const maxCount = Math.max(...doctors.bySpecialty.map((s) => s.count), 1)

  return (
    <SectionCard
      icon={FiActivity}
      iconGradient="linear-gradient(135deg, var(--qms-teal), #0ea5e9)"
      title="Doctors"
      subtitle="Doctor count in your access scope"
    >
      <div className="grid gap-2.5 mb-4" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))' }}>
        <MiniKpiCard label="Total Doctors" data={doctors.total} />
      </div>

      <h3 className="text-[12px] font-bold uppercase tracking-wider mb-2" style={{ color: 'var(--qms-text-muted)' }}>
        Specialty bifurcation
      </h3>
      {doctors.bySpecialty.length === 0 ? (
        <EmptyLiveData />
      ) : (
        doctors.bySpecialty.map((row) => (
          <BarListRow
            key={row.specialty}
            label={row.specialty}
            value={String(row.count)}
            share={(row.count / maxCount) * 100}
            gradient="linear-gradient(90deg, var(--qms-teal), #0ea5e9)"
          />
        ))
      )}
    </SectionCard>
  )
}

export default DoctorsSection
