import { useState } from 'react'
import { FiPlus } from 'react-icons/fi'
import { usePermission } from '@/hooks/usePermission'
import { useDivisions } from '@/features/crm/hooks/useDivisions'
import { useDivisionsFilters } from '@/features/crm/divisions/hooks/useDivisionsFilters'
import DivisionsFilterBar from '@/features/crm/divisions/components/DivisionsFilterBar'
import DivisionsTable from '@/features/crm/divisions/components/DivisionsTable'
import CreateDivisionModal from '@/features/crm/divisions/components/CreateDivisionModal'
import EditDivisionModal from '@/features/crm/divisions/components/EditDivisionModal'
import { Button } from '@/components/ui/button'
import { useDebouncedValue } from '@/hooks/useDebouncedValue'
import type { DivisionEntity } from '@/types/crm.types'

// Tenant-admin-facing Divisions screen — reuses crmService's real,
// backend-wired Division endpoints (built during the CRM/Lead migration)
// but scoped and gated differently from CRM's own read-only consumption:
// CRM only ever READS divisions to populate a picker; this screen is where
// a customer tenant's own admin creates/manages them.
//
// No `tenantId` sent here — matches ContactsPage.tsx's own convention.
// contextBuilder.ts's ctx.where() is the REAL scoping boundary: a customer
// caller is force-scoped server-side to their own tenant no matter what's
// sent, while a platform caller (e.g. system@gmail.com) gets NO tenant
// filter at all and sees every tenant's divisions — sending our own
// session.tenant.id here was a bug (fixed 2026-07-31): it forced a platform
// admin to only ever see divisions belonging to the platform's OWN tenant
// (which structurally has none), making every other company's divisions
// invisible to exactly the accounts that most need to see all of them.
//
// Exactly ONE call per settle, always — collapsed 2026-07-31 from the old
// "fire two parallel active+inactive queries and merge" approach (the same
// wasteful-call pattern found and fixed on the Users page). Status now
// always resolves to one concrete value (see useDivisionsFilters.ts), and
// search is debounced, so this page never fires more than the bare minimum
// the current filter state actually needs.
const DivisionsListPage = () => {
  const { hasAnyPermission } = usePermission()
  const { filters, setFilter, reset } = useDivisionsFilters()
  const [createOpen, setCreateOpen] = useState(false)
  const [editingDivision, setEditingDivision] = useState<DivisionEntity | null>(null)

  // Only accounts holding division:manage/tenant:manage can ever get a
  // non-active result back (division.service.ts's status-override gate) —
  // see DivisionsFilterBar's own canSeeInactive prop for where this also
  // hides the Inactive/All options from the dropdown itself.
  const canSeeInactive = hasAnyPermission(['division:manage', 'tenant:manage'])

  const debouncedSearch = useDebouncedValue(filters.search, 300)
  const debouncedCode = useDebouncedValue(filters.code, 300)

  const { data, isLoading, error } = useDivisions({
    name: debouncedSearch || undefined,
    code: debouncedCode || undefined,
    therapy: filters.therapy === 'ALL' ? undefined : filters.therapy,
    status: filters.status,
    limit: '10',
  })

  const divisions = data?.data?.items ?? []
  const totalCount = data?.data?.count ?? 0

  return (
    <div className="w-full">
      <div className="mb-5 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: 'var(--qms-text)' }}>
            Divisions
          </h1>
          <p className="text-[13px] mt-1" style={{ color: 'var(--qms-text-muted)' }}>
            {!isLoading && !error ? `${totalCount} total` : 'Manage divisions across your company.'}
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

      <DivisionsFilterBar filters={filters} setFilter={setFilter} reset={reset} canSeeInactive={canSeeInactive} />

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

      {!isLoading && !error && <DivisionsTable divisions={divisions} onRowClick={setEditingDivision} />}

      {createOpen && <CreateDivisionModal onClose={() => setCreateOpen(false)} />}
      {editingDivision && <EditDivisionModal division={editingDivision} onClose={() => setEditingDivision(null)} />}
    </div>
  )
}

export default DivisionsListPage
