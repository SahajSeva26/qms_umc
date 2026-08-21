import { useEntityQuery } from '@/hooks/useEntityQuery'
import { createEntityKeys } from '@/hooks/entityQueryKeys'
import { adminService } from '@/features/admin/admin.service'
import type { SearchUserQuery } from '@/types/user.types'

export const userKeys = createEntityKeys<SearchUserQuery>('users', 'user')

// No create hook — users are created via Role/RoleType-driven flows
// elsewhere, this feature only lists/views/updates them.
export const useUsers = (query: SearchUserQuery, enabled = true) =>
  useEntityQuery(userKeys, (q) => adminService.searchUsers(q), query, { enabled })
