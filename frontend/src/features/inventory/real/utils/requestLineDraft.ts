import type { InventoryRequestLineItemPayload, InventoryRequestType } from '@/features/inventory/real/inventoryRequest.types'

// A line's chosen device/consumable "sub-type" — separate from the request's
// own itemType field, which the backend derives from this: refill lines
// always resolve to itemType 'InventoryMaster' (device-or-consumable is just
// which catalog to search); return lines resolve directly to
// 'InventoryDevice'/'InventoryConsumable' (the sub-type IS the itemType).
export type StockKind = 'device' | 'consumable'

export interface RequestLineDraft extends InventoryRequestLineItemPayload {
  // UI-only, stable identity — used as the React list key instead of array index.
  draftId: string
  // UI-only — which sub-picker this line uses. Derived into itemType on submit.
  stockKind: StockKind
  // UI-only display label for the picked item (never sent to the backend).
  itemLabel: string
  // UI-only — the held quantity for a return-line consumable, used to cap
  // the quantity input. Undefined for refill lines / device lines.
  heldQuantity?: number
}

// Single construction point so draftId is never forgotten on a new call site.
export const createRequestLineDraft = (overrides: Partial<RequestLineDraft> & Pick<RequestLineDraft, 'stockKind' | 'itemType' | 'item' | 'itemLabel'>): RequestLineDraft => ({
  draftId: crypto.randomUUID(),
  quantity: undefined,
  ...overrides,
})

// Split out of InventoryRequestLineItemsEditor.tsx (a component file) since a
// non-component export alongside a component breaks Fast Refresh lint.
export const isLineSetValid = (lines: RequestLineDraft[], type: InventoryRequestType): boolean => {
  if (lines.length === 0) return false
  const seen = new Set<string>()
  for (const line of lines) {
    if (!line.item) return false
    const key = `${line.itemType}:${line.item}`
    if (seen.has(key)) return false
    seen.add(key)
    if (line.stockKind === 'consumable' && type === 'return' && line.heldQuantity !== undefined) {
      if (!line.quantity || line.quantity > line.heldQuantity) return false
    }
  }
  return true
}
