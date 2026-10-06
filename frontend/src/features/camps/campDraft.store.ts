import { useMemo } from 'react'
import { useAuthStore } from '@/features/auth/store'
import { useSession } from '@/hooks/useSession'
import { createDraftStore } from '@/hooks/useDraftStore'
import type { CampDraft } from '@/features/camps/hooks/useCampDraft'

// CampDraft plus the create-only labels a resumed session needs to re-render pickers by name.
export interface NewCampDraftSnapshot {
  draft: CampDraft
  projectLabel: string
  doctorLabel: string
  mrLabel: string
  foLabel: string
  dietitianLabel: string
  deviceLabels: Record<string, string>
}

const cache = new Map<string, ReturnType<typeof createDraftStore<NewCampDraftSnapshot>>>()

function getCampDraftStore(userId: string) {
  let store = cache.get(userId)
  if (!store) {
    store = createDraftStore<NewCampDraftSnapshot>(`qms:draft:new-camp:v1:${userId}`, 1)
    cache.set(userId, store)
  }
  return store
}

type CampDraftStoreResult =
  | { status: 'disabled'; store: null }
  | { status: 'loading'; store: null }
  | { status: 'ready'; store: ReturnType<typeof createDraftStore<NewCampDraftSnapshot>> }

export function useCampDraftStore({ enabled = true }: { enabled?: boolean } = {}): CampDraftStoreResult {
  const { isSettled } = useSession()
  const userId = useAuthStore((s) => s.user?.id)
  return useMemo(() => {
    if (!enabled) return { status: 'disabled', store: null }
    if (!isSettled || !userId) return { status: 'loading', store: null }
    return { status: 'ready', store: getCampDraftStore(userId) }
  }, [enabled, isSettled, userId])
}
