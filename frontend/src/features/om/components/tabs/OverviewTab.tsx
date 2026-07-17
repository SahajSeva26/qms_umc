import { FiNavigation, FiUserCheck, FiCreditCard, FiBriefcase, FiFileText, FiDollarSign, FiClipboard as FiAudit, FiArrowRight, FiFilePlus, FiAward, FiFolder, FiHome } from 'react-icons/fi'
import type { Camp } from '@/types/camp.types'
import type { Person } from '@/types/people.types'
import type { Project } from '@/types/project.types'
import type { ExpenseStatus } from '@/features/om/om.types'
import {
  campStatus, campsOfType, isCampUnassigned, expensesOfType, dietitianExpensesOfType,
  subjectAvailability, auditIssues,
} from '@/features/om/om.service'
import KpiTile from '@/components/ui/KpiTile'
import DoBar from '@/features/dedicatedops/components/DoBar'
import { clientName } from '@/types/campref.types'
import { formatINR } from '@/utils/formatters'

interface OverviewTabProps {
  camps: Camp[]
  mode: 'Screening' | 'Diet'
  fos: Person[]
  dietitians: Person[]
  projects: Project[]
  expenseOverlay: Record<string, ExpenseStatus>
  onGoTab: (tab: string) => void
}

const ACCENT: Record<'Screening' | 'Diet', string> = { Screening: '#3b6dff', Diet: '#10b981' }

const STATUS_ORDER = ['UPCOMING', 'ONGOING', 'OVERDUE', 'COMPLETED', 'REQUESTED', 'CANCELLED'] as const
const STATUS_COLOR: Record<string, string> = {
  REQUESTED: '#94a3b8', UPCOMING: '#3b6dff', ONGOING: '#10b981', COMPLETED: '#14b8a6', OVERDUE: '#f43f5e', CANCELLED: '#f59e0b', CANCELLED_CHARGED: '#f43f5e',
}
const STATUS_LABEL: Record<string, string> = {
  REQUESTED: 'Requested', UPCOMING: 'Upcoming', ONGOING: 'Ongoing', COMPLETED: 'Completed', OVERDUE: 'Overdue', CANCELLED: 'Cancelled', CANCELLED_CHARGED: 'Cancelled (charged)',
}

function todayIso() { return new Date().toISOString().slice(0, 10) }
function isoPlusDays(n: number) { const d = new Date(); d.setDate(d.getDate() + n); return d.toISOString().slice(0, 10) }

// Mirrors tabOverview() exactly (om-portal.js:243-469) — the Command Center,
// the manager's single combined cockpit with every tile drilling into the
// relevant tab. This is the most complex tab in Ops Manager; every number
// below has a literal formula ported from the prototype, not approximated.
const OverviewTab = ({ camps, mode, fos, dietitians, projects, expenseOverlay, onGoTab }: OverviewTabProps) => {
  const isDiet = mode === 'Diet'
  const accent = ACCENT[mode]
  const subjLabel = isDiet ? 'Dietitian' : 'FO'
  const subjLabelPlural = isDiet ? 'Dietitians' : 'FOs'

  const modeCamps = campsOfType(camps, mode)
  const statusCounts: Record<string, number> = {}
  modeCamps.forEach((c) => { const s = campStatus(c); statusCounts[s] = (statusCounts[s] ?? 0) + 1 })

  const today = todayIso()
  const weekEnd = isoPlusDays(7)
  const todayCamps = modeCamps.filter((c) => c.date === today && c.status !== 'CANCELLED' && c.status !== 'CANCELLED_CHARGED')
  const weekCamps = modeCamps.filter((c) => c.date >= today && c.date <= weekEnd && c.status !== 'CANCELLED' && c.status !== 'CANCELLED_CHARGED')
  const patients = modeCamps.reduce((a, c) => a + Number(c.patientsDone || c.patientCount || 0), 0)
  const unassigned = modeCamps.filter((c) => isCampUnassigned(c, isDiet)).length

  // Workforce
  const fosAll = isDiet ? dietitians : fos.filter((p) => !p.relievedOn)
  const empType = (p: Person) => p.empType ?? (p.role === 'Manpower' ? 'TP_MANPOWER' : 'QMS_FO')
  const allFieldOfficers = fos.filter((p) => !p.relievedOn)
  const tpFo = allFieldOfficers.filter((p) => empType(p) === 'TP_FO')
  const inhouse = allFieldOfficers.filter((p) => empType(p) === 'QMS_FO')
  const manpower = fos.filter((p) => !p.relievedOn && (p.empType === 'TP_MANPOWER' || p.role === 'Manpower'))
  const thirdParty = tpFo.length + manpower.length
  const vendors = [...new Set([...tpFo, ...manpower].map((p) => p.vendor).filter(Boolean))] as string[]
  const tpCost = [...tpFo, ...manpower].reduce((a, p) => a + (p.salaryInr ?? 0), 0)
  const occ = fosAll.length ? Math.round(fosAll.reduce((a, p) => a + (p.occupancyPct ?? 0), 0) / fosAll.length) : 0
  const eff = fosAll.length ? Math.round(fosAll.reduce((a, p) => a + (p.efficiencyPct ?? 0), 0) / fosAll.length) : 0

  let atCamp = 0, onDuty = 0, idle = 0
  fosAll.forEach((p) => {
    const a = subjectAvailability(p.id, todayCamps, isDiet)
    if (a === 'AT_CAMP') atCamp++
    else if (a === 'ON_DUTY') onDuty++
    else idle++
  })

  // Expenses
  const expenses = isDiet ? dietitianExpensesOfType(camps, expenseOverlay, {}, dietitians) : expensesOfType(camps, expenseOverlay, mode, fos)
  const pendExp = expenses.filter((e) => e.status === 'PENDING')
  const apprExp = expenses.filter((e) => e.status === 'APPROVED')
  const paidExp = expenses.filter((e) => e.status === 'PAID')
  const pendExpAmt = pendExp.reduce((a, e) => a + e.total, 0)
  const apprExpAmt = apprExp.reduce((a, e) => a + e.total, 0)

  // Audit
  const audit = auditIssues(modeCamps)
  const photosMissing = audit.filter((a) => a.photosMissing).length
  const reportMissing = audit.filter((a) => a.reportMissing).length
  const countMissing = audit.filter((a) => a.countMissing).length

  // Projects of this type
  const modeProjects = projects.filter((p) => p.type === mode)

  // Billing/revenue — no billing-engine module exists yet in our app (Phase 2
  // per CLAUDE.md); left as honest zeros rather than fabricated, matching the
  // prototype's own try/catch("billing optional") fallback behavior.
  const billedRev = 0, arOut = 0, billable = 0, billableVal = 0
  const invCount: number = 0

  const sMax = Math.max(1, ...STATUS_ORDER.map((s) => statusCounts[s] ?? 0))
  const availTotal = Math.max(1, fosAll.length)

  // Top subjects by camps closed
  const closedCounts: Record<string, number> = {}
  modeCamps.filter((c) => campStatus(c) === 'COMPLETED').forEach((c) => {
    const sid = isDiet ? c.dietitianId : c.foId
    if (sid) closedCounts[sid] = (closedCounts[sid] ?? 0) + 1
  })
  const subjName = (id: string) => (isDiet ? dietitians.find((d) => d.id === id)?.name : fos.find((f) => f.id === id)?.name) ?? id
  const topSubjects = Object.keys(closedCounts).sort((a, b) => closedCounts[b] - closedCounts[a]).slice(0, 5)
  const topSubjectsMax = Math.max(1, ...topSubjects.map((s) => closedCounts[s]))

  return (
    <div>
      {/* Pointer row — 9 KPI tiles */}
      <div className="grid gap-3 mb-4" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))' }}>
        <button onClick={() => onGoTab('dashboard')} className="text-left">
          <KpiTile label={`Total ${mode.toLowerCase()} camps`} value={String(modeCamps.length)} sub={`${statusCounts.COMPLETED ?? 0} done · ${statusCounts.ONGOING ?? 0} live · ${todayCamps.length} today`} tone="brand" icon={FiHome} />
        </button>
        <button onClick={() => onGoTab('assign')} className="text-left">
          <KpiTile label="Unassigned" value={String(unassigned)} sub={`Need ${subjLabel} assignment`} tone="amber" icon={FiNavigation} />
        </button>
        <button onClick={() => onGoTab('dashboard')} className="text-left">
          <KpiTile label="Patients screened" value={String(patients)} sub="Across all camps" tone="teal" icon={FiUserCheck} />
        </button>
        <button onClick={() => onGoTab('fos')} className="text-left">
          <KpiTile label={`Active ${subjLabelPlural}`} value={String(fosAll.length)} sub={`${atCamp} at camp · ${idle} idle today`} tone="emerald" icon={FiCreditCard} />
        </button>
        {!isDiet && (
          <button onClick={() => onGoTab('fos')} className="text-left">
            <KpiTile label="3rd-party workforce" value={String(thirdParty)} sub={`${tpFo.length} TP-FO · ${manpower.length} manpower`} tone="violet" icon={FiBriefcase} />
          </button>
        )}
        <button onClick={() => onGoTab('expenses')} className="text-left">
          <KpiTile label="Pending expenses" value={formatINR(pendExpAmt)} sub={`${pendExp.length} claim${pendExp.length === 1 ? '' : 's'} to approve`} tone="violet" icon={FiDollarSign} />
        </button>
        <KpiTile label="Billed revenue" value={formatINR(billedRev)} sub={`${invCount} invoice${invCount === 1 ? '' : 's'}`} tone="emerald" icon={FiFileText} />
        <KpiTile label="AR outstanding" value={formatINR(arOut)} sub="Awaiting collection" tone="rose" icon={FiDollarSign} />
        <button onClick={() => onGoTab('audit')} className="text-left">
          <KpiTile label="Audit issues" value={String(audit.length)} sub={`${photosMissing} photos · ${reportMissing} reports missing`} tone="rose" icon={FiAudit} />
        </button>
      </div>

      {/* Camp work + FO/Dietitian availability */}
      <div className="grid gap-3 mb-3" style={{ gridTemplateColumns: '1fr 1fr' }}>
        <div className="rounded-xl border p-3.5" style={{ background: 'var(--qms-surface)', borderColor: 'var(--qms-border)' }}>
          <div className="flex items-center gap-2 text-[13px] font-bold mb-2.5" style={{ color: 'var(--qms-text)' }}>
            <FiHome size={15} style={{ color: accent }} /> Camp work
          </div>
          <div className="grid grid-cols-3 gap-2 mb-3">
            {[['Today', todayCamps.length], ['Next 7 days', weekCamps.length], ['Patients', patients]].map(([label, value]) => (
              <div key={label} className="text-center rounded-lg p-2" style={{ background: `color-mix(in srgb, ${accent} 6%, transparent)` }}>
                <div className="text-lg font-extrabold" style={{ color: 'var(--qms-text)' }}>{value}</div>
                <div className="text-[10px]" style={{ color: 'var(--qms-text-muted)' }}>{label}</div>
              </div>
            ))}
          </div>
          {STATUS_ORDER.map((s) => (
            <div key={s} className="mb-1.5">
              <div className="flex justify-between text-[11px] font-bold mb-0.5">
                <span style={{ color: STATUS_COLOR[s] }}>{STATUS_LABEL[s]}</span>
                <span style={{ color: 'var(--qms-text)' }}>{statusCounts[s] ?? 0}</span>
              </div>
              <DoBar pct={Math.round((100 * (statusCounts[s] ?? 0)) / sMax)} color={STATUS_COLOR[s]} />
            </div>
          ))}
          <button onClick={() => onGoTab('dashboard')} className="flex items-center gap-1.5 text-[12px] font-semibold mt-2" style={{ color: 'var(--qms-text-muted)' }}>
            <FiArrowRight size={12} /> Open camp dashboard
          </button>
        </div>

        <div className="rounded-xl border p-3.5" style={{ background: 'var(--qms-surface)', borderColor: 'var(--qms-border)' }}>
          <div className="flex items-center gap-2 text-[13px] font-bold mb-2.5" style={{ color: 'var(--qms-text)' }}>
            <FiCreditCard size={15} style={{ color: '#10b981' }} /> {subjLabel} management &amp; availability
          </div>
          <div className="grid grid-cols-3 gap-2 mb-3">
            {[['Active', fosAll.length], ['Occupancy', `${occ}%`], ['Efficiency', `${eff}%`]].map(([label, value]) => (
              <div key={label} className="text-center rounded-lg p-2" style={{ background: 'rgba(16,185,129,.06)' }}>
                <div className="text-lg font-extrabold" style={{ color: 'var(--qms-text)' }}>{value}</div>
                <div className="text-[10px]" style={{ color: 'var(--qms-text-muted)' }}>{label}</div>
              </div>
            ))}
          </div>
          {[['At camp', atCamp, '#10b981'], ['On duty (upcoming today)', onDuty, '#3b6dff'], ['Idle today', idle, '#94a3b8']].map(([label, n, color]) => (
            <div key={label as string} className="mb-1.5">
              <div className="flex justify-between text-[11px] font-bold mb-0.5">
                <span style={{ color: 'var(--qms-text)' }}>{label}</span>
                <span style={{ color: 'var(--qms-text)' }}>{n}</span>
              </div>
              <DoBar pct={Math.round((100 * (n as number)) / availTotal)} color={color as string} />
            </div>
          ))}
          <button onClick={() => onGoTab('fos')} className="flex items-center gap-1.5 text-[12px] font-semibold mt-2" style={{ color: 'var(--qms-text-muted)' }}>
            <FiArrowRight size={12} /> Open {subjLabel} management
          </button>
        </div>
      </div>

      {/* 3rd-party workforce + Revenue & billing */}
      <div className="grid gap-3 mb-3" style={{ gridTemplateColumns: isDiet ? '1fr' : '1fr 1fr' }}>
        {!isDiet && (
          <div className="rounded-xl border p-3.5" style={{ background: 'var(--qms-surface)', borderColor: 'var(--qms-border)' }}>
            <div className="flex items-center gap-2 text-[13px] font-bold mb-2.5" style={{ color: 'var(--qms-text)' }}>
              <FiBriefcase size={15} style={{ color: '#a855f7' }} /> 3rd-party workforce
            </div>
            <div className="grid grid-cols-3 gap-2 mb-2.5">
              {[['In-house FO', inhouse.length], ['3rd-party FO', tpFo.length], ['Manpower', manpower.length]].map(([label, value]) => (
                <div key={label} className="text-center rounded-lg p-2" style={{ background: 'rgba(168,85,247,.06)' }}>
                  <div className="text-lg font-extrabold" style={{ color: 'var(--qms-text)' }}>{value}</div>
                  <div className="text-[10px]" style={{ color: 'var(--qms-text-muted)' }}>{label}</div>
                </div>
              ))}
            </div>
            <div className="text-[11px] mb-1" style={{ color: 'var(--qms-text-muted)' }}>Vendors: {vendors.length ? vendors.join(', ') : '—'}</div>
            <div className="text-[11px]" style={{ color: 'var(--qms-text-muted)' }}>Est. 3rd-party monthly cost: <span className="font-bold" style={{ color: 'var(--qms-text)' }}>{formatINR(tpCost)}</span></div>
          </div>
        )}

        <div className="rounded-xl border p-3.5" style={{ background: 'var(--qms-surface)', borderColor: 'var(--qms-border)' }}>
          <div className="flex items-center gap-2 text-[13px] font-bold mb-2.5" style={{ color: 'var(--qms-text)' }}>
            <FiFileText size={15} style={{ color: '#10b981' }} /> Revenue &amp; billing generation
          </div>
          <div className="grid grid-cols-2 gap-2 mb-2.5">
            <div className="text-center rounded-lg p-2" style={{ background: 'rgba(16,185,129,.06)' }}>
              <div className="text-base font-extrabold" style={{ color: 'var(--qms-text)' }}>{formatINR(billedRev)}</div>
              <div className="text-[10px]" style={{ color: 'var(--qms-text-muted)' }}>Billed revenue</div>
            </div>
            <div className="text-center rounded-lg p-2" style={{ background: 'rgba(244,63,94,.06)' }}>
              <div className="text-base font-extrabold" style={{ color: 'var(--qms-text)' }}>{formatINR(arOut)}</div>
              <div className="text-[10px]" style={{ color: 'var(--qms-text-muted)' }}>AR outstanding</div>
            </div>
            <div className="text-center rounded-lg p-2" style={{ background: 'rgba(59,109,255,.06)' }}>
              <div className="text-base font-extrabold" style={{ color: 'var(--qms-text)' }}>{billable}</div>
              <div className="text-[10px]" style={{ color: 'var(--qms-text-muted)' }}>Camps to bill</div>
            </div>
            <div className="text-center rounded-lg p-2" style={{ background: 'rgba(59,109,255,.06)' }}>
              <div className="text-base font-extrabold" style={{ color: 'var(--qms-text)' }}>{formatINR(billableVal)}</div>
              <div className="text-[10px]" style={{ color: 'var(--qms-text-muted)' }}>Billable value</div>
            </div>
          </div>
          <button className="w-full text-[12px] font-bold py-2 rounded-lg text-white flex items-center justify-center gap-1.5" style={{ background: 'var(--qms-brand)' }} onClick={() => onGoTab('invoicing')}>
            <FiFilePlus size={13} /> Generate billing for completed camps
          </button>
        </div>
      </div>

      {/* Projects · PO position */}
      <div className="rounded-xl border p-3.5 mb-3" style={{ background: 'var(--qms-surface)', borderColor: 'var(--qms-border)' }}>
        <div className="flex items-center gap-2 text-[13px] font-bold mb-2.5" style={{ color: 'var(--qms-text)' }}>
          <FiFolder size={15} style={{ color: accent }} /> {mode} projects · PO position
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-[12px]">
            <thead>
              <tr>
                {['Project', 'Status', 'PO progress', 'PO value', 'Health'].map((h) => (
                  <th key={h} className="text-left font-semibold px-2 py-1.5" style={{ color: 'var(--qms-text-muted)' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {modeProjects.slice(0, 8).map((p) => {
                const pct = p.totalCamps ? Math.round((100 * p.campsDone) / p.totalCamps) : 0
                const hc = p.healthScore >= 80 ? '#10b981' : p.healthScore >= 60 ? '#f59e0b' : '#f43f5e'
                return (
                  <tr key={p.id} className="border-t" style={{ borderColor: 'var(--qms-border)' }}>
                    <td className="px-2 py-1.5">
                      <div className="font-semibold" style={{ color: 'var(--qms-text)' }}>{p.name}</div>
                      <div className="text-[10px]" style={{ color: 'var(--qms-text-muted)' }}>{clientName(p.clientId)}</div>
                    </td>
                    <td className="px-2 py-1.5" style={{ color: STATUS_COLOR[p.status] ?? 'var(--qms-text-soft)' }}>{p.status}</td>
                    <td className="px-2 py-1.5 min-w-30">
                      <div className="text-[10px] mb-1" style={{ color: 'var(--qms-text-muted)' }}>{p.campsDone}/{p.totalCamps} camps</div>
                      <DoBar pct={Math.min(100, pct)} color={accent} />
                    </td>
                    <td className="px-2 py-1.5 text-right font-bold" style={{ color: 'var(--qms-text)' }}>{formatINR(p.valueAfterGst)}</td>
                    <td className="px-2 py-1.5 text-center font-extrabold" style={{ color: hc }}>{p.healthScore || '—'}</td>
                  </tr>
                )
              })}
              {modeProjects.length === 0 && (
                <tr><td colSpan={5} className="text-center py-3.5 text-[12px]" style={{ color: 'var(--qms-text-muted)' }}>No {mode} projects.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Expenses & approvals + Audit & compliance */}
      <div className="grid gap-3" style={{ gridTemplateColumns: '1fr 1fr' }}>
        <div className="rounded-xl border p-3.5" style={{ background: 'var(--qms-surface)', borderColor: 'var(--qms-border)' }}>
          <div className="flex items-center gap-2 text-[13px] font-bold mb-2.5" style={{ color: 'var(--qms-text)' }}>
            <FiDollarSign size={15} style={{ color: '#7c5cff' }} /> Expenses &amp; approvals
          </div>
          <div className="grid grid-cols-3 gap-2">
            <div className="text-center rounded-lg p-2" style={{ background: 'rgba(245,158,11,.07)' }}>
              <div className="text-base font-extrabold" style={{ color: '#f59e0b' }}>{pendExp.length}</div>
              <div className="text-[10px]" style={{ color: 'var(--qms-text-muted)' }}>Pending<br />{formatINR(pendExpAmt)}</div>
            </div>
            <div className="text-center rounded-lg p-2" style={{ background: 'rgba(14,165,233,.07)' }}>
              <div className="text-base font-extrabold" style={{ color: '#0ea5e9' }}>{apprExp.length}</div>
              <div className="text-[10px]" style={{ color: 'var(--qms-text-muted)' }}>Approved<br />{formatINR(apprExpAmt)}</div>
            </div>
            <div className="text-center rounded-lg p-2" style={{ background: 'rgba(16,185,129,.07)' }}>
              <div className="text-base font-extrabold" style={{ color: '#10b981' }}>{paidExp.length}</div>
              <div className="text-[10px]" style={{ color: 'var(--qms-text-muted)' }}>Paid</div>
            </div>
          </div>
          <button onClick={() => onGoTab('expenses')} className="flex items-center gap-1.5 text-[12px] font-semibold mt-2.5" style={{ color: 'var(--qms-text-muted)' }}>
            <FiArrowRight size={12} /> Approve expenses
          </button>
        </div>

        <div className="rounded-xl border p-3.5" style={{ background: 'var(--qms-surface)', borderColor: 'var(--qms-border)' }}>
          <div className="flex items-center gap-2 text-[13px] font-bold mb-2.5" style={{ color: 'var(--qms-text)' }}>
            <FiAudit size={15} style={{ color: '#f43f5e' }} /> Audit &amp; compliance
          </div>
          <div className="grid grid-cols-3 gap-2">
            <div className="text-center rounded-lg p-2" style={{ background: 'rgba(244,63,94,.06)' }}>
              <div className="text-base font-extrabold" style={{ color: 'var(--qms-text)' }}>{photosMissing}</div>
              <div className="text-[10px]" style={{ color: 'var(--qms-text-muted)' }}>Photos missing</div>
            </div>
            <div className="text-center rounded-lg p-2" style={{ background: 'rgba(244,63,94,.06)' }}>
              <div className="text-base font-extrabold" style={{ color: 'var(--qms-text)' }}>{reportMissing}</div>
              <div className="text-[10px]" style={{ color: 'var(--qms-text-muted)' }}>Reports missing</div>
            </div>
            <div className="text-center rounded-lg p-2" style={{ background: 'rgba(244,63,94,.06)' }}>
              <div className="text-base font-extrabold" style={{ color: 'var(--qms-text)' }}>{countMissing}</div>
              <div className="text-[10px]" style={{ color: 'var(--qms-text-muted)' }}>Counts missing</div>
            </div>
          </div>
          <button onClick={() => onGoTab('audit')} className="flex items-center gap-1.5 text-[12px] font-semibold mt-2.5" style={{ color: 'var(--qms-text-muted)' }}>
            <FiArrowRight size={12} /> Resolve audit issues
          </button>
        </div>
      </div>

      {/* Top subjects by camps closed */}
      <div className="rounded-xl border p-3.5 mt-3" style={{ background: 'var(--qms-surface)', borderColor: 'var(--qms-border)' }}>
        <div className="flex items-center gap-2 text-[13px] font-bold mb-2.5" style={{ color: 'var(--qms-text)' }}>
          <FiAward size={15} style={{ color: accent }} /> Top {subjLabelPlural.toLowerCase()} by camps closed
        </div>
        {topSubjects.length > 0 ? topSubjects.map((id) => (
          <div key={id} className="mb-2">
            <div className="flex justify-between text-[12px] font-bold mb-1">
              <span style={{ color: 'var(--qms-text)' }}>{subjName(id)}</span>
              <span style={{ color: 'var(--qms-text-muted)' }}>{closedCounts[id]} camps</span>
            </div>
            <DoBar pct={Math.round((100 * closedCounts[id]) / topSubjectsMax)} color={accent} />
          </div>
        )) : (
          <p className="text-[12px]" style={{ color: 'var(--qms-text-muted)' }}>No completed camps yet</p>
        )}
      </div>
    </div>
  )
}

export default OverviewTab
