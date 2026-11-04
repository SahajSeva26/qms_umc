import { useEntityQuery } from '@/hooks/useEntityQuery'
import { createEntityKeys } from '@/hooks/entityQueryKeys'
import { useRoles } from '@/features/access-management/role/hooks/useRoles'
import { useRoleTypes } from '@/features/access-management/role-type/hooks/useRoleTypes'
import { accessManagementService } from '@/features/access-management/accessManagement.service'
import type { RoleEntity, SearchDownlineMrQuery } from '@/types/accessManagement.types'
import { EMPTY_ARRAY } from '@/utils/emptyArray'

type PharmaReportTypeCode = 'pharma-rsm' | 'pharma-asm' | 'pharma-mr'

// Not a typeahead — these tabs load the caller's whole team at once, so a higher bound than the
// default page size is appropriate (matches useDoctorCreateScope.ts's own CLIENT_SIDE_FETCH_LIMIT).
const TEAM_FETCH_LIMIT = '200'

// Resolves a pharma role-type's id within the caller's own tenant — type ids are per-tenant
// (role-type.service.ts), never a fixed global constant.
function usePharmaRoleTypeId(code: PharmaReportTypeCode, enabled: boolean) {
  const { data } = useRoleTypes({ code, status: 'active' }, enabled)
  return data?.data?.items[0]?.id
}

export interface DirectReports {
  roles: RoleEntity[]
  isLoading: boolean
  error: unknown
}

// Reusable at every level of the HO > RSM > ASM tree. MR has no downline — never called with
// roleTypeCode: 'pharma-mr'; see useMrTeam below instead.
export function useDirectReports(supervisorId: string | undefined, roleTypeCode: PharmaReportTypeCode, enabled: boolean): DirectReports {
  const typeId = usePharmaRoleTypeId(roleTypeCode, enabled)
  const { data, isLoading, error } = useRoles(
    { supervisor: supervisorId, type: typeId, status: 'active', limit: TEAM_FETCH_LIMIT },
    enabled && !!supervisorId && !!typeId,
  )
  return { roles: data?.data?.items ?? EMPTY_ARRAY, isLoading, error }
}

const downlineMrKeys = createEntityKeys<SearchDownlineMrQuery>('downline-mrs-team', 'downline-mr-team')

// The caller's own direct MR reports (ASM's "My Team" tab) — GET /roles/mrs (role.service.ts's
// searchMrs), the purpose-built endpoint already authorized by the caller's pharma role type,
// not a plain supervisor filter. No search/pagination — this tab loads the whole team at once.
export function useMrTeam(enabled: boolean): DirectReports {
  const { data, isLoading, error } = useEntityQuery(
    downlineMrKeys,
    (q) => accessManagementService.searchDownlineMrs(q),
    { limit: TEAM_FETCH_LIMIT },
    { enabled },
  )
  return { roles: data?.data?.items ?? EMPTY_ARRAY, isLoading, error }
}
