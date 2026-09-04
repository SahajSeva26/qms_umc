import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'

interface DraftState<T> {
  draft: T | null
  savedAt: number | null
  setDraft: (value: T) => void
  clearDraft: () => void
}

// `migrate` always returns the clean empty shape on any version mismatch —
// without it, zustand's persist only resets in-memory state and leaves the
// stale entry sitting in storage untouched (confirmed by reading persist's
// own middleware source); returning a fresh shape here makes it write that
// clean state back out immediately instead.
export function createDraftStore<T>(key: string, version: number) {
  const store = create<DraftState<T>>()(
    persist(
      (set) => ({
        draft: null,
        savedAt: null,
        setDraft: (value) => set({ draft: value, savedAt: Date.now() }),
        // set() alone only persists an empty-but-present entry — persist's
        // own setItem still writes {state: {draft: null, ...}, version}.
        // clearStorage() is the only call that actually removes the
        // sessionStorage key (confirmed by reading persist's source).
        clearDraft: () => {
          set({ draft: null, savedAt: null })
          store.persist.clearStorage()
        },
      }),
      {
        name: key,
        version,
        storage: createJSONStorage(() => sessionStorage),
        migrate: () => ({ draft: null, savedAt: null }),
      },
    ),
  )
  return store
}
