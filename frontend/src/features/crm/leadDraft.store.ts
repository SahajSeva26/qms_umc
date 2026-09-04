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

// `disabled`: the caller (a prefill instance) doesn't want persistence at
// all — no store lookup/creation happens, and any existing draft is left
// completely untouched. `loading` distinguishes "we don't know who's logged
// in YET" from "definitely no user," so a wizard mounted mid-session-restore
// waits instead of wrongly concluding no draft exists. `ready` is the only
// state with a usable `store`.
type LeadDraftStoreResult =
  | { status: 'disabled'; store: null }
  | { status: 'loading'; store: null }
  | { status: 'ready'; store: ReturnType<typeof createDraftStore<WizardFormState>> }

// `enabled` defaults true; a prefill instance passes `enabled: false` so no
// per-user store is ever looked up or created for it — not merely "resolves
// normally, then gets ignored by the wizard." useSession()/useAuthStore are
// still subscribed to unconditionally (Rules of Hooks), but that costs
// nothing extra — useSession() shares the same React Query cache every other
// session consumer already reads from; the real cost this avoids is creating/
// rehydrating the Zustand+persist store itself.
export function useLeadDraftStore({ enabled = true }: { enabled?: boolean } = {}): LeadDraftStoreResult {
  const { isSettled } = useSession()
  const userId = useAuthStore((s) => s.user?.id)
  return useMemo(() => {
    if (!enabled) return { status: 'disabled', store: null }
    if (!isSettled || !userId) return { status: 'loading', store: null }
    return { status: 'ready', store: getLeadDraftStore(userId) }
  }, [enabled, isSettled, userId])
}
