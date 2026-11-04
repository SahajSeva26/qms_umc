// Camp invitations — the WhatsApp shortlist/accept/decline flow used by both
// invite screens (Diet Camps and the Coordinator Workspace).
//
// Owns KEYS.INVITES.
// TODO: mock/localStorage-backed — swap bodies for api.* when available.

import type { DietInvite, InviteSummary } from '@/features/diet/dietitians.types'
import { KEYS, load, persist } from './dietStorage'

function loadInvites(): Record<string, DietInvite[]> {
  return load(KEYS.INVITES, {} as Record<string, DietInvite[]>)
}

export function getCampInvites(campId: string): DietInvite[] {
  return loadInvites()[campId] ?? []
}

/** Async read boundary — what a future `GET /camps/:id/invites` maps onto. */
export async function fetchCampInvites(campId: string): Promise<DietInvite[]> {
  return getCampInvites(campId)
}

export function inviteSummary(campId: string): InviteSummary {
  return summarizeInvites(getCampInvites(campId))
}

/** Pure — summarises an already-fetched invite list (no store read). */
export function summarizeInvites(list: DietInvite[]): InviteSummary {
  return {
    total: list.length,
    accepted: list.filter((i) => i.response === 'ACCEPTED').length,
    declined: list.filter((i) => i.response === 'DECLINED').length,
    pending: list.filter((i) => i.response === null).length,
  }
}

// addCampInvites — dietitians already invited with a non-DECLINED response
// are skipped (won't be re-invited); declined ones can be re-invited (their
// old DECLINED record is replaced with a fresh pending invite).
export async function addCampInvites(campId: string, dietitianIds: string[], sentBy: string, channel: 'WHATSAPP' = 'WHATSAPP'): Promise<Record<string, DietInvite[]>> {
  const all = loadInvites()
  const list = all[campId] ?? []
  const existingActive = new Set(list.filter((i) => i.response !== 'DECLINED').map((i) => i.dietitianId))
  const toAdd = new Set(dietitianIds.filter((id) => !existingActive.has(id)))
  const additions: DietInvite[] = Array.from(toAdd).map((id) => ({ dietitianId: id, sentAt: new Date().toISOString(), sentBy, channel, response: null }))
  const kept = list.filter((i) => !toAdd.has(i.dietitianId))
  all[campId] = [...kept, ...additions]
  persist(KEYS.INVITES, all)
  return all
}

export async function recordInviteResponse(campId: string, dietitianId: string, response: 'ACCEPTED' | 'DECLINED', note?: string): Promise<Record<string, DietInvite[]>> {
  const all = loadInvites()
  const list = all[campId] ?? []
  all[campId] = list.map((i) => (i.dietitianId === dietitianId ? { ...i, response, respondedAt: new Date().toISOString(), respondedNote: note } : i))
  persist(KEYS.INVITES, all)
  return all
}
