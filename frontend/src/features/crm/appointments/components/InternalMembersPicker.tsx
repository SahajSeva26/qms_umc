import { useEffect, useRef, useState } from 'react'
import { FiUserPlus, FiX } from 'react-icons/fi'
import { Input } from '@/components/ui/input'
import { useRoles } from '@/features/access-management/role/hooks/useRoles'
import { useTenants } from '@/features/access-management/tenant/hooks/useTenants'
import { PLATFORM_TENANT_CODE } from '@/features/access-management/accessManagement.constants'
import type { RoleEntity } from '@/types/accessManagement.types'

interface SelectedMember {
  roleId: string
  label: string
}

interface InternalMembersPickerProps {
  selected: SelectedMember[]
  onChange: (members: SelectedMember[]) => void
}

// Free-text typeahead over GET /roles?user=<keyword> (role.service.ts's
// search(), 2026-07-27 — resolves against the linked user's first/last name
// or email server-side). No existing multi-select-with-search component in
// this codebase to reuse, so this is a small, self-contained picker: an
// Input with a plain, manually-positioned results list underneath (NOT a
// base-ui Popover — Popover.Trigger manages its own focus/open state around
// a single click-to-toggle button, which fights a live text input that
// needs to keep keyboard focus while the user types; that mismatch caused
// the list to flash open and immediately close, blocking typing entirely —
// fixed 2026-08-01 by dropping Popover for this field and controlling
// open/close with plain state + a click-outside listener instead). Clicking
// a result adds it as a removable chip below. Debounced locally (300ms)
// since every keystroke would otherwise fire a fresh search request.
//
// "QMS side" means the platform tenant specifically — the search is scoped
// to it via `tenant: platformTenant.id` (found 2026-08-03: without this, a
// platform-tenant caller's search is entirely unscoped server-side —
// role.service.ts's search() only restricts a CUSTOMER-tenant caller from
// leaking across tenants; a platform caller sees every tenant's roles by
// default — so this field was silently offering customer-side admins, e.g.
// "cipla pvt ltd's admin role," as if they were QMS internal staff).
const InternalMembersPicker = ({ selected, onChange }: InternalMembersPickerProps) => {
  const [query, setQuery] = useState('')
  const [debouncedQuery, setDebouncedQuery] = useState('')
  const [open, setOpen] = useState(false)
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)
  const containerRef = useRef<HTMLDivElement>(null)

  const { data: tenantData } = useTenants({ status: 'active' })
  // tenant.type is only present on the wire for a system:manage caller
  // (TenantMapper.toResponse) — code is always present regardless of
  // permission, so match on it as a fallback. Same pattern already used by
  // WizardStep4.tsx/WizardStep5.tsx/EditProjectModal.tsx for this exact
  // platform-tenant lookup.
  const platformTenant = tenantData?.data?.items.find((t) => t.type === 'platform' || t.code === PLATFORM_TENANT_CODE)

  useEffect(() => {
    clearTimeout(timeoutRef.current)
    timeoutRef.current = setTimeout(() => setDebouncedQuery(query), 300)
    return () => clearTimeout(timeoutRef.current)
  }, [query])

  useEffect(() => {
    if (!open) return
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [open])

  // `enabled: !!debouncedQuery.trim() && !!platformTenant` — NOT `{ limit:
  // '0' }` (fixed 2026-08-03): Mongoose's `.find().limit(0)` means "no limit
  // at all," not "return nothing" — this was silently fetching every role in
  // the system, unscoped, whenever the search box was empty (its default
  // state). `tenant: platformTenant.id` scopes the search to QMS internal
  // staff only, matching this field's own "QMS side" label.
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
    setDebouncedQuery('')
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
