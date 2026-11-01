import { FiUsers } from 'react-icons/fi'
import { useDashboardData } from '@/features/dashboard/hooks/useDashboardData'
import SectionCard from '@/features/dashboard/components/SectionCard'
import MiniKpiCard from '@/features/dashboard/components/MiniKpiCard'
import EmptyLiveData from '@/features/dashboard/components/EmptyLiveData'

const SalesSection = () => {
  const { data } = useDashboardData()

  if (!data) return null
  const { sales } = data

  return (
    <SectionCard
      icon={FiUsers}
      iconGradient="linear-gradient(135deg, var(--qms-role-logistics), #ec4899)"
      title="Sales team"
      subtitle="Pipeline counts"
    >
      <div className="grid gap-2.5 mb-4" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))' }}>
        <MiniKpiCard label="No. of Projects" data={sales.totalProjects} />
        <MiniKpiCard label="Total Billing" data={sales.totalBilling} />
        <MiniKpiCard label="Outstanding" data={sales.outstanding} />
        <MiniKpiCard label="Total Leads" data={sales.totalLeads} />
        <MiniKpiCard label="Follow-up appointments" data={sales.followUpAppointments} />
        <MiniKpiCard label="Pipeline Value" data={sales.pipelineValue} />
        <MiniKpiCard label="Lead win rate" data={sales.leadWinRate} />
      </div>

      <h3 className="text-[12px] font-bold uppercase tracking-wider mb-2" style={{ color: 'var(--qms-text-muted)' }}>
        Rep breakdown
      </h3>
      <EmptyLiveData />
    </SectionCard>
  )
}

export default SalesSection
