import { useState } from 'react'
import { FiPlus } from 'react-icons/fi'
import { useSession } from '@/hooks/useSession'
import { useDivisions } from '@/features/crm/hooks/useDivisions'
import { useDivisionsFilters } from '@/features/company-data/divisions/hooks/useDivisionsFilters'
import DivisionsFilterBar from '@/features/company-data/divisions/components/DivisionsFilterBar'
import DivisionsTable from '@/features/company-data/divisions/components/DivisionsTable'
import CreateDivisionModal from '@/features/company-data/divisions/components/CreateDivisionModal'
import { Button } from '@/components/ui/button'

// Tenant-admin-facing Divisions screen — reuses crmService's real,
// backend-wired Division endpoints (built during the CRM/Lead migration)
// but scoped and gated differently from CRM's own read-only consumption:
// CRM only ever READS divisions to populate a picker; this screen is where
// a customer tenant's own admin creates/manages them. No Tenant filter here
// (unlike RoleTypesListPage) — always scoped to the caller's own tenant via
// session.tenant.id, and the backend's ctx.where() scoping enforces this
// regardless of what's sent, so this is belt-and-suspenders correctness,
// not the actual security boundary.
const DivisionsListPage = () => {
  const { session } = useSession()
  const { filters, setFilter, reset } = useDivisionsFilters()
  const [createOpen, setCreateOpen] = useState(false)

  const baseQuery = {
    tenantId: session?.tenant.id,
    therapy: filters.therapy === 'ALL' ? undefined : filters.therapy,
    name: filters.search || undefined,
    limit: '1000',
  }

  // division.service.ts's search() hardcodes `where.status = ACTIVE` BEFORE
  // it even looks at whether a status filter was sent (division.service.ts,
  // unlike role/role-type's own search, which only sets status when a
  // filter is actually present) — so omitting the filter does NOT mean "all
  // statuses," it silently means "active only." A single query can never
  // return both; "All" is implemented as two parallel, explicitly-filtered
  // queries merged client-side. Both queries always run (useDivisions is the
  // shared hook the CRM wizard also uses, so it's not worth threading an
  // `enabled` passthrough through it just for this one screen's benefit) —
  // an occasional unused fetch is a fine trade given divisions are a
  // low-cardinality, low-traffic resource per tenant (tens, not thousands).
  const wantsActive = filters.status === 'ALL' || filters.status === 'active'
  const wantsInactive = filters.status === 'ALL' || filters.status === 'inactive'

  const activeQuery = useDivisions({ ...baseQuery, status: 'active' })
  const inactiveQuery = useDivisions({ ...baseQuery, status: 'inactive' })

  const isLoading = (wantsActive && activeQuery.isLoading) || (wantsInactive && inactiveQuery.isLoading)
  const error = (wantsActive && activeQuery.error) || (wantsInactive && inactiveQuery.error) || null

  const divisions = [
    ...(wantsActive ? activeQuery.data?.data?.items ?? [] : []),
    ...(wantsInactive ? inactiveQuery.data?.data?.items ?? [] : []),
  ]
  const totalCount =
    (wantsActive ? activeQuery.data?.data?.count ?? 0 : 0) + (wantsInactive ? inactiveQuery.data?.data?.count ?? 0 : 0)

  return (
    <div className="max-w-5xl">
      <div className="mb-5 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: 'var(--qms-text)' }}>
            Divisions
          </h1>
          <p className="text-[13px] mt-1" style={{ color: 'var(--qms-text-muted)' }}>
            {!isLoading && !error ? `${totalCount} total` : `Manage ${session?.tenant.name ?? 'your company'}'s divisions.`}
          </p>
        </div>
        <Button
          onClick={() => setCreateOpen(true)}
          className="text-white shrink-0"
          style={{ background: 'linear-gradient(135deg, var(--qms-brand), var(--qms-teal))' }}
        >
          <FiPlus size={14} /> New Division
        </Button>
      </div>

      <DivisionsFilterBar filters={filters} setFilter={setFilter} reset={reset} />

      {isLoading && (
        <div className="text-[13px] py-10 text-center" style={{ color: 'var(--qms-text-muted)' }}>
          Loading divisions…
        </div>
      )}

      {error && !isLoading && (
        <div className="text-[13px] rounded-xl px-3 py-2 bg-danger-soft border border-danger text-danger">
          Failed to load divisions. Please try again.
        </div>
      )}

      {!isLoading && !error && <DivisionsTable divisions={divisions} />}

      {createOpen && <CreateDivisionModal onClose={() => setCreateOpen(false)} />}
    </div>
  )
}

export default DivisionsListPage
