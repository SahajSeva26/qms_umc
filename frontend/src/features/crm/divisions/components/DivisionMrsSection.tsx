import { useState } from 'react'
import { FiPlus, FiUsers, FiSearch } from 'react-icons/fi'
import { useRoles } from '@/features/access-management/role/hooks/useRoles'
import { useRoleTypes } from '@/features/access-management/role-type/hooks/useRoleTypes'
import { usePermission } from '@/hooks/usePermission'
import { useDebouncedValue } from '@/hooks/useDebouncedValue'
import { usePagination } from '@/hooks/usePagination'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select'
import PaginationControls from '@/components/ui/PaginationControls'
import QueryStateBlock from '@/components/ui/QueryStateBlock'
import SideDrawer from '@/components/ui/SideDrawer'
import DivisionMrsTable from '@/features/crm/divisions/components/DivisionMrsTable'
import MrProvisioningCard from '@/features/crm/divisions/components/MrProvisioningCard'
import type { RoleStatus } from '@/types/accessManagement.types'
import { EMPTY_ARRAY } from '@/utils/emptyArray'

interface DivisionMrsSectionProps {
  tenantId: string
  divisionId: string
}

const PAGE_SIZE = 10

const STATUS_OPTIONS: { value: RoleStatus | 'all'; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'active', label: 'Active' },
  { value: 'inactive', label: 'Inactive' },
]

// Merges "see the MRs that exist" (a real list) with "add one" (the
// single/CSV form, moved into a drawer) into one section — same shape as
// DivisionContactsSection.tsx: icon badge + heading + live count + action
// button, search, QueryStateBlock-wrapped table, pagination.
const DivisionMrsSection = ({ tenantId, divisionId }: DivisionMrsSectionProps) => {
  const { hasAnyPermission } = usePermission()
  // Deliberately NOT including role:search, even though GET /roles itself
  // accepts it — the dependent GET /role-types lookup below (needed to
  // resolve the MR role-type id) has no role:search fallback at all, so a
  // role:search-only caller would reach a section that can never load.
  const canView = hasAnyPermission(['tenant:admin', 'tenant:manage'])
  const canAdd = canView

  const [search, setSearch] = useState('')
  const debouncedSearch = useDebouncedValue(search, 300)
  const [statusFilter, setStatusFilter] = useState<RoleStatus | 'all'>('all')
  const { page, setPage, totalPages, resetToFirstPage } = usePagination(PAGE_SIZE)
  const [addDrawerOpen, setAddDrawerOpen] = useState(false)

  const {
    data: mrRoleTypeData,
    isLoading: isLoadingMrType,
    isError: isMrTypeError,
    refetch: refetchMrType,
  } = useRoleTypes(
    { code: 'pharma-mr', status: 'active', tenant: tenantId },
    !!tenantId && canView,
  )
  const mrRoleTypeId = mrRoleTypeData?.data?.items?.[0]?.id
  // "Missing" only once the lookup itself genuinely succeeded with no result —
  // an error must show a retry state, not be reported as bad tenant setup
  // (same distinction MrProvisioningCard's own roleTypeMissing check makes).
  const mrTypeMissing = !isLoadingMrType && !isMrTypeError && !mrRoleTypeId

  const { data, isLoading, error, refetch } = useRoles(
    {
      tenant: tenantId,
      division: divisionId,
      type: mrRoleTypeId,
      status: statusFilter === 'all' ? undefined : statusFilter,
      user: debouncedSearch || undefined,
      page: String(page),
      limit: String(PAGE_SIZE),
    },
    !!tenantId && !!divisionId && !!mrRoleTypeId && canView,
  )
  const mrs = data?.data?.items ?? EMPTY_ARRAY
  const totalCount = data?.data?.count ?? 0

  if (!canView) return null

  const isListLoading = isLoading || isLoadingMrType

  return (
    <div>
      <div className="mb-3 flex items-start justify-between gap-4">
        <div className="flex items-center gap-2">
          <div
            className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
            style={{ background: 'color-mix(in oklch, var(--qms-brand), transparent 88%)' }}
          >
            <FiUsers size={14} style={{ color: 'var(--qms-brand)' }} />
          </div>
          <div>
            <h2 className="text-base font-bold" style={{ color: 'var(--qms-text)' }}>MRs</h2>
            <p className="text-[12px] mt-0.5" style={{ color: 'var(--qms-text-muted)' }}>
              {!isListLoading && !error ? `${totalCount} total` : 'MRs for this division.'}
            </p>
          </div>
        </div>
        {canAdd && (
          <Button
            onClick={() => setAddDrawerOpen(true)}
            className="text-white shrink-0"
            style={{ background: 'linear-gradient(135deg, var(--qms-brand), var(--qms-teal))' }}
          >
            <FiPlus size={14} /> Add MRs
          </Button>
        )}
      </div>

      <div className="mb-3 flex flex-wrap items-center gap-2">
        <div className="relative">
          <FiSearch
            size={13}
            className="absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none"
            style={{ color: 'var(--qms-text-muted)' }}
          />
          <Input
            placeholder="Search by name or email..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); resetToFirstPage() }}
            className="pl-8 text-[13px] max-w-xs"
          />
        </div>
        <Select
          value={statusFilter}
          onValueChange={(v) => { setStatusFilter((v as RoleStatus | 'all') ?? 'all'); resetToFirstPage() }}
        >
          <SelectTrigger className="w-32 text-[13px]">
            <SelectValue>{(v: string) => STATUS_OPTIONS.find((o) => o.value === v)?.label ?? 'All'}</SelectValue>
          </SelectTrigger>
          <SelectContent>
            {STATUS_OPTIONS.map((o) => (
              <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {isMrTypeError ? (
        <div className="text-[12px] rounded-xl px-3 py-2 bg-danger-soft border border-danger text-danger flex items-center justify-between gap-2">
          <span>Couldn't load role configuration for this tenant.</span>
          <button
            type="button"
            className="font-semibold underline decoration-dotted underline-offset-2 hover:no-underline shrink-0"
            onClick={() => refetchMrType()}
          >
            Retry
          </button>
        </div>
      ) : mrTypeMissing ? (
        <div className="text-[12px] rounded-xl px-3 py-2 bg-danger-soft border border-danger text-danger">
          This tenant is missing a required role type (MR) — contact an admin to configure it.
        </div>
      ) : (
        <QueryStateBlock isLoading={isListLoading} error={error} loadingLabel="Loading MRs…" errorLabel="Failed to load MRs. Please try again." onRetry={refetch}>
          <DivisionMrsTable mrs={mrs} />
          <PaginationControls page={page} totalPages={totalPages(totalCount)} onPageChange={setPage} />
        </QueryStateBlock>
      )}

      <SideDrawer open={addDrawerOpen} title="Add MRs" onClose={() => setAddDrawerOpen(false)}>
        <MrProvisioningCard
          tenantId={tenantId}
          divisionId={divisionId}
          onSingleCreated={() => setAddDrawerOpen(false)}
        />
      </SideDrawer>
    </div>
  )
}

export default DivisionMrsSection
