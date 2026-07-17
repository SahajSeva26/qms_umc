import type { Lead } from '@/types/lead.types'
import type { ClientProject } from '@/types/client.types'
import type { SalesMeeting, SalesTask, TaskKind } from '@/types/salesdash.types'

// TODO: entirely mock/frontend-only — no backend endpoints exist for tasks yet.
// Auto-derived from meetings/leads/projects, mirroring the prototype's
// ensureAutoTasks(): tasks are keyed by sourceRef so re-deriving them on every
// render never creates duplicates. Only CUSTOM (user-added) tasks lack one.

const TASKS_KEY = 'qms.sales.tasks'

function loadTasks(): SalesTask[] {
  try {
    const raw = localStorage.getItem(TASKS_KEY)
    if (raw) return JSON.parse(raw)
  } catch {
    // fall through to empty
  }
  return []
}

function persistTasks(tasks: SalesTask[]) {
  try {
    localStorage.setItem(TASKS_KEY, JSON.stringify(tasks))
  } catch {
    // demo persistence only — safe to ignore quota/serialization errors
  }
}

function genTaskId(): string {
  return `tk-${Date.now().toString(36)}${Math.floor(Math.random() * 1000).toString(36)}`
}

function owns(name: string | undefined, ownerKey: string): boolean {
  if (!ownerKey) return false
  return (name ?? '').toLowerCase().includes(ownerKey.toLowerCase())
}

interface AutoTaskSources {
  meetings: SalesMeeting[]
  leads: Lead[]
  projects: ClientProject[]
  /** project.id -> owning rep's first-name key, since ClientProject has no ownerId in our model */
  projectOwnerKey: (project: ClientProject) => string | undefined
}

// Derives stable auto-tasks for one rep (by first-name key) from real data:
// today's PLANNED meetings, overdue MOMs, leads stuck 14+ days, and projects
// with camps executed but no PO attached yet. Idempotent via sourceRef.
function ensureAutoTasks(ownerKey: string, sources: AutoTaskSources): SalesTask[] {
  const all = loadTasks()
  const existingRefs = new Set(all.map((t) => t.sourceRef).filter(Boolean))
  const todayIso = new Date().toISOString().slice(0, 10)

  const add = (task: Omit<SalesTask, 'id' | 'status' | 'createdAt'>) => {
    if (!task.sourceRef || existingRefs.has(task.sourceRef)) return
    all.unshift({ ...task, id: genTaskId(), status: 'PENDING', createdAt: new Date().toISOString() })
    existingRefs.add(task.sourceRef)
  }

  for (const m of sources.meetings) {
    if (!owns(m.ownerName, ownerKey)) continue
    const day = (m.startAt || '').slice(0, 10)
    if (day === todayIso && m.status === 'PLANNED') {
      add({
        title: `Meeting · ${m.pharmaName || 'Unknown'}`,
        detail: `${m.contactName || '—'} · ${m.agendaPublic || 'No agenda'} · ${(m.startAt || '').slice(11, 16)}`,
        kind: 'MEETING',
        sourceRef: `mt:${m.id}`,
        dueOn: todayIso,
        ownerKey,
      })
    }
    if (m.status === 'PLANNED' && !m.momSubmittedAt && m.endAt && new Date(m.endAt) <= new Date()) {
      add({
        title: `Submit MOM · ${m.pharmaName || 'Unknown'}`,
        detail: `Meeting ended ${(m.endAt || '').slice(0, 16).replace('T', ' ')}`,
        kind: 'MOM',
        sourceRef: `mom:${m.id}`,
        dueOn: todayIso,
        ownerKey,
      })
    }
  }

  for (const l of sources.leads) {
    if (!owns(l.owner, ownerKey)) continue
    if (l.stage === 'won' || l.stage === 'lost') continue
    if ((l.age || 0) < 14) continue
    add({
      title: `Follow up · ${l.account || '—'}`,
      detail: `${l.id} · stage ${l.stage} · ${l.age || 0}d stuck`,
      kind: 'LEAD',
      sourceRef: `lead:${l.id}`,
      dueOn: todayIso,
      ownerKey,
    })
  }

  for (const p of sources.projects) {
    if (!owns(sources.projectOwnerKey(p), ownerKey)) continue
    const hasCamps = (p.campsDone || 0) > 0
    const hasPo = p.pos.length > 0
    if (hasPo || !hasCamps) continue
    add({
      title: `Chase PO · ${p.name || p.id}`,
      detail: `${p.id} · ${p.campsDone || 0} camps already executed without PO upload`,
      kind: 'PO',
      sourceRef: `po:${p.id}`,
      dueOn: todayIso,
      ownerKey,
    })
  }

  persistTasks(all)
  return all
}

// TODO: replace with real API calls once backend endpoints exist
export async function getTasksForOwners(ownerKeys: string[], sources: AutoTaskSources): Promise<SalesTask[]> {
  for (const key of ownerKeys) ensureAutoTasks(key, sources)
  const ownerSet = new Set(ownerKeys.map((k) => k.toLowerCase()))
  return loadTasks().filter((t) => ownerSet.has((t.ownerKey || '').toLowerCase()))
}

// TODO: replace with real API calls once backend endpoints exist
export async function markTaskDone(taskId: string): Promise<SalesTask[]> {
  const all = loadTasks()
  const next = all.map((t) => (t.id === taskId ? { ...t, status: 'DONE' as const, doneAt: new Date().toISOString() } : t))
  persistTasks(next)
  return next
}

// TODO: replace with real API calls once backend endpoints exist
export async function snoozeTask(taskId: string, snoozedTo: string, snoozedTime?: string): Promise<SalesTask[]> {
  const all = loadTasks()
  const next = all.map((t) => (t.id === taskId ? { ...t, snoozedTo, ...(snoozedTime ? { snoozedTime } : {}) } : t))
  persistTasks(next)
  return next
}

export interface AddTaskInput {
  title: string
  detail: string
  dueOn: string
  dueTime?: string
  ownerKey: string
}

// TODO: replace with real API calls once backend endpoints exist
export async function addTask(input: AddTaskInput): Promise<SalesTask[]> {
  const all = loadTasks()
  const task: SalesTask = {
    id: genTaskId(),
    title: input.title,
    detail: input.detail,
    kind: 'CUSTOM' as TaskKind,
    dueOn: input.dueOn,
    dueTime: input.dueTime,
    ownerKey: input.ownerKey,
    status: 'PENDING',
    createdAt: new Date().toISOString(),
  }
  all.unshift(task)
  persistTasks(all)
  return all
}
