import { FiZap } from 'react-icons/fi'
import { useDashboardData } from '@/features/dashboard/hooks/useDashboardData'
import { useDashboardProjects } from '@/features/dashboard/hooks/useDashboardProjects'
import SectionCard from '@/features/dashboard/components/SectionCard'
import MiniKpiCard from '@/features/dashboard/components/MiniKpiCard'
import BarListRow from '@/features/dashboard/components/BarListRow'
import EmptyLiveData from '@/features/dashboard/components/EmptyLiveData'
import QueryStateBlock from '@/components/ui/QueryStateBlock'
import { formatINR } from '@/utils/formatters'

const CLOSED_INVOICE_STATUSES = new Set(['paid', 'cancelled'])
const DISPLAYED_ROWS = 6

// Mirrors the prototype's super_admin-only `#sec-salescc` "Today" tab — narrowed to the two pieces
// with real backend support. "My companies"/"project types by rep" were dropped: tenant.salesPerson
// has no search filter and is system:manage-only, so an honest per-rep scoping isn't possible.
const PipelinePulseSection = () => {
  const { data } = useDashboardData()
  const { data: dashboardProjects, isLoading: projectsLoading, isError: projectsErrored, refetch: refetchProjects } = useDashboardProjects()
  const pendingPos = dashboardProjects?.pendingPurchaseOrders
  const pendingPosDisplayed = pendingPos?.slice(0, DISPLAYED_ROWS)

  if (!data) return null
  const { accounts } = data

  const outstandingTotal = accounts.invoiceStatusMix
    .filter((row) => !CLOSED_INVOICE_STATUSES.has(row.status))
    .reduce((sum, row) => sum + row.total, 0)
  const hasOutstanding = accounts.invoiceStatusMix.length > 0
  const maxExecuted = Math.max(...(pendingPosDisplayed ?? []).map((row) => row.executedCamps), 1)

  return (
    <SectionCard
      icon={FiZap}
      iconGradient="linear-gradient(135deg, var(--qms-brand), var(--qms-teal))"
      title="Pipeline Pulse"
      subtitle="Projects awaiting a purchase order, and invoicing outstanding — real, backend-derived figures only"
    >
      <div className="grid gap-2.5 mb-4" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))' }}>
        <MiniKpiCard label="Total Invoiced Amount" data={accounts.totalInvoicedAmount} />
        <MiniKpiCard
          label="Outstanding (non-paid)"
          data={{ v: hasOutstanding ? outstandingTotal : null, unit: 'inr' }}
        />
        <MiniKpiCard
          label="POs Pending"
          data={{ v: pendingPos ? pendingPos.length : null }}
        />
      </div>

      <h3 className="text-[12px] font-bold uppercase tracking-wider mb-2" style={{ color: 'var(--qms-text-muted)' }}>
        Projects awaiting a PO (camps already executed)
      </h3>
      <QueryStateBlock
        isLoading={projectsLoading}
        error={projectsErrored}
        loadingLabel="Loading…"
        errorLabel="Failed to load pending purchase orders."
        onRetry={refetchProjects}
      >
        {!pendingPosDisplayed || pendingPosDisplayed.length === 0 ? (
          <EmptyLiveData />
        ) : (
          pendingPosDisplayed.map((row) => (
            <BarListRow
              key={row.id}
              label={row.name}
              sublabel={[row.clientName, row.divisionName].filter(Boolean).join(' · ')}
              value={`${row.executedCamps} camp${row.executedCamps === 1 ? '' : 's'}`}
              share={(row.executedCamps / maxExecuted) * 100}
              gradient="linear-gradient(90deg, var(--warning), #f59e0b)"
            />
          ))
        )}
      </QueryStateBlock>

      <h3 className="text-[12px] font-bold uppercase tracking-wider mt-5 mb-2" style={{ color: 'var(--qms-text-muted)' }}>
        Invoicing & outstanding
      </h3>
      {!hasOutstanding ? (
        <EmptyLiveData />
      ) : (
        <div className="text-[13px]" style={{ color: 'var(--qms-text-soft)' }}>
          <span className="font-bold" style={{ color: 'var(--qms-text)' }}>{formatINR(outstandingTotal)}</span>{' '}
          across {accounts.invoiceStatusMix.filter((r) => !CLOSED_INVOICE_STATUSES.has(r.status)).reduce((s, r) => s + r.count, 0)} non-paid invoice(s) — see Accounts below for the full status mix.
        </div>
      )}
    </SectionCard>
  )
}

export default PipelinePulseSection
