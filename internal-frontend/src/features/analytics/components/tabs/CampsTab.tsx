import { useMemo } from 'react'
import { FiPieChart, FiBarChart2, FiGrid, FiUsers, FiHeart } from 'react-icons/fi'
import type { Camp, CampStatus } from '@/types/camp.types'
import AnalyticsSectionCard from '@/features/analytics/components/AnalyticsSectionCard'
import Donut from '@/features/analytics/components/charts/Donut'
import BarsVertical from '@/features/analytics/components/charts/BarsVertical'
import Heatmap7Day from '@/features/analytics/components/charts/Heatmap7Day'

const STATUS_COLORS: Record<CampStatus, string> = {
  LIVE: '#3b6dff',
  CONFIRMED: '#0ea5e9',
  CLOSED: '#10b981',
  REQUESTED: '#94a3b8',
  SCHEDULED: '#3b6dff',
  CANCELLED: '#f59e0b',
  CANCELLED_CHARGED: '#f43f5e',
  COMPLETE: '#059669',
  COMPLETE_WITHOUT_REPORT: '#d97706',
  INCOMPLETE: '#dc2626',
}

const TYPE_COLORS = { Screening: '#3b6dff', Diet: '#10b981', Lab: '#8b5cf6' }
const RISK_COLORS = { NORMAL: '#10b981', MILD: '#3b6dff', MODERATE: '#f59e0b', SEVERE: '#f43f5e' }

interface CampsTabProps {
  camps: Camp[]
}

const CampsTab = ({ camps }: CampsTabProps) => {
  const statusMix = useMemo(() => {
    const counts = new Map<CampStatus, number>()
    for (const c of camps) counts.set(c.status, (counts.get(c.status) ?? 0) + 1)
    return [...counts.entries()].map(([status, value]) => ({
      label: status.replace(/_/g, ' '),
      value,
      color: STATUS_COLORS[status],
    }))
  }, [camps])

  const typeBars = useMemo(
    () => (['Screening', 'Diet', 'Lab'] as const).map((type) => ({ label: type, value: camps.filter((c) => c.type === type).length, color: TYPE_COLORS[type] })),
    [camps]
  )

  // Always the trailing real 7 days — the prototype's heatmap ignores the
  // period selector too, confirmed via research.
  const heatmap = useMemo(() => {
    const days = Array.from({ length: 7 }, (_, i) => {
      const d = new Date()
      d.setDate(d.getDate() - (6 - i))
      return d.toISOString().slice(0, 10)
    })
    const stateCounts = new Map<string, number>()
    for (const c of camps) stateCounts.set(c.state, (stateCounts.get(c.state) ?? 0) + 1)
    const topStates = [...stateCounts.entries()].sort(([, a], [, b]) => b - a).slice(0, 7).map(([s]) => s)
    const cells = camps
      .filter((c) => days.includes(c.date) && topStates.includes(c.state))
      .reduce((acc, c) => {
        const key = `${c.state}|${c.date}`
        acc.set(key, (acc.get(key) ?? 0) + 1)
        return acc
      }, new Map<string, number>())
    const cellList = [...cells.entries()].map(([key, count]) => {
      const [state, date] = key.split('|')
      return { state, date, count }
    })
    return { days, states: topStates, cells: cellList }
  }, [camps])

  const closedWithCloseOut = useMemo(() => camps.filter((c) => c.status === 'CLOSED' && c.closeOut), [camps])

  const genderMix = useMemo(() => {
    const male = closedWithCloseOut.reduce((sum, c) => sum + (c.closeOut?.male || 0), 0)
    const female = closedWithCloseOut.reduce((sum, c) => sum + (c.closeOut?.female || 0), 0)
    return [
      { label: 'Male', value: male, color: '#3b6dff' },
      { label: 'Female', value: female, color: '#ec4899' },
    ].filter((s) => s.value > 0)
  }, [closedWithCloseOut])

  const riskBars = useMemo(() => {
    const totals = { NORMAL: 0, MILD: 0, MODERATE: 0, SEVERE: 0 }
    for (const c of closedWithCloseOut) {
      const bands = c.closeOut?.riskBands
      if (!bands) continue
      totals.NORMAL += bands.NORMAL || 0
      totals.MILD += bands.MILD || 0
      totals.MODERATE += bands.MODERATE || 0
      totals.SEVERE += bands.SEVERE || 0
    }
    return (['NORMAL', 'MILD', 'MODERATE', 'SEVERE'] as const).map((band) => ({
      label: band.charAt(0) + band.slice(1).toLowerCase(),
      value: totals[band],
      color: RISK_COLORS[band],
    }))
  }, [closedWithCloseOut])

  return (
    <div className="grid gap-3.5" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))' }}>
      <AnalyticsSectionCard icon={FiPieChart} iconGradient="linear-gradient(135deg, var(--chart-1), var(--qms-teal))" title="Status mix" subtitle={`${camps.length} camps`}>
        <Donut slices={statusMix} centerLabel={String(camps.length)} centerSub="camps" />
      </AnalyticsSectionCard>

      <AnalyticsSectionCard icon={FiBarChart2} iconGradient="linear-gradient(135deg, #10b981, var(--chart-2))" title="Camps by type" subtitle="Current filters">
        <BarsVertical bars={typeBars} />
      </AnalyticsSectionCard>

      <div className="md:col-span-2">
        <AnalyticsSectionCard icon={FiGrid} iconGradient="linear-gradient(135deg, var(--chart-3), #a855f7)" title="State activity · last 7 days" subtitle="Not filtered by period selector">
          <Heatmap7Day states={heatmap.states} days={heatmap.days} cells={heatmap.cells} />
        </AnalyticsSectionCard>
      </div>

      <AnalyticsSectionCard icon={FiUsers} iconGradient="linear-gradient(135deg, #ec4899, var(--chart-3))" title="Gender bifurcation" subtitle={`${closedWithCloseOut.length} closed w/ close-out`}>
        <Donut slices={genderMix} centerLabel={String(closedWithCloseOut.length)} centerSub="camps" />
      </AnalyticsSectionCard>

      <AnalyticsSectionCard icon={FiHeart} iconGradient="linear-gradient(135deg, #f59e0b, #f43f5e)" title="Risk bifurcation" subtitle="Across closed camps with close-out data">
        <BarsVertical bars={riskBars} />
      </AnalyticsSectionCard>
    </div>
  )
}

export default CampsTab
