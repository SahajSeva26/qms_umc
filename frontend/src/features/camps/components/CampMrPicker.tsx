import { useState } from 'react'
import { useAsyncPickerState } from '@/hooks/useAsyncPickerState'
import { useTenantScopedRolePicker } from '@/features/camps/hooks/useTenantScopedRolePicker'
import type { RoleEntity, RolePopulatedUser } from '@/types/accessManagement.types'
import AsyncPicker from '@/components/ui/AsyncPicker'

interface CampMrPickerProps {
  value: string
  label: string
  tenant: string | undefined
  onChange: (mrRoleId: string, mrLabel: string) => void
  disabled?: boolean
}

const mrLabel = (mr: RoleEntity) => `${mr.name} (${mr.code})`

// Search results always populate `user` (see RolesTable.tsx) — tolerate the
// raw-ObjectId-string shape defensively rather than assuming.
function mrContactDetails(user: RoleEntity['user']): string {
  if (typeof user === 'string') return ''
  const u = user as RolePopulatedUser
  const name = u?.firstName ? `${u.firstName} ${u.lastName ?? ''}`.trim() : ''
  return [name, u?.phone, u?.email].filter(Boolean).join(' · ')
}

const CampMrPicker = ({ value, label, tenant, onChange, disabled }: CampMrPickerProps) => {
  const [query, setQuery] = useState('')
  const { open, setOpen, containerRef } = useAsyncPickerState()

  const { roles: mrs, isFetching, error, hasMore, loadMore, refetch } = useTenantScopedRolePicker(query, tenant, 'pharma-mr', open)

  return (
    <AsyncPicker<RoleEntity>
      value={value}
      label={label}
      onChange={onChange}
      query={query}
      onQueryChange={setQuery}
      open={open}
      onOpenChange={setOpen}
      containerRef={containerRef}
      results={mrs}
      isFetching={isFetching && mrs.length === 0}
      getId={(mr) => mr.id}
      getLabel={mrLabel}
      searchPlaceholder={tenant ? 'Search MR by name…' : 'Select a company first'}
      clearAriaLabel="Clear selected MR"
      emptyQueryText={tenant ? 'Start typing to search MRs.' : undefined}
      noResultsText="No matching MRs found."
      // Taller than AsyncPicker's default (max-h-64) — this picker's two-line
      // rows make the default height feel cramped, same as PatientPicker.
      dropdownClassName="absolute left-0 right-0 top-full mt-1 z-50 p-1.5 rounded-lg bg-popover text-popover-foreground shadow-md ring-1 ring-foreground/10 max-h-96 overflow-y-auto"
      renderResult={(mr) => {
        const details = mrContactDetails(mr.user)
        return (
          <span className="flex flex-col">
            <span>{mrLabel(mr)}</span>
            {details && (
              <span className="text-[11px]" style={{ color: 'var(--qms-text-muted)' }}>
                {details}
              </span>
            )}
          </span>
        )
      }}
      isError={!!error}
      errorText="Couldn't search MRs. Try again."
      onRetry={() => refetch()}
      hasMore={hasMore}
      isLoadingMore={isFetching && mrs.length > 0}
      onLoadMore={loadMore}
      disabled={disabled}
    />
  )
}

export default CampMrPicker
