// Pure date helpers for the Inventory feature's forms/modals. Previously
// reimplemented inline as LogMovementModal.tsx's isoToday(), TransfersTab.tsx's
// inline `today` const, and ProcurementTab.tsx's todayPlusDaysIso() —
// extracted here (Phase 4 cleanup). Same math, same output, zero behavior
// change.

export function isoDateOffset(days: number): string {
  const d = new Date()
  d.setDate(d.getDate() + days)
  return d.toISOString().slice(0, 10)
}

export function todayIso(): string {
  return isoDateOffset(0)
}
