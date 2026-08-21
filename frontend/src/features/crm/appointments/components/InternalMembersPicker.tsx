import { useState } from 'react'
import { FiUserPlus, FiX } from 'react-icons/fi'
import { Input } from '@/components/ui/input'
import { useRoles } from '@/features/access-management/role/hooks/useRoles'
import { useTenants } from '@/features/access-management/tenant/hooks/useTenants'
import { useDebouncedValue } from '@/hooks/useDebouncedValue'
import { useAsyncPickerState } from '@/hooks/useAsyncPickerState'
import { PLATFORM_TENANT_CODE, PLATFORM_TENANT_FETCH_LIMIT } from '@/features/access-management/accessManagement.constants'
import type { RoleEntity } from '@/types/accessManagement.types'

interface SelectedMember {
  roleId: string
  label: string
}

interface InternalMembersPickerProps {
  selected: SelectedMember[]
  onChange: (members: SelectedMember[]) => void
}

// Not a base-ui Popover — its Trigger fights a live text input needing keyboard focus.
// "QMS side" = the platform tenant, scoped via `tenant: platformTenant.id`.
const InternalMembersPicker = ({ selected, onChange }: InternalMembersPickerProps) => {
  const [query, setQuery] = useState('')
  const debouncedQuery = useDebouncedValue(query)
  const { open, setOpen, containerRef } = useAsyncPickerState()

  const { data: tenantData } = useTenants({ type: 'platform', status: 'active', limit: PLATFORM_TENANT_FETCH_LIMIT })
  const platformTenant = tenantData?.data?.items.find((t) => t.type === 'platform' || t.code === PLATFORM_TENANT_CODE)

  const { data, isFetching } = useRoles(
    { user: debouncedQuery.trim(), tenant: platformTenant?.id, status: 'active', limit: '10' },
    !!debouncedQuery.trim() && !!platformTenant,
  )
  const results = data?.data?.items ?? []
  const selectedIds = new Set(selected.map((m) => m.roleId))
  const addableResults = results.filter((r) => !selectedIds.has(r.id))

  const roleLabel = (role: RoleEntity) => {
    const user = typeof role.user === 'string' ? null : role.user
    return user ? `${role.name} (${user.email})` : role.name
  }

  const addMember = (role: RoleEntity) => {
    onChange([...selected, { roleId: role.id, label: roleLabel(role) }])
    setQuery('')
    setOpen(false)
  }

  const removeMember = (roleId: string) => {
    onChange(selected.filter((m) => m.roleId !== roleId))
  }

  return (
    <div ref={containerRef} className="relative">
      <Input
        placeholder="Search by name or email..."
        value={query}
        onChange={(e) => { setQuery(e.target.value); setOpen(true) }}
        onFocus={() => setOpen(true)}
      />

      {open && (
        <div
          className="absolute left-0 right-0 top-full mt-1 z-50 p-1.5 rounded-lg bg-popover text-popover-foreground shadow-md ring-1 ring-foreground/10"
        >
          {isFetching && (
            <div className="text-[12px] px-2 py-2" style={{ color: 'var(--qms-text-muted)' }}>Searching…</div>
          )}
          {!isFetching && debouncedQuery.trim() && addableResults.length === 0 && (
            <div className="text-[12px] px-2 py-2" style={{ color: 'var(--qms-text-muted)' }}>No matching people found.</div>
          )}
          {!isFetching && !debouncedQuery.trim() && (
            <div className="text-[12px] px-2 py-2" style={{ color: 'var(--qms-text-muted)' }}>Type a name or email to search.</div>
          )}
          {addableResults.map((role) => (
            <button
              key={role.id}
              type="button"
              onClick={() => addMember(role)}
              className="w-full flex items-center gap-2 text-left text-[13px] px-2 py-1.5 rounded-md transition-colors hover:bg-(--qms-surface-hover)"
              style={{ color: 'var(--qms-text)' }}
            >
              <FiUserPlus size={13} style={{ color: 'var(--qms-text-muted)' }} />
              <span className="truncate">{roleLabel(role)}</span>
            </button>
          ))}
        </div>
      )}

      {selected.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mt-2">
          {selected.map((m) => (
            <span
              key={m.roleId}
              className="flex items-center gap-1 text-[11px] font-semibold px-2 py-1 rounded-full"
              style={{ background: 'var(--qms-brand)', color: '#fff' }}
            >
              {m.label}
              <button type="button" onClick={() => removeMember(m.roleId)} aria-label={`Remove ${m.label}`}>
                <FiX size={12} style={{ color: '#fff' }} />
              </button>
            </span>
          ))}
        </div>
      )}
    </div>
  )
}

export default InternalMembersPicker
