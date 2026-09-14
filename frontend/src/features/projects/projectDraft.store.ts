import { useMemo } from 'react'
import { useAuthStore } from '@/features/auth/store'
import { useSession } from '@/hooks/useSession'
import { createDraftStore } from '@/hooks/useDraftStore'
import type { WizardFormState } from '@/features/projects/wizard.types'

const cache = new Map<string, ReturnType<typeof createDraftStore<WizardFormState>>>()

function getProjectDraftStore(userId: string) {
  let store = cache.get(userId)
  if (!store) {
    store = createDraftStore<WizardFormState>(`qms:draft:new-project:v1:${userId}`, 1)
    cache.set(userId, store)
  }
  return store
}

// Keyed to a separate sessionStorage entry so the two wizards' drafts never collide.
type ProjectDraftStoreResult =
  | { status: 'disabled'; store: null }
  | { status: 'loading'; store: null }
  | { status: 'ready'; store: ReturnType<typeof createDraftStore<WizardFormState>> }

export function useProjectDraftStore({ enabled = true }: { enabled?: boolean } = {}): ProjectDraftStoreResult {
  const { isSettled } = useSession()
  const userId = useAuthStore((s) => s.user?.id)
  return useMemo(() => {
    if (!enabled) return { status: 'disabled', store: null }
    if (!isSettled || !userId) return { status: 'loading', store: null }
    return { status: 'ready', store: getProjectDraftStore(userId) }
  }, [enabled, isSettled, userId])
}
