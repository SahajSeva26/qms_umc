import { useState } from 'react'
import { FiSearch } from 'react-icons/fi'
import { usePermissionGroups } from '@/features/access-management/permission-group/hooks/usePermissionGroups'
import PermissionGroupsTable from '@/features/access-management/permission-group/components/PermissionGroupsTable'
import { Input } from '@/components/ui/input'

// Mirrors `@/features/admin/pages/UsersPage.tsx` exactly: local search state
// fed straight into the search query, loading/error/empty states, table below.

const PermissionGroupsListPage = () => {
  const [search, setSearch] = useState('')

  const { data, isLoading, error } = usePermissionGroups({ name: search || undefined })
  const groups = data?.data?.items ?? []

  return (
    <div className="max-w-5xl">
      <div className="mb-5">
        <h1 className="text-2xl font-bold" style={{ color: 'var(--qms-text)' }}>
          Permission Groups
        </h1>
        <p className="text-[13px] mt-1" style={{ color: 'var(--qms-text-muted)' }}>
          {data?.data ? `${data.data.count} total` : 'Manage permission groups and the permissions they grant.'}
        </p>
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
          Loading permission groups…
        </div>
      )}

      {error && !isLoading && (
        <div className="text-[13px] rounded-xl px-3 py-2 bg-danger-soft border border-danger text-danger">
          Failed to load permission groups. Please try again.
        </div>
      )}

      {!isLoading && !error && <PermissionGroupsTable groups={groups} />}
    </div>
  )
}

export default PermissionGroupsListPage
