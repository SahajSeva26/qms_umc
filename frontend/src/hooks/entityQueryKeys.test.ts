import { describe, it, expect } from 'vitest'
import { createEntityKeys } from '@/hooks/entityQueryKeys'

// Locks the exact key SHAPES the whole factory-based rollout depends on —
// every entity's list/detail/create/update hook assumes these forms without
// re-checking them, so a silent change here would break cache sharing across
// every migrated entity at once without any single hook's own test catching it.
describe('createEntityKeys', () => {
  it('keys.list(query) builds [name, query]', () => {
    const keys = createEntityKeys<{ name?: string }>('doctors', 'doctor')
    expect(keys.list({ name: 'Rao' })).toEqual(['doctors', { name: 'Rao' }])
  })

  it('keys.list({}) builds [name, {}] — an empty query still produces a real key, not just the root', () => {
    const keys = createEntityKeys<{ name?: string }>('doctors', 'doctor')
    expect(keys.list({})).toEqual(['doctors', {}])
  })

  it('keys.detail(id) builds [singular, id]', () => {
    const keys = createEntityKeys<{ name?: string }>('doctors', 'doctor')
    expect(keys.detail('abc123')).toEqual(['doctor', 'abc123'])
  })

  it('keys.all is [name] — the root every list/detail key is meant to prefix-match under', () => {
    const keys = createEntityKeys<{ name?: string }>('doctors', 'doctor')
    expect(keys.all).toEqual(['doctors'])
  })

  it('defaults singular to name when omitted (InventoryMaster-style no-detail-hook entities)', () => {
    const keys = createEntityKeys<{ status?: string }>('inventory-masters')
    expect(keys.all).toEqual(['inventory-masters'])
    // .detail() is still callable (the type doesn't forbid it), it would just
    // never be invoked by an entity with no single-get hook — confirming it
    // falls back to the plural name is still worth locking down.
    expect(keys.detail('x')).toEqual(['inventory-masters', 'x'])
  })
})
