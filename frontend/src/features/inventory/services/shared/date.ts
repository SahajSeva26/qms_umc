// Shared date helpers used across the Inventory feature's domain services
// (Item Master, Fleet, Dashboard, Forecasting seeding/derivations). Moved
// verbatim out of the original inventory.service.ts — no behavior change.

function addDays(d: Date, n: number): Date {
  const r = new Date(d)
  r.setDate(r.getDate() + n)
  return r
}
function isoDate(d: Date): string {
  return d.toISOString().slice(0, 10)
}
// daysFromNow() — exact port (inventory-masters.js:32). Ceil rounding.
function daysFromNow(s?: string | null): number | null {
  return s ? Math.ceil((new Date(s).getTime() - Date.now()) / 86400000) : null
}

export { addDays, isoDate, daysFromNow }
