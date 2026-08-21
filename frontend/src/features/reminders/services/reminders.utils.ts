// Generic, domain-agnostic helpers used across multiple Reminders services —
// deliberately separate from reminders.storage.ts (persistence) since these
// have a different lifecycle: storage.ts disappears entirely once a real
// backend lands, while genId/nowIso/seeded may still be needed afterwards
// (seeded() specifically backs the simulated WhatsApp/voice providers in
// reminders.dispatch.service.ts — it only goes away once those providers are
// swapped for real API calls, a separate migration from "storage exists").

export function genId(prefix: string): string {
  return `${prefix}-${Math.random().toString(36).slice(2, 6).toUpperCase()}${Date.now().toString(36).slice(-4).toUpperCase()}`
}

export function nowIso(): string {
  return new Date().toISOString()
}

// seeded() — FNV-1a-style deterministic PRNG, exact port of reminders-engine.js's seeded().
export function seeded(str: string): () => number {
  let s = 2166136261 >>> 0
  const key = String(str || 'x')
  for (let i = 0; i < key.length; i++) {
    s ^= key.charCodeAt(i)
    s = Math.imul(s, 16777619) >>> 0
  }
  return () => {
    s = (Math.imul(s, 1664525) + 1013904223) >>> 0
    return s / 4294967296
  }
}
