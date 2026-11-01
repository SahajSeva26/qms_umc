import { FiUserCheck } from 'react-icons/fi'
import { useDashboardData } from '@/features/dashboard/hooks/useDashboardData'
import SectionCard from '@/features/dashboard/components/SectionCard'
import MiniKpiCard from '@/features/dashboard/components/MiniKpiCard'
import GenderDonut from '@/features/dashboard/components/GenderDonut'
import EmptyLiveData from '@/features/dashboard/components/EmptyLiveData'

const PatientsSection = () => {
  const { data } = useDashboardData()

  if (!data) return null
  const { patients } = data

  // Both v and share must be checked — share can be null (total-count failed/zero) even when v
  // isn't, which would otherwise crash GenderDonut's arc math (share/100 * circumference => NaN).
  const hasFullGenderSplit =
    patients.male.v !== null && patients.male.share !== null &&
    patients.female.v !== null && patients.female.share !== null &&
    patients.other.v !== null && patients.other.share !== null

  return (
    <SectionCard
      icon={FiUserCheck}
      iconGradient="linear-gradient(135deg, var(--qms-role-super-admin), #ec4899)"
      title="Patients"
      subtitle="Global patient registry"
    >
      <div className="grid gap-2.5 mb-4" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))' }}>
        <MiniKpiCard label="Total Patients" data={patients.total} />
        <MiniKpiCard label="Male" data={{ v: patients.male.v }} suffix={patients.male.share !== null ? `· ${patients.male.share}%` : undefined} />
        <MiniKpiCard label="Female" data={{ v: patients.female.v }} suffix={patients.female.share !== null ? `· ${patients.female.share}%` : undefined} />
        <MiniKpiCard label="Other" data={{ v: patients.other.v }} suffix={patients.other.share !== null ? `· ${patients.other.share}%` : undefined} />
      </div>

      <h3 className="text-[12px] font-bold uppercase tracking-wider mb-2" style={{ color: 'var(--qms-text-muted)' }}>
        Gender split
      </h3>
      {hasFullGenderSplit ? (
        <GenderDonut
          slices={[
            { label: 'Male', value: patients.male.v!, share: patients.male.share!, color: '#3b6dff' },
            { label: 'Female', value: patients.female.v!, share: patients.female.share!, color: '#ec4899' },
            { label: 'Other', value: patients.other.v!, share: patients.other.share!, color: '#a855f7' },
          ]}
        />
      ) : (
        <EmptyLiveData />
      )}

      <h3 className="text-[12px] font-bold uppercase tracking-wider mt-5 mb-2" style={{ color: 'var(--qms-text-muted)' }}>
        Interpretations by project
      </h3>
      <EmptyLiveData />
    </SectionCard>
  )
}

export default PatientsSection
