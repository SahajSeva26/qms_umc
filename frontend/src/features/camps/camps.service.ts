import type { Camp, CampStatus, Doctor } from '@/types/camp.types'
import { CAMPS as SEED_CAMPS, DOCTORS } from '@/features/camps/camps.mock'

const STORAGE_KEY = 'qms.master.camps'

function loadCamps(): Camp[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) return JSON.parse(raw)
  } catch {
    // fall through to seed
  }
  return JSON.parse(JSON.stringify(SEED_CAMPS))
}

function persistCamps(camps: Camp[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(camps))
  } catch {
    // demo persistence only — safe to ignore quota/serialization errors
  }
}

// TODO: replace with real API calls once backend endpoints exist
export async function getCamps(): Promise<Camp[]> {
  return loadCamps()
}

// TODO: replace with real API calls once backend endpoints exist
export async function getDoctors(): Promise<Doctor[]> {
  return DOCTORS
}

// TODO: replace with real API calls once backend endpoints exist
export async function setStatus(id: string, status: CampStatus, cancelReason?: string): Promise<Camp[]> {
  const next = loadCamps().map((c) =>
    c.id === id
      ? {
          ...c,
          status,
          ...(cancelReason ? { cancelReason, cancelledAt: new Date().toISOString() } : {}),
          ...(status === 'CLOSED' && !c.patientsDone ? { patientsDone: c.patientsExpected } : {}),
        }
      : c
  )
  persistCamps(next)
  return next
}

// TODO: replace with real API calls once backend endpoints exist
export async function assignFo(id: string, foId: string): Promise<Camp[]> {
  const next = loadCamps().map((c) => (c.id === id ? { ...c, foId } : c))
  persistCamps(next)
  return next
}

// TODO: replace with real API calls once backend endpoints exist
// Appends a camp booked from outside this feature (e.g. CRM/Clients'
// bookCamp flow) onto the same store, so it shows up on the camps board.
export async function addCamp(camp: Camp): Promise<Camp[]> {
  const next = [...loadCamps(), camp]
  persistCamps(next)
  return next
}
