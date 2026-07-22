import { useState } from 'react'
import { FiSearch } from 'react-icons/fi'
import { useUsers } from '@/features/admin/hooks/useUsers'
import UsersTable from '@/features/admin/components/UsersTable'
import { Input } from '@/components/ui/input'

const UsersPage = () => {
  const [search, setSearch] = useState('')

  const { data, isLoading, error } = useUsers({ name: search || undefined })
  const users = data?.data?.items ?? []

  return (
    <div className="max-w-5xl">
      <div className="mb-5">
        <h1 className="text-2xl font-bold" style={{ color: 'var(--qms-text)' }}>
          Users
        </h1>
        <p className="text-[13px] mt-1" style={{ color: 'var(--qms-text-muted)' }}>
          {data?.data ? `${data.data.count} total` : 'Manage platform users and their roles.'}
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
          Loading users…
        </div>
      )}

      {error && !isLoading && (
        <div className="text-[13px] rounded-xl px-3 py-2 bg-danger-soft border border-danger text-danger">
          Failed to load users. Please try again.
        </div>
      )}

      {!isLoading && !error && <UsersTable users={users} />}
    </div>
  )
}

export default UsersPage
