import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTenants, TENANT_ROUTES, CreateTenantDialog } from '@/features/access-management/tenant'
import { usePermission } from '@/hooks/usePermission'
import { useDebouncedValue } from '@/hooks/useDebouncedValue'
import { usePagination } from '@/hooks/usePagination'
import PaginationControls from '@/components/ui/PaginationControls'
import QueryStateBlock from '@/components/ui/QueryStateBlock'
import SearchInput from '@/components/ui/SearchInput'
import { Button } from '@/components/ui/button'
import type { Tenant, TenantStatus } from '@/types/accessManagement.types'
import { EMPTY_ARRAY } from '@/utils/emptyArray'

const PAGE_SIZE = 10

const STATUS_FILTERS: { value: TenantStatus | 'ALL'; label: string }[] = [
  { value: 'ALL', label: 'All' },
  { value: 'active', label: 'Active' },
  { value: 'inactive', label: 'Inactive' },
]

// Soft-rotating logo accent colors, cycled by position since our real Tenant has no stored brand color.
const LOGO_COLORS = ['#3b6dff', '#8b5cf6', '#14b8a6', '#f59e0b', '#f43f5e', '#10b981']

const statusPillClasses: Record<TenantStatus, string> = {
  active: 'bg-success-soft text-success',
  inactive: 'bg-danger-soft text-danger',
}
const statusLabel: Record<TenantStatus, string> = {
  active: 'Active',
  inactive: 'Inactive',
}

function initial(name: string): string {
  return name.trim().charAt(0).toUpperCase() || '?'
}

function location(tenant: Tenant): string {
  const parts = [tenant.address?.city, tenant.address?.state].filter(Boolean)
  return parts.join(', ')
}

// Stats reuse the same report=true tenant aggregation already wired on Client Management —
// Divisions is the one stat not yet batched server-side, shown as "—" instead of a fabricated count.
const PharmaClientsTab = () => {
  const navigate = useNavigate()
  const { hasPermission, hasAnyPermission } = usePermission()
  const canCreate = hasPermission('tenant:manage')
  // GET /tenants/:id requires tenant:get/tenant:manage — a tenant:search-only caller (sufficient
  // to reach this list) would 403 on open. Render cards non-navigable rather than let that happen.
  const canOpenDetail = hasAnyPermission(['tenant:get', 'tenant:manage'])

  const [statusFilter, setStatusFilter] = useState<TenantStatus | 'ALL'>('ALL')
  const [search, setSearch] = useState('')
  const debouncedSearch = useDebouncedValue(search, 300)
  const { page, setPage, totalPages, resetToFirstPage } = usePagination(PAGE_SIZE)

  const { data, isLoading, error, refetch } = useTenants({
    name: debouncedSearch || undefined,
    status: statusFilter === 'ALL' ? undefined : statusFilter,
    type: 'customer',
    page: String(page),
    limit: String(PAGE_SIZE),
    report: 'true',
  })
  const tenants = data?.data?.items ?? EMPTY_ARRAY
  const totalCount = data?.data?.count ?? 0

  const handleStatusChange = (value: TenantStatus | 'ALL') => {
    setStatusFilter(value)
    resetToFirstPage()
  }

  const handleSearchChange = (value: string) => {
    setSearch(value)
    resetToFirstPage()
  }

  return (
    <div>
      <div className="flex items-center justify-between gap-3 mb-4 flex-wrap">
        <div className="flex items-center gap-2 flex-wrap">
          {STATUS_FILTERS.map((f) => (
            <Button
              key={f.value}
              variant={statusFilter === f.value ? 'default' : 'outline'}
              size="sm"
              onClick={() => handleStatusChange(f.value)}
            >
              {f.label}
            </Button>
          ))}
          <SearchInput value={search} onChange={handleSearchChange} placeholder="Search by name..." className="w-56 text-[13px]" />
        </div>
        {canCreate && <CreateTenantDialog />}
      </div>

      {!isLoading && !error && (
        <div className="text-[12px] mb-3" style={{ color: 'var(--qms-text-muted)' }}>{totalCount} client{totalCount === 1 ? '' : 's'}</div>
      )}

      <QueryStateBlock isLoading={isLoading} error={error} loadingLabel="Loading clients…" errorLabel="Failed to load clients. Please try again." onRetry={refetch}>
        {tenants.length === 0 ? (
          <div className="text-[13px] py-10 text-center rounded-xl border border-dashed" style={{ color: 'var(--qms-text-muted)', borderColor: 'var(--qms-border)' }}>
            No clients in this filter.
          </div>
        ) : (
          <div className="grid gap-3.5" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))' }}>
            {tenants.map((tenant, i) => {
              const color = LOGO_COLORS[i % LOGO_COLORS.length]
              const status = tenant.status ?? 'active'
              return (
                <div
                  key={tenant.id}
                  onClick={canOpenDetail ? () => navigate(TENANT_ROUTES.TENANT_DETAIL.replace(':id', tenant.id)) : undefined}
                  onKeyDown={canOpenDetail ? (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); navigate(TENANT_ROUTES.TENANT_DETAIL.replace(':id', tenant.id)) } } : undefined}
                  role={canOpenDetail ? 'button' : undefined}
                  tabIndex={canOpenDetail ? 0 : undefined}
                  className={`rounded-xl border p-4 transition-transform ${canOpenDetail ? 'cursor-pointer hover:-translate-y-0.5 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-(--qms-brand)' : ''}`}
                  style={{ borderColor: 'var(--qms-border)', background: 'var(--qms-surface-card)', backdropFilter: 'blur(20px) saturate(140%)' }}
                >
                  <div className="flex items-center gap-3 mb-3">
                    <div
                      className="w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 font-extrabold text-lg text-white"
                      style={{ background: `linear-gradient(135deg, ${color}, var(--qms-teal))` }}
                    >
                      {initial(tenant.name)}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="font-bold text-[14px] truncate" style={{ color: 'var(--qms-text)' }}>{tenant.name}</div>
                      <div className="text-[11px] font-mono truncate" style={{ color: 'var(--qms-text-muted)' }}>{tenant.gst || '—'}</div>
                    </div>
                  </div>

                  <div className="grid grid-cols-4 gap-2 p-2.5 rounded-lg" style={{ background: 'var(--qms-surface-strong)', border: '1px solid var(--qms-border)' }}>
                    <div>
                      <div className="text-[13px] font-extrabold" style={{ color: 'var(--qms-text)' }}>—</div>
                      <div className="text-[9px] uppercase tracking-wide" style={{ color: 'var(--qms-text-muted)' }}>Divisions</div>
                    </div>
                    <div>
                      <div className="text-[13px] font-extrabold" style={{ color: 'var(--qms-text)' }}>{tenant.stats?.mrs ?? '—'}</div>
                      <div className="text-[9px] uppercase tracking-wide" style={{ color: 'var(--qms-text-muted)' }}>MRs</div>
                    </div>
                    <div>
                      <div className="text-[13px] font-extrabold" style={{ color: 'var(--qms-text)' }}>{tenant.stats?.totalProjects ?? '—'}</div>
                      <div className="text-[9px] uppercase tracking-wide" style={{ color: 'var(--qms-text-muted)' }}>Projects</div>
                    </div>
                    <div>
                      <div className="text-[13px] font-extrabold" style={{ color: 'var(--qms-text)' }}>{tenant.stats?.totalCamps ?? '—'}</div>
                      <div className="text-[9px] uppercase tracking-wide" style={{ color: 'var(--qms-text-muted)' }}>Camps</div>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 flex-wrap mt-2.5">
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wide ${statusPillClasses[status]}`}>
                      {statusLabel[status]}
                    </span>
                    <span
                      className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold"
                      style={{ background: 'color-mix(in oklab, var(--qms-brand) 10%, transparent)', color: 'var(--qms-brand)', border: '1px solid color-mix(in oklab, var(--qms-brand) 18%, transparent)' }}
                    >
                      PHARMA
                    </span>
                    {location(tenant) && (
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold" style={{ background: 'var(--qms-surface-strong)', color: 'var(--qms-text-soft)', border: '1px solid var(--qms-border)' }}>
                        {location(tenant)}
                      </span>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )}
        <PaginationControls page={page} totalPages={totalPages(totalCount)} onPageChange={setPage} />
      </QueryStateBlock>

    </div>
  )
}

export default PharmaClientsTab
