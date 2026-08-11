// Shared deterministic pseudo-randomness helper used across the Inventory
// feature's domain services (Warehouse/Vendors seeding, Procurement mkPR,
// Field Ops mkRefill/mkReport/seedAllocations, FO Inventory holdings) — NOT
// Math.random(), so demo data stays stable across reloads. Moved verbatim
// out of the original inventory.service.ts — no behavior change.

function hashStr(s: string): number {
  let h = 0
  const str = String(s)
  for (let i = 0; i < str.length; i++) h = (h * 31 + str.charCodeAt(i)) >>> 0
  return h
}

export { hashStr }
