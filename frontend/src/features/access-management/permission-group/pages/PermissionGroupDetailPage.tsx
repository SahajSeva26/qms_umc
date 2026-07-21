import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { FiArrowLeft } from 'react-icons/fi'
import type { IPermission } from '@/types/accessManagement.types'
import { usePermissionGroup } from '@/features/access-management/permission-group/hooks/usePermissionGroup'
import { useUpdatePermissionGroup } from '@/features/access-management/permission-group/hooks/useUpdatePermissionGroup'
import { PERMISSION_GROUP_ROUTES } from '@/features/access-management/permission-group/permission-group.routes'
import { PERMISSION_CATALOG, PERMISSION_CATALOG_FLAT, PERMISSION_RESOURCE_LABELS } from '@/features/access-management/permission-group/constants/permissionCatalog'
import PermissionGroupStatusPill from '@/features/access-management/permission-group/components/PermissionGroupStatusPill'
import { Button } from '@/components/ui/button'
import { Accordion, AccordionItem, AccordionTrigger, AccordionPanel } from '@/components/ui/accordion'
import { updatePermissionGroupSchema } from '@/features/access-management/permission-group/schemas/permissionGroup.schemas'
import { useScrollIntoViewOnChange } from '@/hooks/useScrollIntoViewOnChange'

// Mirrors `@/features/admin/pages/UserDetailPage.tsx`'s overall shape (back
// link, header summary card, editable card below, save button wired to a
// useUpdate* mutation with isPending/isError/isSuccess feedback) — but the
// editable section here is the permission-group "shopping cart": every
// permission in the full PERMISSION_CATALOG (see that file's own header
// comment for the current code/resource count — it drifts as backend
// modules add permissions, so don't hardcode a number here too) is
// always rendered as a checkbox, grouped by resource, with the group's
// currently-granted permissions pre-checked. Toggling a box adds/removes
// that permission from local state; Save sends the full resulting list to
// PUT /permission-groups/:id via UpdatePermissionGroupPayload.permissions
// (IPermission[], not bare codes — see accessManagement.types.ts).

const PermissionGroupDetailPage = () => {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { data, isLoading, error } = usePermissionGroup(id)
  const group = data?.data ?? null

  const updatePermissionGroup = useUpdatePermissionGroup(id ?? '')

  const [selectedCodes, setSelectedCodes] = useState<Set<string>>(new Set())
  const [formError, setFormError] = useState<string | null>(null)
  const errorRef = useScrollIntoViewOnChange<HTMLDivElement>(formError)

  useEffect(() => {
    if (group) {
      setSelectedCodes(new Set((group.permissions ?? []).map((p) => p.code)))
    }
  }, [group])

  const toggleCode = (permission: IPermission) => {
    setSelectedCodes((prev) => {
      const next = new Set(prev)
      if (next.has(permission.code)) {
        next.delete(permission.code)
      } else {
        next.add(permission.code)
      }
      return next
    })
  }

  const handleSave = () => {
    const permissions = PERMISSION_CATALOG_FLAT.filter((permission) => selectedCodes.has(permission.code))

    const result = updatePermissionGroupSchema.safeParse({ permissions })
    if (!result.success) {
      setFormError(result.error.issues[0].message)
      return
    }
    setFormError(null)
    updatePermissionGroup.mutate(result.data)
  }

  return (
    <div className="max-w-3xl">
      <button
        onClick={() => navigate(PERMISSION_GROUP_ROUTES.PERMISSION_GROUPS)}
        className="flex items-center gap-1.5 text-[13px] font-semibold mb-5 transition-colors hover:opacity-80"
        style={{ color: 'var(--qms-text-soft)' }}
      >
        <FiArrowLeft size={14} />
        Back to permission groups
      </button>

      {isLoading && (
        <div className="text-[13px] py-10 text-center" style={{ color: 'var(--qms-text-muted)' }}>
          Loading permission group…
        </div>
      )}

      {error && !isLoading && (
        <div className="text-[13px] rounded-xl px-3 py-2 bg-danger-soft border border-danger text-danger">
          Failed to load permission group. Please try again.
        </div>
      )}

      {group && !isLoading && (
        <>
          <div
            className="rounded-xl border p-5 mb-5"
            style={{ borderColor: 'var(--qms-border)', background: 'var(--qms-surface-card)' }}
          >
            <div className="flex items-center gap-3 flex-wrap">
              <div className="min-w-0">
                <div className="text-lg font-bold truncate" style={{ color: 'var(--qms-text)' }}>
                  {group.name}
                </div>
                <div className="text-[13px] truncate" style={{ color: 'var(--qms-text-muted)' }}>
                  {group.code}
                </div>
              </div>
              <PermissionGroupStatusPill status={group.status} />
            </div>
            {group.description && (
              <p className="text-[13px] mt-3" style={{ color: 'var(--qms-text-soft)' }}>
                {group.description}
              </p>
            )}
            <div className="text-[11px] mt-3" style={{ color: 'var(--qms-text-muted)' }}>
              Tenant: {group.tenant}
            </div>
          </div>

          <div
            className="rounded-xl border p-5"
            style={{ borderColor: 'var(--qms-border)', background: 'var(--qms-surface-card)' }}
          >
            <div className="flex items-center justify-between mb-1">
              <h2 className="text-sm font-bold" style={{ color: 'var(--qms-text)' }}>
                Permissions
              </h2>
              <span className="text-[11px] font-semibold" style={{ color: 'var(--qms-text-muted)' }}>
                {selectedCodes.size} of {PERMISSION_CATALOG_FLAT.length} selected
              </span>
            </div>
            <p className="text-[12px] mb-4" style={{ color: 'var(--qms-text-muted)' }}>
              Every permission in the system is listed below, grouped by resource. Check the ones this group should grant.
            </p>

            <Accordion multiple defaultValue={Object.keys(PERMISSION_CATALOG)}>
              {(Object.entries(PERMISSION_CATALOG) as [keyof typeof PERMISSION_CATALOG, typeof PERMISSION_CATALOG[keyof typeof PERMISSION_CATALOG]][]).map(([resourceKey, resourceActions]) => {
                const resourcePermissions = Object.values(resourceActions)
                const resourceSelectedCount = resourcePermissions.filter((permission) => selectedCodes.has(permission.code)).length

                return (
                  <AccordionItem key={resourceKey} value={resourceKey}>
                    <AccordionTrigger style={{ color: 'var(--qms-text-muted)' }}>
                      <span className="flex items-center gap-2">
                        {PERMISSION_RESOURCE_LABELS[resourceKey]}
                        <span
                          className="normal-case tracking-normal font-medium text-[10px] px-1.5 py-0.5 rounded-full"
                          style={{
                            background: resourceSelectedCount > 0 ? 'color-mix(in oklch, var(--qms-brand), transparent 88%)' : 'var(--qms-surface-hover)',
                            color: resourceSelectedCount > 0 ? 'var(--qms-brand)' : 'var(--qms-text-muted)',
                          }}
                        >
                          {resourceSelectedCount}/{resourcePermissions.length}
                        </span>
                      </span>
                    </AccordionTrigger>
                    <AccordionPanel>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {resourcePermissions.map((permission) => {
                          const checked = selectedCodes.has(permission.code)
                          return (
                            <label
                              key={permission.code}
                              className="flex items-start gap-2.5 rounded-lg border px-3 py-2 cursor-pointer transition-colors hover:bg-(--qms-surface-hover)"
                              style={{
                                borderColor: checked ? 'var(--qms-brand)' : 'var(--qms-border)',
                                background: checked ? 'color-mix(in oklch, var(--qms-brand), transparent 92%)' : 'transparent',
                              }}
                            >
                              <input
                                type="checkbox"
                                checked={checked}
                                onChange={() => toggleCode(permission)}
                                className="mt-0.5 accent-(--qms-brand)"
                              />
                              <span className="min-w-0">
                                <span className="block text-[13px] font-semibold truncate" style={{ color: 'var(--qms-text)' }}>
                                  {permission.name}
                                </span>
                                <span className="block text-[11px] font-mono truncate" style={{ color: 'var(--qms-text-muted)' }}>
                                  {permission.code}
                                </span>
                              </span>
                            </label>
                          )
                        })}
                      </div>
                    </AccordionPanel>
                  </AccordionItem>
                )
              })}
            </Accordion>

            {updatePermissionGroup.isError && (
              <div className="text-xs rounded-xl px-3 py-2 bg-danger-soft border border-danger text-danger mt-4">
                {(updatePermissionGroup.error as { response?: { data?: { message?: string } } })?.response?.data?.message ||
                  'Failed to save changes.'}
              </div>
            )}
            {updatePermissionGroup.isSuccess && (
              <div className="text-xs rounded-xl px-3 py-2 bg-success-soft text-success mt-4">
                Saved.
              </div>
            )}

            {formError && (
              <div ref={errorRef} className="text-xs rounded-xl px-3 py-2 bg-danger-soft border border-danger text-danger mt-4">
                {formError}
              </div>
            )}

            <Button onClick={handleSave} disabled={updatePermissionGroup.isPending} className="mt-4">
              {updatePermissionGroup.isPending ? 'Saving…' : 'Save changes'}
            </Button>
          </div>
        </>
      )}
    </div>
  )
}

export default PermissionGroupDetailPage
