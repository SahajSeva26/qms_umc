import { useCallback, useMemo, useState } from 'react'
import { useTenantPermissionGroup } from '@/features/access-management/role-type/hooks/useTenantPermissionGroup'
import { ROLE_FORBIDDEN_PERMISSIONS } from '@/features/access-management/role/constants/roleForbiddenPermissions'
import type { RoleTypeEntity } from '@/types/accessManagement.types'

// The "elevated permissions" picker for a Role: choices are the
// INTERSECTION of the tenant's PermissionGroup ceiling and the
// currently-selected RoleType's own permissions, minus the forbidden codes.
export const useRolePermissionPicker = (tenantId: string | undefined, roleTypeId: string, roleTypes: RoleTypeEntity[]) => {
  const { permissionGroup, isLoading: isLoadingCeiling } = useTenantPermissionGroup(tenantId)
  const permissionGroupCeilingCodes = useMemo(
    () => new Set((permissionGroup?.permissions ?? []).map((p) => p.code)),
    [permissionGroup],
  )

  const [selectedCodes, setSelectedCodes] = useState<Set<string>>(new Set())

  // The bound RoleType's own permission codes — the "floor" elevated
  // permissions build on top of.
  const boundRoleTypePermissionCodes = useMemo(() => {
    const found = roleTypes.find((rt) => rt.id === roleTypeId)
    return new Set(found?.permissions ?? [])
  }, [roleTypes, roleTypeId])

  const candidatePermissions = useMemo(() => {
    return (permissionGroup?.permissions ?? []).filter(
      (p) => boundRoleTypePermissionCodes.has(p.code) && !ROLE_FORBIDDEN_PERMISSIONS.includes(p.code),
    )
  }, [permissionGroup, boundRoleTypePermissionCodes])

  // Codes that have fallen outside the current candidate set are dropped
  // here, at read time, rather than synced back via an effect — an effect
  // syncing into `selectedCodes` would feed itself (candidatePermissions is
  // a fresh Set every render) and loop.
  const effectiveSelectedCodes = useMemo(() => {
    const allowed = new Set(candidatePermissions.map((p) => p.code))
    return new Set([...selectedCodes].filter((c) => allowed.has(c)))
  }, [selectedCodes, candidatePermissions])

  const toggleCode = useCallback((code: string) => {
    if (ROLE_FORBIDDEN_PERMISSIONS.includes(code)) return
    setSelectedCodes((prev) => {
      const next = new Set(prev)
      if (next.has(code)) {
        next.delete(code)
      } else {
        next.add(code)
      }
      return next
    })
  }, [])

  return {
    permissionGroup,
    isLoadingCeiling,
    permissionGroupCeilingCodes,
    candidatePermissions,
    selectedCodes,
    setSelectedCodes,
    effectiveSelectedCodes,
    toggleCode,
  }
}
