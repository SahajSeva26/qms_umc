import type { Lead, LeadStage } from '@/types/lead.types'
import { LEADS as SEED_LEADS } from '@/features/crm/crm.mock'

// TODO: replace with real API calls once backend endpoints exist.
// Module-level store stands in for the server: each mutation updates it and
// resolves with the fresh array, mirroring what a REST endpoint would return.
let leadsStore: Lead[] = [...SEED_LEADS]

const today = () => new Date().toISOString().slice(0, 10)

export const getLeads = async (): Promise<Lead[]> => leadsStore

export const moveStage = async (id: string, toStage: LeadStage, reason: string): Promise<Lead[]> => {
  leadsStore = leadsStore.map((l) => {
    if (l.id !== id) return l
    const entry = { from: l.stage, to: toStage, reason, at: new Date().toISOString() }
    return {
      ...l,
      stage: toStage,
      stageHistory: [...(l.stageHistory ?? []), entry],
      updated: today(),
    }
  })
  return leadsStore
}

export const markLost = async (id: string, category: string, reason: string): Promise<Lead[]> => {
  leadsStore = leadsStore.map((l) =>
    l.id === id
      ? { ...l, stage: 'lost' as const, lostCategory: category, lostReason: reason, updated: today() }
      : l
  )
  return leadsStore
}

export const reopen = async (id: string): Promise<Lead[]> => {
  leadsStore = leadsStore.map((l) =>
    l.id === id
      ? { ...l, stage: 'negotiation' as const, lostCategory: undefined, lostReason: undefined }
      : l
  )
  return leadsStore
}

export const createLead = async (lead: Lead): Promise<Lead[]> => {
  leadsStore = [lead, ...leadsStore]
  return leadsStore
}
