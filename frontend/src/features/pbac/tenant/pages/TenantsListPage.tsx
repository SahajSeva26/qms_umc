import { useState } from 'react'
import { FiSearch } from 'react-icons/fi'
import { useTenants } from '@/features/pbac/tenant/hooks/useTenants'
import TenantsTable from '@/features/pbac/tenant/components/TenantsTable'
import CreateTenantDialog from '@/features/pbac/tenant/components/CreateTenantDialog'
import { Input } from '@/components/ui/input'

// Matches `@/features/admin/pages/UsersPage.tsx` exactly: search input feeds
// the react-query hook, loading/error/empty states rendered inline, no
// shadcn Table. Adds a "New Tenant" trigger button next to the search bar.
const TenantsListPage = () => {
  const [search, setSearch] = useState('')

  const { data, isLoading, error } = useTenants({ name: search || undefined })
  const tenants = data?.data?.items ?? []

  return (
    <div className="max-w-5xl">
      <div className="mb-5 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: 'var(--qms-text)' }}>
            Tenants
          </h1>
          <p className="text-[13px] mt-1" style={{ color: 'var(--qms-text-muted)' }}>
            {data?.data ? `${data.data.count} total` : 'Manage tenants on the platform.'}
          </p>
        </div>
        <CreateTenantDialog />
      </div>

      <div className="relative max-w-sm mb-4">
        <FiSearch
          size={15}
          className="absolute left-3 top-1/2 -translate-y-1/2"
          style={{ color: 'var(--qms-text-muted)' }}
        />
        <Input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by name..."
          className="pl-9 text-[13px] md:text-[13px]"
        />
      </div>

      {isLoading && (
        <div className="text-[13px] py-10 text-center" style={{ color: 'var(--qms-text-muted)' }}>
          Loading tenants…
        </div>
      )}

      {error && !isLoading && (
        <div className="text-[13px] rounded-xl px-3 py-2 bg-danger-soft border border-danger text-danger">
          Failed to load tenants. Please try again.
        </div>
      )}

      {!isLoading && !error && <TenantsTable tenants={tenants} />}
    </div>
  )
}

export default TenantsListPage
