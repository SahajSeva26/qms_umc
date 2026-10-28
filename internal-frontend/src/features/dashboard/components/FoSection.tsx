import { useMemo } from 'react'
import { FiNavigation } from 'react-icons/fi'
import { usePermission } from '@/hooks/usePermission'
import { useDashboardData } from '@/features/dashboard/hooks/useDashboardData'
import { useCampMonthlyReportData } from '@/features/dashboard/hooks/useCampMonthlyReport'
import { buildFoRegionalSpread, buildFoTimeSlotBifurcation } from '@/features/dashboard/dashboard.foCampStats'
import SectionCard from '@/features/dashboard/components/SectionCard'
import MiniKpiCard from '@/features/dashboard/components/MiniKpiCard'
import BarListRow from '@/features/dashboard/components/BarListRow'
import EmptyLiveData from '@/features/dashboard/components/EmptyLiveData'

// Same gate as CampReportSection — both derive from the identical real-camps-this-year dataset.
const CAMP_DATA_PERMISSIONS = ['camp:manage', 'tenant:manage']

const FoSection = () => {
  const { hasAnyPermission } = usePermission()
  const canViewCampData = hasAnyPermission(CAMP_DATA_PERMISSIONS)
  const { data } = useDashboardData()
  const { data: camps } = useCampMonthlyReportData(canViewCampData)

  // Diet camps are staffed by a dietitian, not an FO (camp.fo is null on them) — excluded here.
  const foCamps = useMemo(() => (camps ?? []).filter((c) => c.fo !== null), [camps])
  const regionalSpread = useMemo(() => buildFoRegionalSpread(foCamps), [foCamps])
  const timeSlots = useMemo(() => buildFoTimeSlotBifurcation(foCamps), [foCamps])
  const maxRegionShare = Math.max(...regionalSpread.map((r) => r.share), 1)
  const maxSlotCount = Math.max(...timeSlots.map((s) => s.count), 1)

  if (!data) return null
  const { fo } = data

  return (
    <SectionCard
      icon={FiNavigation}
      iconGradient="linear-gradient(135deg, #10b981, var(--qms-teal))"
      title="Field Officers · summary"
      subtitle="Headcount, productivity, performance bands"
    >
      <div className="grid gap-2.5 mb-4" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))' }}>
        <MiniKpiCard label="Occupancy Rate" data={fo.occupancyRate} />
        <MiniKpiCard label="Efficiency Rate" data={fo.efficiencyRate} />
        <MiniKpiCard label="Active FOs" data={fo.activeFOs} />
      </div>

      <div className="grid md:grid-cols-2 gap-5">
        <div>
          <h3 className="text-[12px] font-bold uppercase tracking-wider mb-2" style={{ color: 'var(--qms-text-muted)' }}>
            Regional spread
          </h3>
          {!canViewCampData || regionalSpread.length === 0 ? (
            <EmptyLiveData />
          ) : (
            regionalSpread.map((r) => (
              <BarListRow
                key={r.region}
                label={r.region}
                value={`${r.fos} FO · ${r.camps}`}
                share={(r.share / maxRegionShare) * 100}
                gradient="linear-gradient(90deg, var(--qms-brand), var(--qms-teal))"
              />
            ))
          )}
        </div>

        <div>
          <h3 className="text-[12px] font-bold uppercase tracking-wider mb-2" style={{ color: 'var(--qms-text-muted)' }}>
            Camp time bifurcation
          </h3>
          {!canViewCampData || timeSlots.every((s) => s.count === 0) ? (
            <EmptyLiveData />
          ) : (
            timeSlots.map((s) => (
              <BarListRow
                key={s.slot}
                label={s.slot}
                value={`${s.count} · ${s.share}%`}
                share={(s.count / maxSlotCount) * 100}
                gradient="linear-gradient(90deg, var(--qms-brand), #7c5cff)"
              />
            ))
          )}
        </div>
      </div>
    </SectionCard>
  )
}

export default FoSection
