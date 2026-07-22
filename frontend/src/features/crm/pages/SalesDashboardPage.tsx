import { useMemo, useState } from 'react'
import { useAuth } from '@/hooks/useAuth'
import { useSalesData } from '@/features/crm/sales/hooks/useSalesData'
import { useClientsData } from '@/features/crm/clients/hooks/useClientsData'
import { QUARTER } from '@/types/salesdash.types'
import { buildSalesHeadKpis, buildKamKpis, DEFAULT_SALES_FILTER, type SalesFilterState } from '@/components/widgets/sales-kpi/sales.kpis'
import SalesFilterBar from '@/components/widgets/sales-kpi/SalesFilterBar'
import SalesKpiGrid from '@/components/widgets/sales-kpi/SalesKpiGrid'
import TodayTab from '@/features/crm/sales/components/TodayTab'
import TeamTab from '@/features/crm/sales/components/TeamTab'
import TargetsTab from '@/features/crm/sales/components/TargetsTab'
import JourneyTab from '@/features/crm/sales/components/JourneyTab'
import PerformanceTab from '@/features/crm/sales/components/PerformanceTab'
import ApprovalsTab from '@/features/crm/sales/components/ApprovalsTab'
import ActivityTab from '@/features/crm/sales/components/ActivityTab'
import TargetDialog from '@/features/crm/sales/components/TargetDialog'
import RepDrawer from '@/features/crm/sales/components/RepDrawer'

const APPROVER_ROLES = ['super_admin', 'admin', 'sales_lead']

type TabId = 'TODAY' | 'TEAM' | 'TARGETS' | 'JOURNEY' | 'PERFORMANCE' | 'APPROVALS' | 'ACTIVITY'

const SalesDashboardPage = () => {
  const { user } = useAuth()
  const {
    reps,
    targets,
    assignments,
    approvals,
    activityFeed,
    meetings,
    addRep,
    setTarget,
    approveRequest,
    rejectRequest,
    withdrawRequest,
    submitRequest,
  } = useSalesData()
  const { clients, projects, invoices } = useClientsData()

  const [tab, setTab] = useState<TabId>('TODAY')
  const [targetDialog, setTargetDialog] = useState<{ repId: string | null } | null>(null)
  const [openRepId, setOpenRepId] = useState<string | null>(null)
  const [salesFilter, setSalesFilter] = useState<SalesFilterState>(DEFAULT_SALES_FILTER)

  const isApprover = APPROVER_ROLES.includes(user?.role ?? '')

  // Matched by email, not first name: SalesRep (sales.mock.ts) has no
  // userId linking it to the real User/Auth model — "the people master is a
  // separate upcoming module" per sales.service.ts's own comment — so this
  // can't be a real foreign-key join yet. Email is still a materially safer
  // stand-in than first name: the backend enforces a global unique index on
  // User.email (see UserService), so two reps can never collide on it the
  // way two "Priya"s would on a first-name match.
  const meRep = useMemo(() => {
    if (!user?.email) return null
    const email = user.email.toLowerCase()
    return reps.find((r) => r.email.toLowerCase() === email) ?? null
  }, [reps, user])

  const pendingApprovals = approvals.filter((a) => a.status === 'PENDING').length
  const openRep = reps.find((r) => r.id === openRepId) ?? null

  const kpiTiles = useMemo(
    () =>
      isApprover
        ? buildSalesHeadKpis({ reps, targets, clients, projects, invoices, filter: salesFilter, quarter: QUARTER })
        : buildKamKpis({ reps, targets, clients, projects, invoices, filter: salesFilter, quarter: QUARTER }),
    [isApprover, reps, targets, clients, projects, invoices, salesFilter]
  )

  const TABS: { id: TabId; label: string; badge?: number }[] = [
    { id: 'TODAY', label: 'Today' },
    { id: 'TEAM', label: 'Team' },
    { id: 'TARGETS', label: 'Targets' },
    { id: 'JOURNEY', label: 'Journeys' },
    { id: 'PERFORMANCE', label: 'Performance' },
    ...(isApprover ? [{ id: 'APPROVALS' as TabId, label: 'Approvals', badge: pendingApprovals }] : []),
    { id: 'ACTIVITY', label: 'Activity' },
  ]

  return (
    <div className="max-w-7xl">
      <div className="mb-4">
        <h1 className="text-2xl font-bold" style={{ color: 'var(--qms-text)' }}>Sales Dashboard</h1>
        <div className="flex flex-wrap gap-1.5 mt-2">
          <span className="text-[10px] font-semibold px-2 py-1 rounded-full" style={{ background: 'var(--qms-surface-strong)', color: 'var(--qms-text-muted)' }}>
            Sales · Command Center
          </span>
          <span className="text-[10px] font-semibold px-2 py-1 rounded-full bg-success-soft text-success">
            {isApprover ? 'Sales Head view' : 'KAM view'}
          </span>
        </div>
      </div>

      {isApprover && (
        <SalesFilterBar filter={salesFilter} onChange={setSalesFilter} reps={reps} clients={clients} projects={projects} />
      )}

      <SalesKpiGrid tiles={kpiTiles} />

      <div className="flex flex-wrap gap-1.5 mb-4">
        {TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className="px-3 py-1.5 rounded-lg text-[12px] font-bold border transition-all flex items-center gap-1.5"
            style={
              tab === t.id
                ? { background: 'var(--qms-brand)', borderColor: 'var(--qms-brand)', color: '#fff' }
                : { background: 'var(--qms-surface-strong)', borderColor: 'var(--qms-border)', color: 'var(--qms-text-soft)' }
            }
          >
            {t.label}
            {!!t.badge && (
              <span
                className="text-[10px] font-bold px-1.5 rounded-full"
                style={tab === t.id ? { background: 'rgba(255,255,255,.25)' } : { background: 'var(--qms-brand)', color: '#fff' }}
              >
                {t.badge}
              </span>
            )}
          </button>
        ))}
      </div>

      {tab === 'TODAY' && (
        <TodayTab
          isApprover={isApprover}
          meRep={meRep}
          reps={reps}
          meetings={meetings}
          assignments={assignments}
          clients={clients}
          projects={projects}
          invoices={invoices}
        />
      )}

      {tab === 'TEAM' && (
        <TeamTab
          reps={reps}
          targets={targets}
          assignments={assignments}
          isApprover={isApprover}
          meRep={meRep}
          onOpenRep={setOpenRepId}
          onEditTarget={(repId) => setTargetDialog({ repId })}
          onOpenApprovals={() => setTab('APPROVALS')}
          onAddRep={addRep}
        />
      )}

      {tab === 'TARGETS' && (
        <TargetsTab
          reps={reps}
          targets={targets}
          assignments={assignments}
          isApprover={isApprover}
          meRep={meRep}
          onEditTarget={(repId) => setTargetDialog({ repId })}
        />
      )}

      {tab === 'JOURNEY' && <JourneyTab meetings={meetings} reps={reps} />}

      {tab === 'PERFORMANCE' && (
        <PerformanceTab
          reps={reps}
          targets={targets}
          meetings={meetings}
          isApprover={isApprover}
          meRep={meRep}
          onOpenRep={setOpenRepId}
        />
      )}

      {tab === 'APPROVALS' && isApprover && (
        <ApprovalsTab
          approvals={approvals}
          isApprover={isApprover}
          meRep={meRep}
          userName={user?.firstName ?? ''}
          onApprove={(id, note) => approveRequest(id, note, user?.firstName ? `${user.firstName} ${user.lastName ?? ''}`.trim() : undefined)}
          onReject={(id, reason) => rejectRequest(id, reason, user?.firstName ? `${user.firstName} ${user.lastName ?? ''}`.trim() : undefined)}
          onWithdraw={withdrawRequest}
          onSubmit={(type, record) =>
            submitRequest(
              type,
              record,
              user?.firstName ? `${user.firstName} ${user.lastName ?? ''}`.trim() : undefined,
              user?.email
            )
          }
        />
      )}

      {tab === 'ACTIVITY' && <ActivityTab activityFeed={activityFeed} reps={reps} />}

      <TargetDialog
        open={!!targetDialog}
        presetRepId={targetDialog?.repId}
        reps={reps}
        targets={targets}
        onClose={() => setTargetDialog(null)}
        onSave={(repId, target, rationale) =>
          setTarget(repId, target, rationale, user?.firstName ? `${user.firstName} ${user.lastName ?? ''}`.trim() : undefined)
        }
      />

      <RepDrawer
        rep={openRep}
        reps={reps}
        targets={targets}
        assignments={assignments}
        isApprover={isApprover}
        onClose={() => setOpenRepId(null)}
        onEditTarget={(repId) => {
          setOpenRepId(null)
          setTargetDialog({ repId })
        }}
      />
    </div>
  )
}

export default SalesDashboardPage
