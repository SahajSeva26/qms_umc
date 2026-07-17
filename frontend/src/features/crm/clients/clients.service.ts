import type { Camp } from '@/types/camp.types'
import type {
  Client,
  ClientDoctor,
  ClientInvoice,
  ClientMr,
  ClientProject,
  Division,
  PurchaseOrder,
} from '@/types/client.types'
import {
  CLIENTS as SEED_CLIENTS,
  DIVISIONS as SEED_DIVISIONS,
  INVOICES as SEED_INVOICES,
  MRS as SEED_MRS,
  PROJECTS as SEED_PROJECTS,
} from '@/features/crm/clients/clients.mock'

const PROJECTS_KEY = 'qms.master.projects'

function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value))
}

function loadProjects(): ClientProject[] {
  try {
    const raw = localStorage.getItem(PROJECTS_KEY)
    if (raw) return JSON.parse(raw)
  } catch {
    // fall through to seed
  }
  return clone(SEED_PROJECTS)
}

function persistProjects(next: ClientProject[]) {
  try {
    localStorage.setItem(PROJECTS_KEY, JSON.stringify(next))
  } catch {
    // demo persistence only — safe to ignore quota/serialization errors
  }
}

// Module-level in-memory stores seeded from the mock. Projects additionally
// persist to localStorage so PO changes survive reloads.
const clients: Client[] = clone(SEED_CLIENTS)
const divisions: Division[] = clone(SEED_DIVISIONS)
const mrs: ClientMr[] = clone(SEED_MRS)
let projects: ClientProject[] = loadProjects()
const invoices: ClientInvoice[] = clone(SEED_INVOICES)
const doctors: ClientDoctor[] = []

export interface ClientsData {
  clients: Client[]
  divisions: Division[]
  mrs: ClientMr[]
  projects: ClientProject[]
  invoices: ClientInvoice[]
  doctors: ClientDoctor[]
}

// TODO: replace with real API calls once backend endpoints exist
export async function getData(): Promise<ClientsData> {
  return {
    clients: [...clients],
    divisions: [...divisions],
    mrs: [...mrs],
    projects: [...projects],
    invoices: [...invoices],
    doctors: [...doctors],
  }
}

// TODO: replace with real API calls once backend endpoints exist
export async function addPo(projectId: string, po: PurchaseOrder): Promise<void> {
  projects = projects.map((p) => (p.id === projectId ? { ...p, pos: [...p.pos, po] } : p))
  persistProjects(projects)
}

// TODO: replace with real API calls once backend endpoints exist
export async function updatePo(projectId: string, po: PurchaseOrder): Promise<void> {
  projects = projects.map((p) =>
    p.id === projectId ? { ...p, pos: p.pos.map((existing) => (existing.id === po.id ? po : existing)) } : p
  )
  persistProjects(projects)
}

// TODO: replace with real API calls once backend endpoints exist
export async function addMr(mr: ClientMr): Promise<void> {
  mrs.push(mr)
}

// TODO: replace with real API calls once backend endpoints exist
export async function addDoctor(input: { name: string; specialty: string; city: string }): Promise<ClientDoctor> {
  const doctor: ClientDoctor = { id: `cdoc-${Date.now()}`, ...input }
  doctors.push(doctor)
  return doctor
}

export interface BookCampInput {
  clientId: string
  divisionId: string
  projectId: string
  mrId: string
  mrName: string
  type: Camp['type']
  date: string
  slot: string
  city: string
  state: string
  patientsExpected: number
  notes: string
}

// TODO: replace with real API calls once backend endpoints exist
// Builds a REQUESTED camp from a client-side booking flow. Persisting it to
// the Camps module's own store is the caller's job (via the shared
// useCampsData hook's addCamp) — this service only knows Client-side fields.
export function buildBookedCamp(input: BookCampInput): Camp {
  return {
    id: `C-${Math.floor(1000 + Math.random() * 9000)}`,
    date: input.date,
    slot: input.slot,
    type: input.type,
    status: 'REQUESTED',
    clientId: input.clientId,
    projectId: input.projectId,
    divisionId: input.divisionId,
    doctorId: '',
    city: input.city,
    state: input.state,
    foId: '',
    patientsExpected: input.patientsExpected,
    patientsDone: 0,
    devicesAllocated: [],
    rxCount: 0,
    feedback: 0,
    foRating: 0,
    notes: input.notes,
    mrId: input.mrId,
    mrName: input.mrName,
  }
}

// TODO: replace with real API calls once backend endpoints exist
export function recordCampBookingOnMr(mrId: string): void {
  const mr = mrs.find((m) => m.id === mrId)
  if (mr) mr.campsBooked += 1
}
