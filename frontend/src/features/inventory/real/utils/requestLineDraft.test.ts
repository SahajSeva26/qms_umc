import { describe, it, expect } from 'vitest'
import { createRequestLineDraft, isLineSetValid, type RequestLineDraft } from './requestLineDraft'

describe('createRequestLineDraft', () => {
  it('generates a unique draftId on every call', () => {
    const a = createRequestLineDraft({ stockKind: 'device', itemType: 'InventoryDevice', item: '', itemLabel: '' })
    const b = createRequestLineDraft({ stockKind: 'device', itemType: 'InventoryDevice', item: '', itemLabel: '' })
    expect(a.draftId).toBeTruthy()
    expect(b.draftId).toBeTruthy()
    expect(a.draftId).not.toBe(b.draftId)
  })

  it('defaults quantity to undefined unless overridden', () => {
    const line = createRequestLineDraft({ stockKind: 'consumable', itemType: 'InventoryConsumable', item: '', itemLabel: '' })
    expect(line.quantity).toBeUndefined()
  })
})

describe('isLineSetValid — unaffected by draftId', () => {
  const base: Omit<RequestLineDraft, 'draftId' | 'item'> = { stockKind: 'device', itemType: 'InventoryDevice', itemLabel: '', quantity: undefined }

  it('two lines with different draftIds but the same (itemType, item) still count as a duplicate', () => {
    const lines: RequestLineDraft[] = [
      { ...base, draftId: 'd1', item: 'dev-1' },
      { ...base, draftId: 'd2', item: 'dev-1' },
    ]
    expect(isLineSetValid(lines, 'refill')).toBe(false)
  })

  it('two lines with different draftIds and different items are valid', () => {
    const lines: RequestLineDraft[] = [
      { ...base, draftId: 'd1', item: 'dev-1' },
      { ...base, draftId: 'd2', item: 'dev-2' },
    ]
    expect(isLineSetValid(lines, 'refill')).toBe(true)
  })
})
