// Pure, reusable sort comparators for the Inventory feature's date-stamped
// rows. Previously reimplemented inline in FieldOpsTab.tsx (x2) and
// TransfersTab.tsx — extracted here (Phase 4 cleanup). Same comparator, same
// output, zero behavior change.

// Newest-first by RAW STRING compare on the ISO date (localeCompare, not a
// true Date-based sort) — exact port of the prototype's own string-sort
// convention (every source date in this codebase is an ISO 'YYYY-MM-DD'
// string, so this sorts correctly descending).
export function sortByDateDesc<T extends { date?: string }>(rows: T[]): T[] {
  return [...rows].sort((a, b) => (b.date || '').localeCompare(a.date || ''))
}
