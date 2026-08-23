// Camp-derived facts needed BEFORE a reminder can be built: when the camp
// starts, and who should be reminded. Both live here (rather than as two
// separate one-function files) because both are leaf-level camp facts that
// reminders.templates.service.ts AND reminders.triggers.service.ts each need
// independently — putting campStartMs inside either of those two modules
// would make the other depend on it, and since triggers already depends on
// templates (for renderTemplate/buildContext), that would create a cycle.
// Keeping both facts in this shared, lower-level module avoids it.

import type { Camp } from '@/features/camps/camp.types'
import type { Person } from '@/types/people.types'
import type { EngineRecipient, RecipientType } from '@/features/reminders/reminders.types'
import { seeded } from './reminders.utils'

// slotStartHour() — "10-2" → 10 (AM); "6-10" → 18 (PM). Exact port.
function slotStartHour(slot: string | undefined): number {
  const m = String(slot || '').match(/^(\d+)/)
  if (!m) return 10
  const h = Number(m[1])
  return h < 7 ? h + 12 : h
}

export function campStartMs(camp: Camp): number | null {
  if (!camp.date) return null
  const h = slotStartHour(camp.slot)
  const d = new Date(`${camp.date}T${String(h).padStart(2, '0')}:00:00`)
  return d.getTime()
}

// deriveDietitianForCamp() — camp.dietitianId if set, else (for Diet camps
// only) a seeded pseudo-random pick from the dietitian pool, exact port.
function deriveDietitianForCamp(camp: Camp, people: Person[]): string {
  if (camp.dietitianId) return camp.dietitianId
  if (camp.type !== 'Diet') return ''
  const pool = people.filter((p) => p.role === 'Dietitian')
  if (!pool.length) return ''
  const rng = seeded(`${camp.id}|diet`)
  return pool[Math.floor(rng() * pool.length)].id
}

// recipientsFor() — FO (if camp.foId set) + Dietitian (derived) only. Exact port.
export function recipientsFor(camp: Camp, people: Person[]): EngineRecipient[] {
  const out: EngineRecipient[] = []
  if (camp.foId) {
    const p = people.find((x) => x.id === camp.foId)
    out.push({ type: 'FO' as RecipientType, id: camp.foId, name: camp.foName || p?.name || camp.foId, phone: p?.phone || '+91 9XX XXX XXXX' })
  }
  const did = deriveDietitianForCamp(camp, people)
  if (did) {
    const p = people.find((x) => x.id === did)
    out.push({ type: 'Dietitian' as RecipientType, id: did, name: p?.name || did, phone: p?.phone || '+91 9XX XXX XXXX' })
  }
  return out
}
