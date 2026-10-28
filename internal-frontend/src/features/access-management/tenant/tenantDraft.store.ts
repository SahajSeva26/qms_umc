import { useMemo } from 'react'
import { useAuthStore } from '@/features/auth/store'
import { useSession } from '@/hooks/useSession'
import { createDraftStore } from '@/hooks/useDraftStore'
import type { TenantFormValues } from '@/features/access-management/tenant/tenant.wizard'

// Excludes ownerPassword — a plaintext credential has no business in sessionStorage.
export type TenantDraftSnapshot = Omit<TenantFormValues, 'ownerPassword'>

export function stripPassword(values: TenantFormValues): TenantDraftSnapshot {
  const { ownerPassword: _ownerPassword, ...rest } = values
  void _ownerPassword
  return rest
}

const cache = new Map<string, ReturnType<typeof createDraftStore<TenantDraftSnapshot>>>()

function getTenantDraftStore(userId: string) {
  let store = cache.get(userId)
  if (!store) {
    store = createDraftStore<TenantDraftSnapshot>(`qms:draft:new-tenant:v1:${userId}`, 1)
    cache.set(userId, store)
  }
  return store
}

type TenantDraftStoreResult =
  | { status: 'disabled'; store: null }
  | { status: 'loading'; store: null }
  | { status: 'ready'; store: ReturnType<typeof createDraftStore<TenantDraftSnapshot>> }

export function useTenantDraftStore({ enabled = true }: { enabled?: boolean } = {}): TenantDraftStoreResult {
  const { isSettled } = useSession()
  const userId = useAuthStore((s) => s.user?.id)
  return useMemo(() => {
    if (!enabled) return { status: 'disabled', store: null }
    if (!isSettled || !userId) return { status: 'loading', store: null }
    return { status: 'ready', store: getTenantDraftStore(userId) }
  }, [enabled, isSettled, userId])
}
