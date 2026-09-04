import { describe, it, expect, beforeEach } from 'vitest'
import { createDraftStore } from './useDraftStore'

interface TestDraft {
  name: string
}

describe('createDraftStore', () => {
  beforeEach(() => {
    sessionStorage.clear()
  })

  it('starts with no draft', () => {
    const store = createDraftStore<TestDraft>('test:draft:a', 1)
    expect(store.getState().draft).toBeNull()
    expect(store.getState().savedAt).toBeNull()
  })

  it('setDraft persists the value to sessionStorage under the given key', () => {
    const store = createDraftStore<TestDraft>('test:draft:b', 1)
    store.getState().setDraft({ name: 'hello' })

    expect(store.getState().draft).toEqual({ name: 'hello' })
    const raw = sessionStorage.getItem('test:draft:b')
    expect(raw).not.toBeNull()
    expect(JSON.parse(raw as string).state.draft).toEqual({ name: 'hello' })
  })

  it('clearDraft resets in-memory state', () => {
    const store = createDraftStore<TestDraft>('test:draft:c', 1)
    store.getState().setDraft({ name: 'hello' })
    store.getState().clearDraft()

    expect(store.getState().draft).toBeNull()
    expect(store.getState().savedAt).toBeNull()
  })

  it('clearDraft actually REMOVES the sessionStorage key — not just persists an empty state', () => {
    const store = createDraftStore<TestDraft>('test:draft:d', 1)
    store.getState().setDraft({ name: 'hello' })
    expect(sessionStorage.getItem('test:draft:d')).not.toBeNull()

    store.getState().clearDraft()

    // The exact bug caught in review: set({draft: null}) alone still writes
    // a present-but-empty entry via persist's own setItem. clearStorage()
    // is what actually calls sessionStorage.removeItem — assert the key is
    // gone entirely, not merely holding a null draft.
    expect(sessionStorage.getItem('test:draft:d')).toBeNull()
  })

  it('a version-mismatched stored entry is replaced with the clean default, not left stale', () => {
    // Simulate an old, incompatible shape already sitting in storage from a
    // previous schema version.
    sessionStorage.setItem('test:draft:e', JSON.stringify({ state: { draft: { legacyField: 'stale' } }, version: 0 }))

    const store = createDraftStore<TestDraft>('test:draft:e', 1)
    // Hydration is async in zustand/persist — wait a tick for it to settle.
    return new Promise<void>((resolve) => {
      setTimeout(() => {
        expect(store.getState().draft).toBeNull()
        resolve()
      }, 0)
    })
  })
})
