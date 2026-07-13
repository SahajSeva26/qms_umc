import { useState } from 'react'
import { useAuth } from '@/hooks/useAuth'
import { useDashboardFilters } from '@/features/dashboard/hooks/useDashboardFilters'
import FilterBar from '@/features/dashboard/components/FilterBar'
import TopKpiStrip from '@/features/dashboard/components/TopKpiStrip'
import CompanySection from '@/features/dashboard/components/CompanySection'
import ProjectsSection from '@/features/dashboard/components/ProjectsSection'
import FoSection from '@/features/dashboard/components/FoSection'
import SalesSection from '@/features/dashboard/components/SalesSection'
import AccountsSection from '@/features/dashboard/components/AccountsSection'
import DoctorsSection from '@/features/dashboard/components/DoctorsSection'
import PatientsSection from '@/features/dashboard/components/PatientsSection'
import SalesCommandCenter from '@/features/dashboard/components/SalesCommandCenter'
import SideDrawer from '@/components/ui/SideDrawer'
import { getGreeting } from '@/utils/formatters'

const DashboardPage = () => {
  const { user } = useAuth()
  const { filters, setFilter, reset } = useDashboardFilters()
  const [drill, setDrill] = useState<{ title: string; content: string } | null>(null)

  const onDrill = (title: string, content: string) => setDrill({ title, content })

  return (
    <div className="max-w-7xl">
      <div className="mb-4">
        <h1 className="text-2xl font-bold" style={{ color: 'var(--qms-text)' }}>
          {getGreeting()}, {user?.firstName ?? 'there'} 👋
        </h1>
        <p className="text-[13px] mt-1" style={{ color: 'var(--qms-text-muted)' }}>
          Operations · Admin Command Center
        </p>
      </div>

      <FilterBar filters={filters} setFilter={setFilter} reset={reset} />

      <TopKpiStrip filters={filters} />

      <CompanySection onDrill={onDrill} />
      <ProjectsSection onDrill={onDrill} />
      <FoSection onDrill={onDrill} />
      <SalesSection onDrill={onDrill} />
      <AccountsSection onDrill={onDrill} />
      <DoctorsSection onDrill={onDrill} />
      <PatientsSection onDrill={onDrill} />

      {user?.role === 'super_admin' && <SalesCommandCenter />}

      <SideDrawer open={!!drill} title={drill?.title ?? ''} onClose={() => setDrill(null)}>
        <p className="text-[13px] leading-relaxed" style={{ color: 'var(--qms-text-soft)' }}>
          {drill?.content}
        </p>
      </SideDrawer>
    </div>
  )
}

export default DashboardPage
