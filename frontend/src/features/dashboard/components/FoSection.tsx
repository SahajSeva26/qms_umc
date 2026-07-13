import { useState } from 'react'
import { FiNavigation } from 'react-icons/fi'
import { useDashboardData } from '@/features/dashboard/hooks/useDashboardData'
import SectionCard from '@/features/dashboard/components/SectionCard'
import MiniKpiCard from '@/features/dashboard/components/MiniKpiCard'
import BarListRow from '@/features/dashboard/components/BarListRow'
import FilterChips from '@/features/dashboard/components/FilterChips'

const REGION_FILTERS = ['ALL', 'WEST', 'SOUTH', 'NORTH', 'EAST', 'CENTRAL']

interface FoSectionProps {
  onDrill: (title: string, content: string) => void
}

const FoSection = ({ onDrill }: FoSectionProps) => {
  const [regionFilter, setRegionFilter] = useState('ALL')
  const { data } = useDashboardData()

  if (!data) return null
  const { fo } = data

  const regions =
    regionFilter === 'ALL'
      ? fo.regionalSpread
      : fo.regionalSpread.filter((r) => r.region.toUpperCase().startsWith(regionFilter))

  const topFo = fo.topFOs[0]

  return (
    <SectionCard
      icon={FiNavigation}
      iconGradient="linear-gradient(135deg, #10b981, var(--qms-teal))"
      title="Field Officers · summary"
      subtitle="Productivity, efficiency, performance bands"
    >
      <div className="grid gap-2.5 mb-4" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))' }}>
        <MiniKpiCard label="Occupancy Rate" data={fo.occupancyRate} />
        <MiniKpiCard label="Efficiency Rate" data={fo.efficiencyRate} />
        <MiniKpiCard label="Active FOs" data={fo.activeFOs} />
        <MiniKpiCard label="Top Performer" data={{ v: topFo.camps }} suffix={`· ${topFo.name}`} />
      </div>

      <FilterChips options={REGION_FILTERS} active={regionFilter} onChange={setRegionFilter} />

      <div className="grid md:grid-cols-2 gap-5">
        <div>
          <h3 className="text-[12px] font-bold uppercase tracking-wider mb-2" style={{ color: 'var(--qms-text-muted)' }}>
            Regional spread
          </h3>
          {regions.map((r) => (
            <BarListRow
              key={r.region}
              label={r.region}
              value={`${r.fos} FO · ${r.camps}`}
              share={r.share}
              gradient="linear-gradient(90deg, var(--qms-brand), var(--qms-teal))"
              onClick={() => onDrill(r.region, `${r.fos} FOs · ${r.camps} camps · ${r.share}% share`)}
            />
          ))}

          <h3 className="text-[12px] font-bold uppercase tracking-wider mt-4 mb-2" style={{ color: 'var(--qms-text-muted)' }}>
            Camp time bifurcation
          </h3>
          {fo.campTimeBifurcation.map((slot) => (
            <BarListRow
              key={slot.slot}
              label={slot.slot}
              value={`${slot.count} · ${slot.share}%`}
              share={slot.share}
              gradient="linear-gradient(90deg, var(--qms-brand), #7c5cff)"
            />
          ))}
        </div>

        <div>
          <h3 className="text-[12px] font-bold uppercase tracking-wider mb-2" style={{ color: 'var(--qms-text-muted)' }}>
            Top FOs
          </h3>
          <div className="space-y-1">
            {fo.topFOs.map((officer) => (
              <button
                key={officer.name}
                onClick={() => onDrill(officer.name, `${officer.hq} · ${officer.camps} camps · Occ ${officer.occ}% · Eff ${officer.eff}% · ★ ${officer.fb}`)}
                className="w-full grid grid-cols-[1fr_auto_auto_auto_auto] gap-3 items-center py-2 text-left transition-colors hover:bg-(--qms-surface-hover) rounded-lg px-1.5 -mx-1.5"
                style={{ borderBottom: '1px dashed var(--qms-border)' }}
              >
                <div className="min-w-0">
                  <div className="text-[13px] font-semibold truncate" style={{ color: 'var(--qms-text)' }}>{officer.name}</div>
                  <div className="text-[11px] truncate" style={{ color: 'var(--qms-text-muted)' }}>{officer.hq}</div>
                </div>
                <div className="text-[12px] font-bold tabular-nums" style={{ color: 'var(--qms-text)' }}>{officer.camps}</div>
                <div className="text-[12px] tabular-nums" style={{ color: 'var(--qms-text-muted)' }}>{officer.occ}% occ</div>
                <div className="text-[12px] tabular-nums" style={{ color: 'var(--qms-text-muted)' }}>{officer.eff}% eff</div>
                <div className="text-[12px] font-bold tabular-nums" style={{ color: 'var(--warning)' }}>★ {officer.fb}</div>
              </button>
            ))}
          </div>
        </div>
      </div>
    </SectionCard>
  )
}

export default FoSection
