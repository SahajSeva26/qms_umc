import { useMemo } from 'react'
import { useAuthStore } from '@/features/auth/store'
import { useSession } from '@/hooks/useSession'
import { createDraftStore } from '@/hooks/useDraftStore'
import type { WizardFormState } from '@/features/crm/wizard.types'

const cache = new Map<string, ReturnType<typeof createDraftStore<WizardFormState>>>()

function getLeadDraftStore(userId: string) {
  let store = cache.get(userId)
  if (!store) {
    store = createDraftStore<WizardFormState>(`qms:draft:new-lead:v1:${userId}`, 1)
    cache.set(userId, store)
  }
  return store
}

// `loading` distinguishes "don't know who's logged in yet" from "no user" —
// a wizard mounted mid-session-restore waits instead of assuming no draft.
type LeadDraftStoreResult =
  | { status: 'disabled'; store: null }
  | { status: 'loading'; store: null }
  | { status: 'ready'; store: ReturnType<typeof createDraftStore<WizardFormState>> }

// `enabled: false` (a prefill instance) skips creating/rehydrating the
// Zustand+persist store entirely, not merely ignoring its result.
export function useLeadDraftStore({ enabled = true }: { enabled?: boolean } = {}): LeadDraftStoreResult {
  const { isSettled } = useSession()
  const userId = useAuthStore((s) => s.user?.id)
  return useMemo(() => {
    if (!enabled) return { status: 'disabled', store: null }
    if (!isSettled || !userId) return { status: 'loading', store: null }
    return { status: 'ready', store: getLeadDraftStore(userId) }
  }, [enabled, isSettled, userId])
}
