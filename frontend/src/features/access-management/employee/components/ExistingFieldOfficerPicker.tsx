import { useState } from 'react'
import { FiCheckCircle, FiSearch } from 'react-icons/fi'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { useFieldOfficerRolePicker } from '@/features/access-management/employee/hooks/useFieldOfficerRolePicker'
import type { RoleEntity, RolePopulatedUser } from '@/types/accessManagement.types'

export interface PickedFieldOfficer {
  userId: string
  email: string
  phone: string
  gender?: 'male' | 'female' | 'other'
  label: string
}

interface ExistingFieldOfficerPickerProps {
  tenant: string | undefined
  foTypeId: string | undefined
  value: string | null
  onChange: (picked: PickedFieldOfficer) => void
}

const MIN_SEARCH_LENGTH = 2

// Returns the populated User, or null if the Role's user is either a raw (unpopulated) id or a
// genuine dangling reference (the linked User was hard-deleted — Mongoose resolves that to
// `role.user: null`). Both cases mean "no usable user data," but blockReason below surfaces them
// with different messages, since only one of them is a real data-integrity problem.
function populatedUser(role: RoleEntity): RolePopulatedUser | null {
  if (role.user === null || typeof role.user === 'string') return null
  return role.user
}

function roleLabel(role: RoleEntity): string {
  const user = populatedUser(role)
  if (!user?.firstName) return role.code
  return `${user.firstName} ${user.lastName ?? ''}`.trim()
}

// Blocks a row whose linked User can't safely be linked to an Employee record.
function blockReason(role: RoleEntity): string | null {
  if (role.user === null) {
    return "This account's linked user no longer exists — it can't be linked. Use Onboard a new person instead."
  }
  if (typeof role.user === 'string') {
    return "This account's details could not be loaded — try refreshing, or use Onboard a new person instead."
  }
  const user = role.user
  if (user.status && user.status !== 'active') {
    return `This account is ${user.status} — reactivate the user before linking, or use Onboard a new person instead.`
  }
  if (!user.phone) {
    return "This account has no phone number on file — add one to the user's profile before linking, or use Onboard a new person instead."
  }
  return null
}

const ExistingFieldOfficerPicker = ({ tenant, foTypeId, value, onChange }: ExistingFieldOfficerPickerProps) => {
  const [search, setSearch] = useState('')
  const [blockedRoleId, setBlockedRoleId] = useState<string | null>(null)

  const { items, isFetching, isFetchingNextPage, error, hasNextPage, fetchNextPage, isDebouncing, hasSearchableQuery } =
    useFieldOfficerRolePicker(search, tenant, foTypeId, true)

  const handleSelect = (role: RoleEntity) => {
    const reason = blockReason(role)
    if (reason) {
      setBlockedRoleId(role.id)
      return
    }
    setBlockedRoleId(null)
    const user = populatedUser(role)
    if (!user) {
      // Unreachable given blockReason above, but this is an external, nullable relation — never
      // trust that invariant silently via a forced assertion. If it ever does drift, surface it
      // the same way every other unlinkable row is surfaced, not a silent no-op click.
      setBlockedRoleId(role.id)
      return
    }
    onChange({
      userId: user._id ?? '',
      email: user.email,
      phone: user.phone ?? '',
      gender: user.gender,
      label: roleLabel(role),
    })
  }

  return (
    <div className="space-y-2">
      <div className="relative">
        <FiSearch size={14} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--qms-text-muted)' }} />
        <Input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search field officers by name or email…"
          className="pl-8"
        />
      </div>

      {!hasSearchableQuery && !isDebouncing && (
        <p className="text-[12px] py-3 text-center rounded-xl border" style={{ borderColor: 'var(--qms-border)', color: 'var(--qms-text-muted)' }}>
          Type at least {MIN_SEARCH_LENGTH} characters to search.
        </p>
      )}
      {hasSearchableQuery && (isFetching || isDebouncing) && items.length === 0 && (
        <p className="text-[12px] py-3 text-center" style={{ color: 'var(--qms-text-muted)' }}>Searching…</p>
      )}
      {hasSearchableQuery && !isDebouncing && error && (
        <p className="text-[12px] text-danger">Couldn't search field officers — try again.</p>
      )}
      {hasSearchableQuery && !isDebouncing && !isFetching && !error && items.length === 0 && (
        <p className="text-[12px] py-3 text-center rounded-xl border" style={{ borderColor: 'var(--qms-border)', color: 'var(--qms-text-muted)' }}>
          No field officers match "{search.trim()}".
        </p>
      )}

      {items.length > 0 && (
        <div className="space-y-1.5 max-h-72 overflow-y-auto">
          {items.map((role) => {
            const user = populatedUser(role)
            const active = value === (user?._id ?? null)
            return (
              <div key={role.id}>
                <button
                  type="button"
                  aria-pressed={active}
                  onClick={() => handleSelect(role)}
                  className="w-full flex items-center justify-between gap-3 p-2.5 rounded-xl border text-left transition-colors"
                  style={
                    active
                      ? { borderColor: 'var(--qms-brand)', background: 'color-mix(in srgb, var(--qms-brand) 8%, transparent)' }
                      : { borderColor: 'var(--qms-border)', background: 'var(--qms-surface)' }
                  }
                >
                  <div className="min-w-0">
                    <div className="text-[12.5px] font-bold truncate" style={{ color: 'var(--qms-text)' }}>{roleLabel(role)}</div>
                    <div className="text-[11px] truncate" style={{ color: 'var(--qms-text-muted)' }}>{user?.email ?? role.code}</div>
                  </div>
                  {active && <FiCheckCircle size={16} style={{ color: 'var(--qms-brand)' }} className="shrink-0" />}
                </button>
                {blockedRoleId === role.id && (
                  <p className="text-[11px] text-danger mt-1.5 px-1">{blockReason(role)}</p>
                )}
              </div>
            )
          })}

          {hasNextPage && (
            <Button type="button" variant="outline" size="sm" className="w-full" onClick={() => void fetchNextPage()} disabled={isFetchingNextPage}>
              {isFetchingNextPage ? 'Loading…' : 'Load more'}
            </Button>
          )}
        </div>
      )}
    </div>
  )
}

export default ExistingFieldOfficerPicker
