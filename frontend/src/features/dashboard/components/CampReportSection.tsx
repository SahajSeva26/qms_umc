import { useMemo, useState } from 'react'
import { FiMapPin, FiCalendar, FiGrid } from 'react-icons/fi'
import { useAuth } from '@/hooks/useAuth'
import { useCampsData } from '@/hooks/useCampsData'
import { CLIENTS } from '@/types/client.types'
import {
  buildCampReport,
  canViewCampReport,
  scopedClientIds,
  MONTHS,
  type CampReportType,
  type CampReportView,
} from '@/features/dashboard/dashboard.camp-report'
import SectionCard from '@/features/dashboard/components/SectionCard'

const COL = { Diet: '#10b981', Screening: '#3b6dff' }

function scopeLabel(clientIds: Set<string> | null): string {
  if (!clientIds) return 'All accounts'
  const names = CLIENTS.filter((c) => clientIds.has(c.id)).map((c) => c.name)
  return names.length ? `Your accounts: ${names.join(', ')}` : 'No accounts assigned'
}

interface KpiTileProps {
  label: string
  value: number
  sub: string
  color: string
}

const KpiTile = ({ label, value, sub, color }: KpiTileProps) => (
  <div className="flex-1 min-w-[120px] rounded-[10px] border px-3 py-2.5" style={{ borderColor: 'var(--qms-border)', background: 'var(--qms-surface)' }}>
    <div className="text-[10px] font-bold uppercase tracking-wide" style={{ color: 'var(--qms-text-muted)' }}>{label}</div>
    <div className="text-[20px] font-extrabold mt-0.5" style={{ color }}>{value.toLocaleString('en-IN')}</div>
    <div className="text-[11px]" style={{ color: 'var(--qms-text-muted)' }}>{sub}</div>
  </div>
)

interface StackedBarProps {
  parts: { value: number; color: string; projected?: boolean }[]
  max: number
  height: number
}

const StackedBar = ({ parts, max, height }: StackedBarProps) => (
  <div className="flex flex-col-reverse justify-start w-full" style={{ height }}>
    {parts.map((p, i) => {
      if (!p.value) return null
      const h = max ? Math.round((p.value / max) * height) : 0
      return (
        <div
          key={i}
          title={String(p.value)}
          className="rounded-t-[3px]"
          style={{
            height: h,
            background: p.color,
            opacity: p.projected ? 0.4 : 1,
            backgroundImage: p.projected ? 'repeating-linear-gradient(45deg, rgba(255,255,255,.5) 0 3px, transparent 3px 6px)' : undefined,
          }}
        />
      )
    })}
  </div>
)

const CampReportSection = () => {
  const { user } = useAuth()
  const { camps } = useCampsData()
  const [type, setType] = useState<CampReportType>('ALL')
  const [view, setView] = useState<CampReportView>('month')

  const clientIds = useMemo(() => scopedClientIds(user?.role, undefined), [user?.role])
  const report = useMemo(() => buildCampReport(camps, type, clientIds), [camps, type, clientIds])

  if (!canViewCampReport(user?.role)) return null

  const H = view === 'month' ? 120 : 110
  const { curM, daysInCurM, dayElapsed } = report

  let maxVal = 1
  if (view === 'month') {
    report.monthly.forEach((o, m) => {
      const v = m <= curM ? report.tot(o) : Math.round(type === 'ALL' ? report.avg3('Diet') + report.avg3('Screening') : report.avg3(type as 'Diet' | 'Screening'))
      if (v > maxVal) maxVal = v
    })
  } else {
    for (let d = 1; d <= daysInCurM; d++) {
      const v = report.tot(report.perDay[d])
      if (v > maxVal) maxVal = v
    }
  }

  const typeBtn = (id: CampReportType, label: string) => (
    <button
      key={id}
      onClick={() => setType(id)}
      className="px-2.5 py-1 rounded-lg text-[11px] font-semibold border transition-colors"
      style={type === id ? { background: 'var(--qms-brand)', color: '#fff', borderColor: 'var(--qms-brand)' } : { borderColor: 'var(--qms-border)', color: 'var(--qms-text-soft)' }}
    >
      {label}
    </button>
  )

  const viewBtn = (id: CampReportView, label: string, Icon: typeof FiCalendar) => (
    <button
      key={id}
      onClick={() => setView(id)}
      className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-semibold border transition-colors"
      style={view === id ? { background: 'var(--qms-brand)', color: '#fff', borderColor: 'var(--qms-brand)' } : { borderColor: 'var(--qms-border)', color: 'var(--qms-text-soft)' }}
    >
      <Icon size={12} /> {label}
    </button>
  )

  return (
    <SectionCard
      icon={FiMapPin}
      iconGradient="linear-gradient(135deg, #3b6dff, #14b8a6)"
      title="Camp report — Diet & Screening"
      subtitle={scopeLabel(clientIds)}
      headerAction={
        <div className="flex gap-2 flex-wrap">
          <div className="flex gap-1">{(['ALL', 'Diet', 'Screening'] as CampReportType[]).map((id) => typeBtn(id, id === 'ALL' ? 'All' : id))}</div>
          <div className="flex gap-1">
            {viewBtn('month', 'Month', FiCalendar)}
            {viewBtn('day', 'Day', FiGrid)}
          </div>
        </div>
      }
    >
      <div className="flex gap-2 flex-wrap mb-3">
        <KpiTile label="This month (so far)" value={report.kpis.curMonthActual} sub={`projected ${report.kpis.curMonthProjected}`} color="var(--qms-text)" />
        <KpiTile label="Last month" value={report.kpis.lastMonth} sub="actual" color="var(--qms-text-muted)" />
        <KpiTile label="Next month (proj)" value={report.kpis.nextMonthProj} sub="run-rate forecast" color="#a16207" />
        <KpiTile label="YTD actual" value={report.kpis.ytd} sub={`Jan–${MONTHS[curM]}`} color="#0f766e" />
        <KpiTile label="Full-year (proj)" value={report.kpis.yearProj} sub="YTD + forecast" color="var(--qms-brand)" />
      </div>

      <div className="flex items-center gap-3.5 mb-1 text-[11px]">
        <span className="flex items-center gap-1.5" style={{ color: 'var(--qms-text-soft)' }}>
          <span className="w-2.5 h-2.5 rounded-[3px]" style={{ background: COL.Screening }} /> Screening
        </span>
        <span className="flex items-center gap-1.5" style={{ color: 'var(--qms-text-soft)' }}>
          <span className="w-2.5 h-2.5 rounded-[3px]" style={{ background: COL.Diet }} /> Diet
        </span>
      </div>

      {view === 'month' ? (
        <>
          <div className="flex gap-1 items-end px-0.5 py-2">
            {report.monthly.map((o, m) => {
              const projected = m > curM
              let parts: { value: number; color: string; projected?: boolean }[]
              if (projected) {
                const pd = Math.round(report.avg3('Diet'))
                const ps = Math.round(report.avg3('Screening'))
                parts = type === 'ALL'
                  ? [{ value: pd, color: COL.Diet, projected: true }, { value: ps, color: COL.Screening, projected: true }]
                  : [{ value: Math.round(report.avg3(type as 'Diet' | 'Screening')), color: COL[type as 'Diet' | 'Screening'], projected: true }]
              } else {
                parts = type === 'ALL'
                  ? [{ value: o.Diet, color: COL.Diet }, { value: o.Screening, color: COL.Screening }]
                  : [{ value: o[type as 'Diet' | 'Screening'], color: COL[type as 'Diet' | 'Screening'] }]
              }
              const total = parts.reduce((a, p) => a + p.value, 0)
              return (
                <div key={m} className="flex-1 flex flex-col items-center gap-0.5 min-w-0">
                  <div className="text-[9px] font-bold" style={{ color: 'var(--qms-text-soft)' }}>{total || ''}</div>
                  <StackedBar parts={parts} max={maxVal} height={H} />
                  <div className="text-[9px]" style={{ color: m === curM ? 'var(--qms-brand)' : 'var(--qms-text-soft)', fontWeight: m === curM ? 800 : 600 }}>{MONTHS[m]}</div>
                </div>
              )
            })}
          </div>
          <p className="text-[11px] text-center" style={{ color: 'var(--qms-text-muted)' }}>
            Solid = actual · hatched = projection (run-rate). Current year {new Date().getFullYear()}.
          </p>
        </>
      ) : (
        <>
          <div className="flex gap-0.5 items-end px-0.5 py-2">
            {Array.from({ length: daysInCurM }, (_, i) => i + 1).map((d) => {
              const future = d > dayElapsed
              const o = report.perDay[d]
              const avgDaily = (type === 'ALL' ? report.avg3('Diet') + report.avg3('Screening') : report.avg3(type as 'Diet' | 'Screening')) / 30
              const parts: { value: number; color: string; projected?: boolean }[] = future
                ? [{ value: Math.max(0, Math.round(avgDaily)), color: type === 'Diet' ? COL.Diet : COL.Screening, projected: true }]
                : type === 'ALL'
                ? [{ value: o.Diet, color: COL.Diet }, { value: o.Screening, color: COL.Screening }]
                : [{ value: o[type as 'Diet' | 'Screening'], color: COL[type as 'Diet' | 'Screening'] }]
              return (
                <div key={d} className="flex-1 flex flex-col items-center gap-0.5 min-w-0">
                  <StackedBar parts={parts} max={maxVal} height={110} />
                  {daysInCurM <= 31 && (
                    <div className="text-[8px]" style={{ color: d === dayElapsed ? 'var(--qms-brand)' : 'var(--qms-text-soft)' }}>{d}</div>
                  )}
                </div>
              )
            })}
          </div>
          <p className="text-[11px] text-center" style={{ color: 'var(--qms-text-muted)' }}>
            {MONTHS[curM]} {new Date().getFullYear()} · day-by-day. Hatched = projected days.
          </p>
        </>
      )}
    </SectionCard>
  )
}

export default CampReportSection
