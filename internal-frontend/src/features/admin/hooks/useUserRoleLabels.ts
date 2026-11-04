import { useQueries } from '@tanstack/react-query'
import { accessManagementService } from '@/features/access-management/accessManagement.service'
import { roleKeys } from '@/features/access-management/role/hooks/useRoles'
import { fetchRemainingPagesBounded } from '@/lib/api/pagination'
import type { RoleEntity } from '@/types/accessManagement.types'

const PAGE_SIZE = 10

export interface UserRoleLabel {
  code: string
  name: string
}

export interface UserRoleLabelsEntry {
  roles: UserRoleLabel[]
  isLoading: boolean
  error: unknown
  refetch: () => void
}

async function loadExactUserRoles(email: string): Promise<RoleEntity[]> {
  // `user` is a free-text name/email search. Consume every matching page, then enforce an exact
  // email match client-side so a partial email collision can never label the wrong user.
  const first = await accessManagementService.searchRoles({ user: email, page: '1', limit: String(PAGE_SIZE) })
  const totalPages = Math.ceil(first.data.count / PAGE_SIZE)
  const remaining = await fetchRemainingPagesBounded(totalPages, (page) =>
    accessManagementService.searchRoles({ user: email, page: String(page), limit: String(PAGE_SIZE) }),
  )

  return [first, ...remaining]
    .flatMap((response) => response.data.items)
    .filter((role) => typeof role.user === 'object' && role.user?.email.toLowerCase() === email.toLowerCase())
}

// The current backend has no batch users→roles projection, so this is one initial request per
// visible user (the Users page itself is capped at 10 rows). Query caching prevents repeat work.
export function useUserRoleLabels(
  emails: string[],
  enabled: boolean,
): Record<string, UserRoleLabelsEntry> {
  const queries = useQueries({
    queries: emails.map((email) => ({
      queryKey: roleKeys.list({ user: email, limit: String(PAGE_SIZE) }),
      queryFn: () => loadExactUserRoles(email),
      enabled,
    })),
  })

  const result: Record<string, UserRoleLabelsEntry> = {}
  if (!enabled) return result

  emails.forEach((email, index) => {
    const query = queries[index]
    result[email] = {
      roles: (query.data ?? []).map((role) => ({
        code: typeof role.type === 'object' && role.type ? role.type.code : role.code,
        name: typeof role.type === 'object' && role.type ? role.type.name : role.name,
      })),
      isLoading: query.isLoading,
      error: query.error,
      refetch: () => { void query.refetch() },
    }
  })

  return result
}
