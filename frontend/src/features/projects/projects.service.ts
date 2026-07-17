import type { Project, ProjectStatus, VoidCamp } from '@/types/project.types'
import { PROJECTS as SEED_PROJECTS } from '@/features/projects/projects.mock'

// TODO: replace with real API calls once backend endpoints exist.
// Module-level store stands in for the server: each mutation updates it and
// resolves with the fresh array, mirroring what a REST endpoint would return.
//
// Deliberately a SEPARATE localStorage key from Client Management's
// 'qms.master.projects' (features/crm/clients/clients.service.ts) — that
// module already persists a lighter ClientProject[] shape there for its PO
// feature. Reusing the same key would let two incompatible shapes clobber
// each other. Both are seeded from the same client/division master data so
// they still read as one system.
const PROJECTS_KEY = 'qms.master.projects.full'

function loadProjects(): Project[] {
  try {
    const raw = localStorage.getItem(PROJECTS_KEY)
    if (raw) return JSON.parse(raw)
  } catch {
    // fall through to seed
  }
  return JSON.parse(JSON.stringify(SEED_PROJECTS))
}

function persist(next: Project[]) {
  try {
    localStorage.setItem(PROJECTS_KEY, JSON.stringify(next))
  } catch {
    // demo persistence only — safe to ignore quota/serialization errors
  }
}

let projectsStore: Project[] = loadProjects()

const now = () => new Date().toISOString()

export const getProjects = async (): Promise<Project[]> => projectsStore

export const createProject = async (project: Project): Promise<Project[]> => {
  projectsStore = [project, ...projectsStore]
  persist(projectsStore)
  return projectsStore
}

export const updateProject = async (project: Project): Promise<Project[]> => {
  projectsStore = projectsStore.map((p) => (p.id === project.id ? { ...project, updatedAt: now() } : p))
  persist(projectsStore)
  return projectsStore
}

export const changeStatus = async (id: string, status: ProjectStatus, reason: string, by: string): Promise<Project[]> => {
  projectsStore = projectsStore.map((p) => {
    if (p.id !== id) return p
    const entry = { from: p.status, to: status, reason, at: now(), by }
    return {
      ...p,
      status,
      closeReason: status === 'CLOSED' && !p.closeReason ? reason : p.closeReason,
      statusHistory: [...p.statusHistory, entry],
      updatedAt: now(),
    }
  })
  persist(projectsStore)
  return projectsStore
}

export const closeProject = async (id: string, reason: string): Promise<Project[]> => {
  projectsStore = projectsStore.map((p) =>
    p.id === id ? { ...p, status: 'CLOSED' as const, closeReason: reason, updatedAt: now() } : p
  )
  persist(projectsStore)
  return projectsStore
}

export const reopenProject = async (id: string): Promise<Project[]> => {
  projectsStore = projectsStore.map((p) =>
    p.id === id ? { ...p, status: 'HOLD' as const, closeReason: '', updatedAt: now() } : p
  )
  persist(projectsStore)
  return projectsStore
}

export const renewProject = async (
  sourceId: string,
  input: { id: string; name: string; poDate: string; poExpiry: string; poNo: string }
): Promise<Project[]> => {
  const source = projectsStore.find((p) => p.id === sourceId)
  if (!source) return projectsStore

  const cloned: Project = {
    ...JSON.parse(JSON.stringify(source)),
    id: input.id,
    name: input.name,
    poNo: input.poNo,
    poDate: input.poDate,
    poExpiry: input.poExpiry,
    pos:
      source.executionMode === 'PO'
        ? [{ id: `po-${input.id}`, poNo: input.poNo, poDate: input.poDate, poExpiry: input.poExpiry, campCount: source.totalCamps, value: source.valueAfterGst, status: 'ACTIVE' as const }]
        : [],
    campsDone: 0,
    voidCamps: [],
    status: 'LIVE' as const,
    statusHistory: [],
    createdAt: now(),
    updatedAt: now(),
  }

  projectsStore = [cloned, ...projectsStore]
  persist(projectsStore)
  return projectsStore
}

export const addVoidCamp = async (projectId: string, voidCamp: VoidCamp): Promise<Project[]> => {
  projectsStore = projectsStore.map((p) =>
    p.id === projectId ? { ...p, voidCamps: [...p.voidCamps, voidCamp], updatedAt: now() } : p
  )
  persist(projectsStore)
  return projectsStore
}

export const removeVoidCamp = async (projectId: string, voidCampId: string): Promise<Project[]> => {
  projectsStore = projectsStore.map((p) =>
    p.id === projectId ? { ...p, voidCamps: p.voidCamps.filter((v) => v.id !== voidCampId), updatedAt: now() } : p
  )
  persist(projectsStore)
  return projectsStore
}
