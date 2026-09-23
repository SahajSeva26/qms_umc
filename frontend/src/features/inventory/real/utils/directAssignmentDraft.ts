export interface ConsumableAssignmentLineDraft {
  // UI-only, stable identity — used as the React list key instead of array index.
  draftId: string
  // InventoryMaster catalog id.
  item: string
  // UI-only display label for the picked item (never sent to the backend).
  itemLabel: string
  quantity: number | undefined
}

// Single construction point so draftId is never forgotten on a new call site.
export const createConsumableAssignmentLineDraft = (
  overrides: Partial<ConsumableAssignmentLineDraft> = {},
): ConsumableAssignmentLineDraft => ({
  draftId: crypto.randomUUID(),
  item: '',
  itemLabel: '',
  quantity: undefined,
  ...overrides,
})

// An empty line set is valid here — the "at least one of devices/consumables" check
// happens at the modal level, not here.
export const isConsumableLineSetValid = (lines: ConsumableAssignmentLineDraft[]): boolean => {
  const seen = new Set<string>()
  for (const line of lines) {
    if (!line.item) return false
    if (seen.has(line.item)) return false
    seen.add(line.item)
    if (!line.quantity || line.quantity < 1) return false
  }
  return true
}
