import { useMemo, useState } from 'react'
import { FiFilter, FiX, FiDownload, FiMapPin, FiUsers } from 'react-icons/fi'
import type { Camp } from '@/types/camp.types'
import type { Person } from '@/types/people.types'
import type { DeviceCatalogItem } from '@/types/device.types'
import type { ExpenseStatus, FoEnrollment, DietitianEnrollment, DietitianRateEntry } from '@/features/om/om.types'
import {
  campStatus, campsOfType, expensesOfType, dietitianExpensesOfType, auditIssues,
} from '@/features/om/om.service'
import {
  dailyDietCampCounts, pendingByPharma, isBcaCamp, bcaByLocation, remunerationByDietitian, mrWiseCampCount, toCsv, downloadCsv,
} from '@/features/om/om.dietDashboard'
import KpiTile from '@/components/ui/KpiTile'
import DoBar from '@/features/dedicatedops/components/DoBar'
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select'
import { Button } from '@/components/ui/button'
import { clientName } from '@/types/campref.types'
import { formatINR } from '@/utils/formatters'

interface DashboardTabProps {
  camps: Camp[]
  mode: 'Screening' | 'Diet'
  fos: Person[]
  dietitians: Person[]
  devices: DeviceCatalogItem[]
  expenseOverlay: Record<string, ExpenseStatus>
  rateHistory: Record<string, DietitianRateEntry[]>
  foEnrollments: FoEnrollment[]
  dietEnrollments: DietitianEnrollment[]
  onGoTab: (tab: string) => void
}

const STATUS_ORDER = ['UPCOMING', 'ONGOING', 'OVERDUE', 'COMPLETED', 'REQUESTED', 'CANCELLED'] as const
const STATUS_COLOR: Record<string, string> = {
  REQUESTED: '#94a3b8', UPCOMING: '#3b6dff', ONGOING: '#10b981', COMPLETED: '#14b8a6', OVERDUE: '#f43f5e', CANCELLED: '#f59e0b',
}
const STATUS_LABEL: Record<string, string> = {
  REQUESTED: 'Requested', UPCOMING: 'Upcoming', ONGOING: 'Ongoing', COMPLETED: 'Completed', OVERDUE: 'Overdue', CANCELLED: 'Cancelled',
}
const ACCENT: Record<'Screening' | 'Diet', string> = { Screening: '#3b6dff', Diet: '#10b981' }

// Mirrors tabDashboard() exactly (om-portal.js:471-575), plus the Diet-only
// 6-panel sub-dashboard from renderDietDashboardSections() (om-portal.js:581-743).
const DashboardTab = ({ camps, mode, fos, dietitians, devices, expenseOverlay, rateHistory, foEnrollments, dietEnrollments, onGoTab }: DashboardTabProps) => {
  const isDiet = mode === 'Diet'
  const accent = ACCENT[mode]
  const subjLabel = isDiet ? 'Dietitian' : 'FO'

  const [clientFilter, setClientFilter] = useState('ALL')
  const [subjFilter, setSubjFilter] = useState('ALL')

  const allOfType = campsOfType(camps, mode)
  const scopedCamps = allOfType.filter((c) => {
    if (clientFilter !== 'ALL' && c.clientId !== clientFilter) return false
    const subjId = isDiet ? c.dietitianId : c.foId
    if (subjFilter !== 'ALL' && subjId !== subjFilter) return false
    return true
  })

  const statusCounts: Record<string, number> = {}
  scopedCamps.forEach((c) => { const s = campStatus(c); statusCounts[s] = (statusCounts[s] ?? 0) + 1 })

  let expenses = isDiet ? dietitianExpensesOfType(camps, expenseOverlay, rateHistory, dietitians) : expensesOfType(camps, expenseOverlay, mode, fos)
  if (clientFilter !== 'ALL') expenses = expenses.filter((e) => e.clientId === clientFilter)
  if (subjFilter !== 'ALL') expenses = expenses.filter((e) => (isDiet ? e.dietitianId : e.foId) === subjFilter)
  const totalExp = expenses.reduce((a, e) => a + e.total, 0)
  const pendingExp = expenses.filter((e) => e.status === 'PENDING')
  const outstanding = expenses.filter((e) => e.status === 'APPROVED').reduce((a, e) => a + e.total, 0)

  const audit = auditIssues(allOfType)
  const pendingEnroll = isDiet
    ? dietEnrollments.filter((d) => d.status === 'PENDING' || d.status === 'SUBMITTED').length
    : foEnrollments.filter((f) => f.status === 'PENDING').length
  const unassigned = allOfType.filter((c) => {
    const subjId = isDiet ? c.dietitianId : c.foId
    return !subjId && c.status !== 'CANCELLED' && c.status !== 'CANCELLED_CHARGED'
  }).length

  const clientIds = [...new Set(allOfType.map((c) => c.clientId).filter(Boolean))]
  const subjIds = [...new Set(allOfType.map((c) => (isDiet ? c.dietitianId : c.foId)).filter((id): id is string => !!id))]
  const subjName = (id: string) => (isDiet ? dietitians.find((d) => d.id === id)?.name : fos.find((f) => f.id === id)?.name) ?? id

  const sMax = Math.max(1, ...STATUS_ORDER.map((s) => statusCounts[s] ?? 0))

  // Expense by reportee (top 6)
  const expBySubj: Record<string, number> = {}
  expenses.forEach((e) => { const k = isDiet ? e.dietitianId : e.foId; if (k) expBySubj[k] = (expBySubj[k] ?? 0) + e.total })
  const subjRank = Object.keys(expBySubj).sort((a, b) => expBySubj[b] - expBySubj[a]).slice(0, 6)
  const expMax = Math.max(1, ...subjRank.map((f) => expBySubj[f]))

  const expenseTitle = isDiet ? 'Dietitian remuneration' : 'Total FO expense'
  const enrollTitle = isDiet ? 'Dietitian enrollment pipeline' : 'FO enrollment pipeline'
  const reporteeTitle = isDiet ? 'Dietitian remuneration — top reportees' : 'FO expense — top reportees'
  const expSub = isDiet ? `Per-camp remuneration + travel, ${mode} camps` : `Travel + daily allowance + misc, ${mode} camps`

  // ── Diet-only sub-dashboard data ──────────────────────────────────────────
  const dietCamps = useMemo(() => camps.filter((c) => c.type === 'Diet'), [camps])
  const daily = useMemo(() => (isDiet ? dailyDietCampCounts(dietCamps) : null), [isDiet, dietCamps])
  const pharmaRows = useMemo(() => (isDiet ? pendingByPharma(dietCamps) : []), [isDiet, dietCamps])
  const bcaCamps = useMemo(() => (isDiet ? dietCamps.filter((c) => isBcaCamp(c, devices)) : []), [isDiet, dietCamps, devices])
  const bcaRows = useMemo(() => (isDiet ? bcaByLocation(bcaCamps, rateHistory, dietitians) : []), [isDiet, bcaCamps, rateHistory, dietitians])
  const remunRows = useMemo(() => (isDiet ? remunerationByDietitian(bcaCamps, rateHistory, dietitians) : []), [isDiet, bcaCamps, rateHistory, dietitians])
  const mrRows = useMemo(() => (isDiet ? mrWiseCampCount(dietCamps) : []), [isDiet, dietCamps])
  const dayMax = daily ? Math.max(1, ...daily.dayBuckets.map((b) => b.count)) : 1
  const today = new Date().toISOString().slice(0, 10)

  const handleExport = (filename: string, rows: object[]) => {
    if (rows.length === 0) return
    downloadCsv(filename, toCsv(rows))
  }

  return (
    <div>
      {/* Filter bar */}
      <div className="flex flex-wrap items-center gap-2 rounded-xl border p-2.5 mb-4" style={{ background: 'var(--qms-surface)', borderColor: 'var(--qms-border)' }}>
        <div className="flex items-center gap-1.5 text-[13px] font-bold mr-1" style={{ color: 'var(--qms-text)' }}>
          <FiFilter size={13} /> Filters
        </div>
        <Select value={clientFilter} onValueChange={(v) => setClientFilter(v ?? 'ALL')}>
          <SelectTrigger className="max-w-56 text-[12px]"><SelectValue placeholder="All companies" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">All companies</SelectItem>
            {clientIds.map((id) => <SelectItem key={id} value={id}>{clientName(id)}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={subjFilter} onValueChange={(v) => setSubjFilter(v ?? 'ALL')}>
          <SelectTrigger className="max-w-56 text-[12px]"><SelectValue placeholder={`All ${subjLabel}s`} /></SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">All {subjLabel}s (reportees)</SelectItem>
            {subjIds.map((id) => <SelectItem key={id} value={id}>{subjName(id)}</SelectItem>)}
          </SelectContent>
        </Select>
        {(clientFilter !== 'ALL' || subjFilter !== 'ALL') && (
          <Button variant="ghost" size="sm" onClick={() => { setClientFilter('ALL'); setSubjFilter('ALL') }}>
            <FiX size={12} /> Clear
          </Button>
        )}
      </div>

      {/* 7 KPI tiles */}
      <div className="grid gap-3 mb-4" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(190px, 1fr))' }}>
        <KpiTile label="Total camps" value={String(scopedCamps.length)} sub={`${statusCounts.COMPLETED ?? 0} completed · ${statusCounts.ONGOING ?? 0} ongoing`} tone="brand" icon={FiUsers} />
        <button onClick={() => onGoTab('assign')} className="text-left">
          <KpiTile label="Unassigned camps" value={String(unassigned)} sub={`Need ${subjLabel} assignment`} tone="amber" icon={FiMapPin} />
        </button>
        <button onClick={() => onGoTab('expenses')} className="text-left">
          <KpiTile label={expenseTitle} value={formatINR(totalExp)} sub={`${expenses.length} claim${expenses.length === 1 ? '' : 's'}`} tone="violet" icon={FiUsers} />
        </button>
        <button onClick={() => onGoTab('expenses')} className="text-left">
          <KpiTile label="Pending approvals" value={String(pendingExp.length)} sub={`${formatINR(pendingExp.reduce((a, e) => a + e.total, 0))} awaiting`} tone="teal" icon={FiUsers} />
        </button>
        <button onClick={() => onGoTab('expenses')} className="text-left">
          <KpiTile label="Payment outstanding" value={formatINR(outstanding)} sub="Approved · not yet paid" tone="rose" icon={FiUsers} />
        </button>
        <button onClick={() => onGoTab('fos')} className="text-left">
          <KpiTile label={enrollTitle} value={String(pendingEnroll)} sub="Pending enrollment / approval" tone="emerald" icon={FiUsers} />
        </button>
        <button onClick={() => onGoTab('audit')} className="text-left">
          <KpiTile label="Audit issues" value={String(audit.length)} sub="Camps missing photos / report / count" tone="rose" icon={FiUsers} />
        </button>
      </div>

      {/* Camp status breakdown + expense by reportee */}
      <div className="grid gap-3" style={{ gridTemplateColumns: '1fr 1fr' }}>
        <div className="rounded-xl border p-3.5" style={{ background: 'var(--qms-surface)', borderColor: 'var(--qms-border)' }}>
          <div className="text-[13px] font-bold mb-2.5" style={{ color: 'var(--qms-text)' }}>Camp status breakdown</div>
          {STATUS_ORDER.map((s) => (
            <div key={s} className="mb-1.5">
              <div className="flex justify-between text-[11px] font-bold mb-0.5">
                <span style={{ color: STATUS_COLOR[s] }}>{STATUS_LABEL[s]}</span>
                <span style={{ color: 'var(--qms-text)' }}>{statusCounts[s] ?? 0}</span>
              </div>
              <DoBar pct={Math.round((100 * (statusCounts[s] ?? 0)) / sMax)} color={STATUS_COLOR[s]} />
            </div>
          ))}
        </div>

        <div className="rounded-xl border p-3.5" style={{ background: 'var(--qms-surface)', borderColor: 'var(--qms-border)' }}>
          <div className="flex justify-between items-baseline mb-1">
            <div className="text-[13px] font-bold" style={{ color: 'var(--qms-text)' }}>{reporteeTitle}</div>
            <span className="text-[11px]" style={{ color: 'var(--qms-text-muted)' }}>{formatINR(totalExp)} total</span>
          </div>
          <div className="text-[11px] mb-2" style={{ color: 'var(--qms-text-muted)' }}>{expSub}</div>
          {subjRank.length ? subjRank.map((f) => (
            <div key={f} className="mb-1.5">
              <div className="flex justify-between text-[12px] font-bold mb-0.5">
                <span style={{ color: 'var(--qms-text)' }}>{subjName(f)}</span>
                <span style={{ color: 'var(--qms-text-muted)' }}>{formatINR(expBySubj[f])}</span>
              </div>
              <DoBar pct={Math.round((100 * expBySubj[f]) / expMax)} color={accent} />
            </div>
          )) : (
            <p className="text-[12px]" style={{ color: 'var(--qms-text-muted)' }}>No {isDiet ? 'dietitian remuneration' : 'FO expenses'} in scope</p>
          )}
        </div>
      </div>

      {/* ── Diet-only 6-panel sub-dashboard ──────────────────────────────── */}
      {isDiet && daily && (
        <div className="mt-4">
          <div className="grid gap-2.5 mb-3.5" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(165px, 1fr))' }}>
            {[
              ['Today\'s diet camps', daily.todayCount, '#0d9488'],
              ['Last 7 days', daily.last7Count, 'var(--qms-text)'],
              ['Month-to-date', daily.monthCount, 'var(--qms-text)'],
              ['Pending total', pharmaRows.reduce((a, r) => a + r.pending, 0), '#b91c1c'],
              ['BCA camps', bcaCamps.length, 'var(--qms-text)'],
              ['BCA transport', formatINR(bcaRows.reduce((s, r) => s + r.transportCost, 0)), 'var(--qms-text)'],
            ].map(([label, value, color]) => (
              <div key={label as string} className="rounded-xl border p-3" style={{ background: 'var(--qms-surface)', borderColor: 'var(--qms-border)' }}>
                <div className="text-[10px] font-bold uppercase tracking-wide mb-1" style={{ color: 'var(--qms-text-muted)' }}>{label}</div>
                <div className="text-2xl font-extrabold" style={{ color: color as string }}>{value}</div>
              </div>
            ))}
          </div>

          <div className="rounded-xl border p-3.5 mb-3" style={{ background: 'var(--qms-surface)', borderColor: 'var(--qms-border)' }}>
            <div className="text-[13px] font-bold mb-2" style={{ color: 'var(--qms-text)' }}>Daily diet-camp count · last 30 days</div>
            <div className="flex items-end gap-0.5 h-20 overflow-x-auto pb-1">
              {daily.dayBuckets.length ? daily.dayBuckets.map((b) => {
                const h = Math.max(6, Math.round((b.count / dayMax) * 70))
                const isToday = b.date === today
                return (
                  <div key={b.date} title={`${b.date}: ${b.count} camp${b.count === 1 ? '' : 's'}`} className="flex flex-col items-center gap-0.5 shrink-0">
                    <div className="text-[9.5px] font-extrabold" style={{ color: isToday ? '#0d9488' : 'var(--qms-text-muted)' }}>{b.count}</div>
                    <div className="w-3.5 rounded-sm" style={{ height: h, background: isToday ? 'linear-gradient(180deg,#14b8a6,#0ea5e9)' : '#cbd5e1' }} />
                    <div className="text-[9px]" style={{ color: 'var(--qms-text-muted)' }}>{b.date.slice(5)}</div>
                  </div>
                )
              }) : <p className="text-[12px] p-3.5" style={{ color: 'var(--qms-text-muted)' }}>No diet camps in the last 30 days.</p>}
            </div>
          </div>

          {/* Pending camps · pharma-wise */}
          <div className="rounded-xl border p-3.5 mb-3" style={{ background: 'var(--qms-surface)', borderColor: 'var(--qms-border)' }}>
            <div className="flex justify-between items-center gap-2.5 mb-2">
              <div>
                <div className="text-[13px] font-bold" style={{ color: 'var(--qms-text)' }}>Pending camps · Pharma-wise</div>
                <div className="text-[11px]" style={{ color: 'var(--qms-text-muted)' }}>All diet camps not yet closed / cancelled.</div>
              </div>
              <Button size="sm" onClick={() => handleExport(`pending-pharma-${today}.csv`, pharmaRows.map((r) => ({ Pharma: r.pharma, Pending: r.pending, Requested: r.requested, With_Dietitian: r.withDietitian, Without_Dietitian: r.withoutDietitian, Est_Remuneration_INR: Math.round(r.totalValue) })))}>
                <FiDownload size={12} /> Export
              </Button>
            </div>
            {pharmaRows.length ? (
              <table className="w-full text-[12px]">
                <thead>
                  <tr style={{ background: 'var(--qms-surface-strong)' }}>
                    {['Pharma', 'Pending', 'Requested', 'With dietitian', 'Without', 'Est ₹'].map((h) => (
                      <th key={h} className="text-left font-semibold px-2 py-1.5 text-[10px] uppercase" style={{ color: 'var(--qms-text-muted)' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {pharmaRows.map((r) => (
                    <tr key={r.clientId} className="border-t" style={{ borderColor: 'var(--qms-border)' }}>
                      <td className="px-2 py-1.5 font-semibold" style={{ color: 'var(--qms-text)' }}>{r.pharma}</td>
                      <td className="px-2 py-1.5 font-bold" style={{ color: '#b91c1c' }}>{r.pending}</td>
                      <td className="px-2 py-1.5" style={{ color: 'var(--qms-text-soft)' }}>{r.requested}</td>
                      <td className="px-2 py-1.5" style={{ color: '#047857' }}>{r.withDietitian}</td>
                      <td className="px-2 py-1.5" style={{ color: '#92400e' }}>{r.withoutDietitian}</td>
                      <td className="px-2 py-1.5 font-bold" style={{ color: 'var(--qms-text)' }}>{formatINR(r.totalValue)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : <p className="text-[12px] text-center py-3.5" style={{ color: 'var(--qms-text-muted)' }}>No pending pharma camps.</p>}
          </div>

          {/* BCA Scale · location-wise */}
          <div className="rounded-xl border p-3.5 mb-3" style={{ background: 'var(--qms-surface)', borderColor: 'var(--qms-border)' }}>
            <div className="flex justify-between items-center gap-2.5 mb-2">
              <div>
                <div className="text-[13px] font-bold" style={{ color: 'var(--qms-text)' }}>BCA Scale · location-wise</div>
                <div className="text-[11px]" style={{ color: 'var(--qms-text-muted)' }}>Body composition camps grouped by city.</div>
              </div>
              <Button size="sm" onClick={() => handleExport(`bca-scale-location-${today}.csv`, bcaRows.map((r) => ({ City: r.city, State: r.state, BCA_Camps: r.camps, Patients_Expected: r.patientsExpected, Patients_Done: r.patientsDone, Transport_INR: Math.round(r.transportCost) })))}>
                <FiDownload size={12} /> Export
              </Button>
            </div>
            {bcaRows.length ? (
              <table className="w-full text-[12px]">
                <thead>
                  <tr style={{ background: 'var(--qms-surface-strong)' }}>
                    {['City', 'State', 'Camps', 'Expected', 'Done', 'Transport ₹'].map((h) => (
                      <th key={h} className="text-left font-semibold px-2 py-1.5 text-[10px] uppercase" style={{ color: 'var(--qms-text-muted)' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {bcaRows.map((r) => (
                    <tr key={`${r.city}-${r.state}`} className="border-t" style={{ borderColor: 'var(--qms-border)' }}>
                      <td className="px-2 py-1.5 font-semibold" style={{ color: 'var(--qms-text)' }}>{r.city}</td>
                      <td className="px-2 py-1.5" style={{ color: 'var(--qms-text-soft)' }}>{r.state}</td>
                      <td className="px-2 py-1.5 font-bold" style={{ color: 'var(--qms-text)' }}>{r.camps}</td>
                      <td className="px-2 py-1.5" style={{ color: 'var(--qms-text-soft)' }}>{r.patientsExpected}</td>
                      <td className="px-2 py-1.5" style={{ color: '#047857' }}>{r.patientsDone}</td>
                      <td className="px-2 py-1.5 font-bold" style={{ color: 'var(--qms-text)' }}>{formatINR(r.transportCost)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : <p className="text-[12px] text-center py-3.5" style={{ color: 'var(--qms-text-muted)' }}>No BCA camps.</p>}
          </div>

          {/* Remuneration · BCA Scale transport */}
          <div className="rounded-xl border p-3.5 mb-3" style={{ background: 'var(--qms-surface)', borderColor: 'var(--qms-border)' }}>
            <div className="flex justify-between items-center gap-2.5 mb-2">
              <div>
                <div className="text-[13px] font-bold" style={{ color: 'var(--qms-text)' }}>Remuneration · BCA Scale transport</div>
                <div className="text-[11px]" style={{ color: 'var(--qms-text-muted)' }}>Per dietitian — base + transport.</div>
              </div>
              <Button size="sm" onClick={() => handleExport(`bca-transport-remuneration-${today}.csv`, remunRows.map((r) => ({ Dietitian: r.dietitian, Dietitian_ID: r.dietitianId, Camps: r.camps, Base_INR: Math.round(r.base), Transport_INR: Math.round(r.transport), Total_INR: Math.round(r.total) })))}>
                <FiDownload size={12} /> Export
              </Button>
            </div>
            {remunRows.length ? (
              <table className="w-full text-[12px]">
                <thead>
                  <tr style={{ background: 'var(--qms-surface-strong)' }}>
                    {['Dietitian', 'Camps', 'Base ₹', 'Transport ₹', 'Total ₹'].map((h) => (
                      <th key={h} className="text-left font-semibold px-2 py-1.5 text-[10px] uppercase" style={{ color: 'var(--qms-text-muted)' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {remunRows.map((r) => (
                    <tr key={r.dietitianId} className="border-t" style={{ borderColor: 'var(--qms-border)' }}>
                      <td className="px-2 py-1.5 font-semibold" style={{ color: 'var(--qms-text)' }}>{r.dietitian}</td>
                      <td className="px-2 py-1.5" style={{ color: 'var(--qms-text-soft)' }}>{r.camps}</td>
                      <td className="px-2 py-1.5" style={{ color: 'var(--qms-text-soft)' }}>{formatINR(r.base)}</td>
                      <td className="px-2 py-1.5 font-bold" style={{ color: '#0d9488' }}>{formatINR(r.transport)}</td>
                      <td className="px-2 py-1.5 font-extrabold" style={{ color: 'var(--qms-text)' }}>{formatINR(r.total)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : <p className="text-[12px] text-center py-3.5" style={{ color: 'var(--qms-text-muted)' }}>No remuneration yet.</p>}
          </div>

          {/* MR-wise camp count */}
          <div className="rounded-xl border p-3.5" style={{ background: 'var(--qms-surface)', borderColor: 'var(--qms-border)' }}>
            <div className="flex justify-between items-center gap-2.5 mb-2">
              <div>
                <div className="text-[13px] font-bold" style={{ color: 'var(--qms-text)' }}>MR-wise camp count</div>
                <div className="text-[11px]" style={{ color: 'var(--qms-text-muted)' }}>All diet camps grouped by MR.</div>
              </div>
              <Button size="sm" onClick={() => handleExport(`mr-wise-camp-count-${today}.csv`, mrRows.map((r) => ({ MR: r.mr, Pharma: r.pharma, Total: r.total, Pending: r.pending, Closed: r.closed, Cancelled: r.cancelled })))}>
                <FiDownload size={12} /> Export
              </Button>
            </div>
            {mrRows.length ? (
              <table className="w-full text-[12px]">
                <thead>
                  <tr style={{ background: 'var(--qms-surface-strong)' }}>
                    {['MR', 'Pharma', 'Total', 'Pending', 'Closed', 'Cancelled'].map((h) => (
                      <th key={h} className="text-left font-semibold px-2 py-1.5 text-[10px] uppercase" style={{ color: 'var(--qms-text-muted)' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {mrRows.map((r) => (
                    <tr key={r.mrId} className="border-t" style={{ borderColor: 'var(--qms-border)' }}>
                      <td className="px-2 py-1.5 font-semibold" style={{ color: 'var(--qms-text)' }}>{r.mr}</td>
                      <td className="px-2 py-1.5" style={{ color: 'var(--qms-text-soft)' }}>{r.pharma}</td>
                      <td className="px-2 py-1.5 font-bold" style={{ color: 'var(--qms-text)' }}>{r.total}</td>
                      <td className="px-2 py-1.5" style={{ color: '#b91c1c' }}>{r.pending}</td>
                      <td className="px-2 py-1.5" style={{ color: '#047857' }}>{r.closed}</td>
                      <td className="px-2 py-1.5" style={{ color: '#92400e' }}>{r.cancelled}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : <p className="text-[12px] text-center py-3.5" style={{ color: 'var(--qms-text-muted)' }}>No MR data yet.</p>}
          </div>
        </div>
      )}
    </div>
  )
}

export default DashboardTab
