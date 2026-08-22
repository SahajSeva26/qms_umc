import { useCallback, useMemo } from 'react'
import { useTenantPermissionGroup } from '@/features/access-management/role-type/hooks/useTenantPermissionGroup'
import { usePermissionCodeSelection } from '@/features/access-management/hooks/usePermissionCodeSelection'
import { ROLE_FORBIDDEN_PERMISSIONS } from '@/features/access-management/role/constants/roleForbiddenPermissions'
import type { RoleTypeEntity } from '@/features/access-management/accessManagement.types'

// Choices are the intersection of the tenant's PermissionGroup ceiling and the
// selected RoleType's own permissions, minus the forbidden codes.
export const useRolePermissionPicker = (
  tenantId: string | undefined,
  roleTypeId: string,
  roleTypes: RoleTypeEntity[],
  initialCodes: string[] = [],
) => {
  const { permissionGroup, isLoading: isLoadingCeiling } = useTenantPermissionGroup(tenantId)
  const permissionGroupCeilingCodes = useMemo(
    () => new Set((permissionGroup?.permissions ?? []).map((p) => p.code)),
    [permissionGroup],
  )

  const { selectedCodes, setSelectedCodes, toggleCode: toggleCodeUnguarded } = usePermissionCodeSelection(initialCodes)

  const boundRoleTypePermissionCodes = useMemo(() => {
    const found = roleTypes.find((rt) => rt.id === roleTypeId)
    return new Set(found?.permissions ?? [])
  }, [roleTypes, roleTypeId])

  const candidatePermissions = useMemo(() => {
    return (permissionGroup?.permissions ?? []).filter(
      (p) => boundRoleTypePermissionCodes.has(p.code) && !ROLE_FORBIDDEN_PERMISSIONS.includes(p.code),
    )
  }, [permissionGroup, boundRoleTypePermissionCodes])

  // Filtered at read time rather than synced via an effect, to avoid a self-feeding loop.
  const effectiveSelectedCodes = useMemo(() => {
    const allowed = new Set(candidatePermissions.map((p) => p.code))
    return new Set([...selectedCodes].filter((c) => allowed.has(c)))
  }, [selectedCodes, candidatePermissions])

  const toggleCode = useCallback((code: string) => {
    if (ROLE_FORBIDDEN_PERMISSIONS.includes(code)) return
    toggleCodeUnguarded(code)
  }, [toggleCodeUnguarded])

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
