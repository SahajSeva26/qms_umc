import { useMemo, useState } from 'react'
import { FiMapPin, FiCalendar } from 'react-icons/fi'
import { usePermission } from '@/hooks/usePermission'
import { useCampMonthlyReportData } from '@/features/dashboard/hooks/useCampMonthlyReport'
import { buildCampMonthlyReport, MONTHS, type CampReportType, type CampReportView } from '@/features/dashboard/dashboard.campMonthlyReport'
import SectionCard from '@/features/dashboard/components/SectionCard'
import QueryStateBlock from '@/components/ui/QueryStateBlock'

// GET /camps/report requires this exact set — stricter than camp:search.
const CAMP_REPORT_PERMISSIONS = ['camp:manage', 'tenant:manage']

const COLOR: Record<'screening' | 'diet' | 'lab', string> = {
  screening: '#3b6dff',
  diet: '#10b981',
  lab: '#8b5cf6',
}

const TYPE_LABEL: Record<CampReportType, string> = {
  ALL: 'All',
  screening: 'Screening',
  diet: 'Diet',
  lab: 'Lab',
}

interface BarSegment {
  value: number
  color: string
  projected?: boolean
}

// A plain bordered card with only the value text colored — distinct from the shared KpiTile used
// elsewhere on the Dashboard, which camp-report.js's own prototype equivalent doesn't use here.
const ReportKpiTile = ({ label, value, sub, color }: { label: string; value: string; sub?: string; color: string }) => (
  <div className="flex-1 min-w-30 rounded-[10px] border p-2.5" style={{ borderColor: 'var(--qms-border)', background: 'var(--qms-surface)' }}>
    <div className="text-[10px] font-bold uppercase tracking-wide" style={{ color: 'var(--qms-text-muted)' }}>{label}</div>
    <div className="text-[20px] font-extrabold mt-0.5" style={{ color }}>{value}</div>
    {sub && <div className="text-[11px]" style={{ color: 'var(--qms-text-muted)' }}>{sub}</div>}
  </div>
)

const StackedBar = ({ segments, max, height }: { segments: BarSegment[]; max: number; height: number }) => (
  <div className="flex flex-col-reverse w-full" style={{ height }}>
    {segments.map((seg, i) =>
      seg.value > 0 ? (
        <div
          key={i}
          title={String(seg.value)}
          className="rounded-t-[3px]"
          style={{
            height: max ? Math.round((seg.value / max) * height) : 0,
            background: seg.color,
            opacity: seg.projected ? 0.4 : 1,
            backgroundImage: seg.projected
              ? 'repeating-linear-gradient(45deg, rgba(255,255,255,.5) 0 3px, transparent 3px 6px)'
              : undefined,
          }}
        />
      ) : null,
    )}
  </div>
)

const CampReportSection = () => {
  const { hasAnyPermission } = usePermission()
  const canView = hasAnyPermission(CAMP_REPORT_PERMISSIONS)
  const [type, setType] = useState<CampReportType>('ALL')
  const [view, setView] = useState<CampReportView>('month')

  const { data, isLoading, isError, refetch } = useCampMonthlyReportData(canView)

  const report = useMemo(() => buildCampMonthlyReport(data ?? [], type), [data, type])

  if (!canView) return null

  const { monthly, perDay, curM, daysInCurM, dayElapsed, tot, avg3, kpis } = report
  const year = new Date().getFullYear()

  const H = view === 'month' ? 120 : 110
  // StackedBar uses flex-col-reverse, so array order 0..n maps to bottom..top (Diet, Screening, Lab).
  const stackOrder: ('screening' | 'diet' | 'lab')[] = type === 'ALL' ? ['diet', 'screening', 'lab'] : [type]
  const legendOrder: ('screening' | 'diet' | 'lab')[] = type === 'ALL' ? ['screening', 'diet', 'lab'] : [type]

  const segmentsFor = (bucket: { screening: number; diet: number; lab: number }, projected: boolean): BarSegment[] =>
    stackOrder.map((t) => ({ value: bucket[t], color: COLOR[t], projected }))

  let monthMax = 1
  monthly.forEach((bucket, m) => {
    const v = m <= curM ? tot(bucket, type) : Math.round(avg3(type))
    if (v > monthMax) monthMax = v
  })

  let dayMax = 1
  for (let d = 1; d <= daysInCurM; d++) {
    const v = tot(perDay[d], type)
    if (v > dayMax) dayMax = v
  }
  const avgDaily = avg3(type) / 30

  return (
    <SectionCard
      icon={FiMapPin}
      iconGradient="linear-gradient(135deg, #3b6dff, #14b8a6)"
      title="Camp report — Screening, Diet & Lab"
      subtitle="In your access scope"
      headerAction={
        <div className="flex gap-2 flex-wrap">
          <div className="flex gap-1">
            {(['ALL', 'screening', 'diet', 'lab'] as CampReportType[]).map((t) => (
              <button
                key={t}
                onClick={() => setType(t)}
                className="px-2.5 py-1 rounded-lg text-[11px] font-semibold border transition-all"
                style={
                  type === t
                    ? { background: 'var(--qms-brand)', borderColor: 'var(--qms-brand)', color: '#fff' }
                    : { background: 'var(--qms-surface-strong)', borderColor: 'var(--qms-border)', color: 'var(--qms-text-muted)' }
                }
              >
                {TYPE_LABEL[t]}
              </button>
            ))}
          </div>
          <div className="flex gap-1">
            {([
              { id: 'month' as const, label: 'Month' },
              { id: 'day' as const, label: 'Day' },
            ]).map((v) => (
              <button
                key={v.id}
                onClick={() => setView(v.id)}
                className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-semibold border transition-all"
                style={
                  view === v.id
                    ? { background: 'var(--qms-brand)', borderColor: 'var(--qms-brand)', color: '#fff' }
                    : { background: 'var(--qms-surface-strong)', borderColor: 'var(--qms-border)', color: 'var(--qms-text-muted)' }
                }
              >
                <FiCalendar size={12} /> {v.label}
              </button>
            ))}
          </div>
        </div>
      }
    >
      <QueryStateBlock isLoading={isLoading} error={isError} loadingLabel="Loading camp report…" errorLabel="Failed to load camp report." onRetry={refetch}>
        <div className="flex gap-2 flex-wrap mb-3">
          <ReportKpiTile label="This month (so far)" value={String(kpis.curMonthActual)} sub={`projected ${kpis.curMonthProjected}`} color="#0f172a" />
          <ReportKpiTile label="Last month" value={String(kpis.lastMonth)} sub="actual" color="#64748b" />
          <ReportKpiTile label="Next month (proj)" value={String(kpis.nextMonthProj)} sub="run-rate forecast" color="#a16207" />
          <ReportKpiTile label="YTD actual" value={String(kpis.ytd)} sub={`Jan–${MONTHS[curM]}`} color="#0f766e" />
          <ReportKpiTile label="Full-year (proj)" value={String(kpis.yearProj)} sub="YTD + forecast" color="#1d4ed8" />
        </div>

        <div className="flex items-center gap-3.5 mb-2 text-[11px]">
          {legendOrder.map((t) => (
            <span key={t} className="flex items-center gap-1.5" style={{ color: 'var(--qms-text-soft)' }}>
              <span className="w-2.5 h-2.5 rounded-[3px] shrink-0" style={{ background: COLOR[t] }} />
              {TYPE_LABEL[t]}
            </span>
          ))}
        </div>

        {view === 'month' ? (
          <>
            <div className="flex gap-1 items-end px-0.5 py-2">
              {monthly.map((bucket, m) => {
                const isProjected = m > curM
                const segments = isProjected
                  ? stackOrder.map((t) => ({ value: Math.round(avg3(t)), color: COLOR[t], projected: true }))
                  : segmentsFor(bucket, false)
                const total = segments.reduce((sum, s) => sum + s.value, 0)
                return (
                  <div key={m} className="flex-1 flex flex-col items-center gap-0.5 min-w-0">
                    <div className="text-[9px] font-bold" style={{ color: 'var(--qms-text-soft)' }}>{total || ''}</div>
                    <StackedBar segments={segments} max={monthMax} height={H} />
                    <div
                      className="text-[9px]"
                      style={{ color: m === curM ? 'var(--qms-brand)' : 'var(--qms-text-soft)', fontWeight: m === curM ? 800 : 600 }}
                    >
                      {MONTHS[m]}
                    </div>
                  </div>
                )
              })}
            </div>
            <p className="text-[11px] text-center" style={{ color: 'var(--qms-text-muted)' }}>
              Solid = actual · hatched = projection (run-rate). Current year {year}.
            </p>
          </>
        ) : (
          <>
            <div className="flex gap-0.5 items-end px-0.5 py-2">
              {Array.from({ length: daysInCurM }, (_, i) => i + 1).map((d) => {
                const future = d > dayElapsed
                const segments: BarSegment[] = future
                  ? [{ value: Math.max(0, Math.round(avgDaily)), color: type === 'diet' ? COLOR.diet : type === 'lab' ? COLOR.lab : COLOR.screening, projected: true }]
                  : segmentsFor(perDay[d], false)
                return (
                  <div key={d} className="flex-1 flex flex-col items-center gap-0.5 min-w-0">
                    <StackedBar segments={segments} max={dayMax} height={H} />
                    <div className="text-[8px]" style={{ color: d === dayElapsed ? 'var(--qms-brand)' : 'var(--qms-text-soft)' }}>{d}</div>
                  </div>
                )
              })}
            </div>
            <p className="text-[11px] text-center" style={{ color: 'var(--qms-text-muted)' }}>
              {MONTHS[curM]} {year} · day-by-day. Hatched = projected days.
            </p>
          </>
        )}
      </QueryStateBlock>
    </SectionCard>
  )
}

export default CampReportSection
