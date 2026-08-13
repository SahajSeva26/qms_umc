import { useMemo, useState } from 'react'
import { useTenantPermissionGroup } from '@/features/access-management/role-type/hooks/useTenantPermissionGroup'
import { ROLE_FORBIDDEN_PERMISSIONS } from '@/features/access-management/role/constants/roleForbiddenPermissions'
import type { RoleTypeEntity } from '@/types/accessManagement.types'

// Extracted from RoleDetailPage.tsx — the "elevated permissions" picker for a
// Role: choices are the INTERSECTION of the tenant's PermissionGroup ceiling
// and the currently-selected RoleType's own permissions, minus the 3
// ROLE_FORBIDDEN_PERMISSIONS codes. Mirrors backend role.service.ts's
// handlePermissionUpdate.
export const useRolePermissionPicker = (tenantId: string | undefined, roleTypeId: string, roleTypes: RoleTypeEntity[]) => {
  const { permissionGroup, isLoading: isLoadingCeiling } = useTenantPermissionGroup(tenantId)
  const permissionGroupCeilingCodes = useMemo(
    () => new Set((permissionGroup?.permissions ?? []).map((p) => p.code)),
    [permissionGroup],
  )

  const [selectedCodes, setSelectedCodes] = useState<Set<string>>(new Set())

  // The bound RoleType's own permission codes — the "floor" that elevated
  // permissions build on top of. Recomputed whenever the roleType selection
  // or the loaded roleTypes list changes.
  const boundRoleTypePermissionCodes = useMemo(() => {
    const found = roleTypes.find((rt) => rt.id === roleTypeId)
    // found.permissions is a bare string[] on the wire (RoleTypeEntity) — no
    // .code projection needed.
    return new Set(found?.permissions ?? [])
  }, [roleTypes, roleTypeId])

  // Candidate elevated permissions = tenant PermissionGroup ceiling
  // ∩ bound RoleType's own permissions, minus the 3 forbidden codes —
  // never offered as an unbounded pick across the whole PermissionGroup.
  const candidatePermissions = useMemo(() => {
    return (permissionGroup?.permissions ?? []).filter(
      (p) => boundRoleTypePermissionCodes.has(p.code) && !ROLE_FORBIDDEN_PERMISSIONS.includes(p.code),
    )
  }, [permissionGroup, boundRoleTypePermissionCodes])

  // Selected codes that have fallen outside the current candidate set
  // (ceiling, role type, or forbidden-list changed) are dropped here, at
  // READ time, rather than synced back into `selectedCodes` via an effect —
  // that effect used to feed itself: `candidatePermissions` is a fresh
  // array/Set every render (built through boundRoleTypePermissionCodes,
  // itself built from a roleTypes list that's a new `[]` on every render
  // before the query settles), so the effect's own dependency never
  // stabilized and it looped — "Maximum update depth exceeded," confirmed
  // live 2026-08-05. Deriving instead of syncing removes the setState
  // entirely, so there's nothing left to loop.
  const effectiveSelectedCodes = useMemo(() => {
    const allowed = new Set(candidatePermissions.map((p) => p.code))
    return new Set([...selectedCodes].filter((c) => allowed.has(c)))
  }, [selectedCodes, candidatePermissions])

  const toggleCode = (code: string) => {
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
  }

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
