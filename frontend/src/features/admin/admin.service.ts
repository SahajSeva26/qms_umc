import api from '@/lib/api/api'
import type { ApiResponse, PaginatedResponse } from '@/types/common.types'
import type { SearchUserQuery, UpdateUserPayload, User } from '@/types/user.types'
import { withMockFields } from '@/features/admin/admin.mock'

// Backend only returns { id, email, firstName, lastName } per user today —
// see admin.mock.ts for why role/status/avatarTone are patched in here.
type UserApiShape = Omit<User, '_id' | 'role' | 'status' | 'avatarTone'> & { id: string }

const searchUsers = async (query: SearchUserQuery) => {
  const res = await api.get<PaginatedResponse<UserApiShape>>('/users', { params: query })
  if (!res.data.data) return { ...res.data, data: { count: 0, items: [] as User[] } }
  return {
    ...res.data,
    data: {
      count: res.data.data.count,
      items: res.data.data.items.map((u) => withMockFields({ ...u, _id: u.id })),
    },
  }
}

const toUser = (res: ApiResponse<UserApiShape>): ApiResponse<User> => {
  if (!res.data) return { ...res, data: null }
  const { id: userId, ...rest } = res.data
  return { ...res, data: withMockFields({ ...rest, _id: userId }) }
}

const getUser = async (id: string) => {
  const res = await api.get<ApiResponse<UserApiShape>>(`/users/${id}`)
  return toUser(res.data)
}

const updateUser = async (id: string, payload: UpdateUserPayload) => {
  const res = await api.put<ApiResponse<UserApiShape>>(`/users/${id}`, payload)
  return toUser(res.data)
}

export const adminService = { searchUsers, getUser, updateUser }
