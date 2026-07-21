import { useMemo, useState } from 'react'
import { FiCalendar, FiCheckSquare, FiClock, FiFileText, FiFolder, FiPlus, FiX } from 'react-icons/fi'
import type { IconType } from 'react-icons'
import type { Client, ClientInvoice, ClientProject } from '@/types/client.types'
import type { RepAssignment } from '@/types/salesdash.types'
import type { SalesMeeting, SalesRep, SalesTask, TaskKind } from '@/types/salesdash.types'
import { Button } from '@/components/ui/button'
import { getGreeting, formatINR } from '@/utils/formatters'
import { useSalesTasks } from '@/features/crm/sales/hooks/useSalesTasks'
import { billingForClient, outstandingForClient, PROJECT_TYPE_COLORS } from '@/features/crm/clients/clients.utils'
import AddTaskDialog from '@/features/crm/sales/components/AddTaskDialog'
import SnoozeTaskDialog from '@/features/crm/sales/components/SnoozeTaskDialog'
import type { AddTaskInput } from '@/features/crm/sales/sales.tasks.service'

interface TodayTabProps {
  isApprover: boolean
  meRep: SalesRep | null
  reps: SalesRep[]
  meetings: SalesMeeting[]
  assignments: RepAssignment[]
  clients: Client[]
  projects: ClientProject[]
  invoices: ClientInvoice[]
}

const TASK_KIND_META: Record<TaskKind, { color: string; icon: IconType }> = {
  MEETING: { color: '#3b6dff', icon: FiCalendar },
  MOM: { color: '#f43f5e', icon: FiClock },
  LEAD: { color: '#f59e0b', icon: FiFolder },
  PO: { color: '#8b5cf6', icon: FiFileText },
  CUSTOM: { color: '#14b8a6', icon: FiCheckSquare },
}

const TASK_FILTERS: { id: 'PENDING' | 'SNOOZED' | 'DONE'; label: string }[] = [
  { id: 'PENDING', label: 'Pending' },
  { id: 'SNOOZED', label: 'Snoozed' },
  { id: 'DONE', label: 'Done' },
]

const PROJECT_TYPES: ClientProject['type'][] = ['Screening', 'Diet', 'Lab']

const TodayTab = ({ isApprover, meRep, reps, meetings, assignments, clients, projects, invoices }: TodayTabProps) => {
  const [taskFilter, setTaskFilter] = useState<'PENDING' | 'SNOOZED' | 'DONE'>('PENDING')
  const [addTaskOpen, setAddTaskOpen] = useState(false)
  const [snoozingTaskId, setSnoozingTaskId] = useState<string | null>(null)

  const todayIso = new Date().toISOString().slice(0, 10)
  const firstName = meRep?.name.split(' ')[0] ?? 'there'

  // Scope: KAM sees only themselves; Sales Head/approver with no rep filter
  // sees a team aggregate across every active rep (matches the prototype's
  // teamMode). Filtering to a single rep from a global filter isn't wired
  // into this dashboard yet, so approvers always see the team view here.
  const teamMode = isApprover
  const scopedReps = teamMode ? reps.filter((r) => !r.relievedOn) : meRep ? [meRep] : []
  const ownerKeys = scopedReps.map((r) => r.name.split(' ')[0])
  const viewingLabel = teamMode
    ? `All team (${scopedReps.length} rep${scopedReps.length === 1 ? '' : 's'})`
    : scopedReps[0]?.name ?? '—'

  // ClientProject carries no owner field directly — resolve it via
  // RepAssignment (repId -> clientId) so PO-chase auto-tasks (sales.tasks.service.ts)
  // can actually match a project back to the rep it's assigned to.
  const projectOwnerKey = (project: ClientProject) => {
    const owningRep = reps.find((r) => assignments.some((a) => a.repId === r.id && a.clientId === project.clientId))
    return owningRep?.name.split(' ')[0]
  }

  const { tasks, isLoading, error, markDone, snooze, addTask } = useSalesTasks({
    ownerKeys,
    meetings,
    projects,
    projectOwnerKey,
  })

  const buckets = useMemo(() => {
    const owned = tasks.filter((t) => ownerKeys.some((k) => k.toLowerCase() === (t.ownerKey || '').toLowerCase()))
    return {
      PENDING: owned.filter((t) => t.status === 'PENDING' && (!t.snoozedTo || t.snoozedTo <= todayIso)),
      SNOOZED: owned.filter((t) => t.status === 'PENDING' && t.snoozedTo && t.snoozedTo > todayIso),
      DONE: owned.filter((t) => t.status === 'DONE'),
    }
  }, [tasks, ownerKeys, todayIso])

  const todayMeetings = useMemo(
    () =>
      meetings
        .filter((m) => (m.startAt || '').slice(0, 10) === todayIso && ownerKeys.some((k) => (m.ownerName || '').includes(k)))
        .sort((a, b) => a.startAt.localeCompare(b.startAt)),
    [meetings, ownerKeys, todayIso]
  )

  // Portfolio: clients/projects assigned to reps in scope.
  const myAssignments = assignments.filter((a) => scopedReps.some((r) => r.id === a.repId))
  const myClientIds = new Set(myAssignments.map((a) => a.clientId))
  const myClients = clients.filter((c) => myClientIds.has(c.id))
  const myProjects = projects.filter((p) => myClientIds.has(p.clientId))

  const typeBreakdown = PROJECT_TYPES.map((type) => {
    const list = myProjects.filter((p) => p.type === type)
    const billing = list.reduce((sum, p) => sum + p.poValueInr, 0)
    return { type, count: list.length, billing }
  }).filter((t) => t.count > 0)

  // PO pending: camps already executed but no PO attached to the project yet.
  const posPending = myProjects.filter((p) => (p.campsDone || 0) > 0 && p.pos.length === 0)

  const myInvoices = invoices.filter((i) => myClients.some((c) => c.name.toLowerCase() === i.clientName.toLowerCase()))
  const totalBilled = myInvoices.reduce((sum, i) => sum + i.amount, 0)
  const totalPaid = myInvoices.filter((i) => i.status === 'PAID').reduce((sum, i) => sum + i.amount, 0)
  const totalOutstanding = myInvoices.filter((i) => i.status !== 'PAID').reduce((sum, i) => sum + i.amount, 0)
  const overdueInvoices = myInvoices.filter((i) => i.status === 'OVERDUE')

  const visibleTasks = buckets[taskFilter]

  return (
    <div>
      <div
        className="rounded-2xl border p-5 mb-4"
        style={{ background: 'linear-gradient(120deg, rgba(59,109,255,.08), rgba(20,184,166,.05))', borderColor: 'rgba(59,109,255,.2)' }}
      >
        <div className="flex flex-wrap items-center justify-between gap-3.5">
          <div>
            <div className="text-2xl font-extrabold" style={{ color: 'var(--qms-text)' }}>
              {getGreeting()}, {firstName} 👋
            </div>
            <div className="text-[13px] mt-1 flex items-center gap-2 flex-wrap" style={{ color: 'var(--qms-text-muted)' }}>
              {new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long' })} ·
              <span
                className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[12px] font-bold"
                style={teamMode ? { background: 'rgba(168,85,247,.12)', color: '#7c3aed' } : { background: 'rgba(59,109,255,.12)', color: 'var(--qms-brand)' }}
              >
                Viewing: {viewingLabel}
              </span>
              · <b style={{ color: 'var(--qms-text)' }}>{buckets.PENDING.length}</b> task{buckets.PENDING.length === 1 ? '' : 's'} due
              {buckets.SNOOZED.length > 0 && ` · ${buckets.SNOOZED.length} snoozed`}
              {buckets.DONE.length > 0 && ` · ${buckets.DONE.length} done`}
            </div>
          </div>
          {!teamMode && (
            <Button onClick={() => setAddTaskOpen(true)}>
              <FiPlus size={14} /> Add task
            </Button>
          )}
        </div>
      </div>

      <div className="rounded-2xl border mb-4" style={{ background: 'var(--qms-surface)', borderColor: 'var(--qms-border)' }}>
        <div className="flex items-center justify-between px-4 py-3 flex-wrap gap-2" style={{ borderBottom: '1px solid var(--qms-border)' }}>
          <div>
            <h3 className="text-[14px] font-bold" style={{ color: 'var(--qms-text)' }}>Today's task list</h3>
            <p className="text-[11px]" style={{ color: 'var(--qms-text-muted)' }}>Mark Yes when done · No to snooze with a specific date + time</p>
          </div>
          <div className="flex gap-1.5">
            {TASK_FILTERS.map((f) => (
              <button
                key={f.id}
                onClick={() => setTaskFilter(f.id)}
                className="px-2.5 py-1 rounded-full text-[11px] font-semibold border transition-all"
                style={
                  taskFilter === f.id
                    ? { background: 'var(--qms-brand)', borderColor: 'var(--qms-brand)', color: '#fff' }
                    : { background: 'var(--qms-surface-strong)', borderColor: 'var(--qms-border)', color: 'var(--qms-text-muted)' }
                }
              >
                {f.label} <span className="ml-1">{buckets[f.id].length}</span>
              </button>
            ))}
          </div>
        </div>

        {isLoading && (
          <div className="px-4 py-8 text-center text-[13px]" style={{ color: 'var(--qms-text-muted)' }}>
            Loading tasks…
          </div>
        )}

        {error && !isLoading && (
          <div className="mx-4 my-3 text-[13px] rounded-xl px-3 py-2 bg-danger-soft border border-danger text-danger">
            Failed to load tasks. Please try again.
          </div>
        )}

        {!isLoading && !error && visibleTasks.length === 0 && (
          <div className="px-4 py-8 text-center text-[13px]" style={{ color: 'var(--qms-text-muted)' }}>
            {taskFilter === 'PENDING' ? 'No tasks due today. 🎉' : 'Nothing here.'}
          </div>
        )}

        {!isLoading && !error &&
          visibleTasks.map((task) => (
            <TaskRow
              key={task.id}
              task={task}
              teamMode={teamMode}
              rep={reps.find((r) => r.name.split(' ')[0].toLowerCase() === task.ownerKey.toLowerCase())}
              canAct={!teamMode || (meRep ? task.ownerKey.toLowerCase() === meRep.name.split(' ')[0].toLowerCase() : false)}
              onMarkDone={() => markDone(task.id)}
              onSnooze={() => setSnoozingTaskId(task.id)}
              todayIso={todayIso}
            />
          ))}
      </div>

      {todayMeetings.length > 0 && (
        <div className="rounded-2xl border p-4 mb-4" style={{ background: 'var(--qms-surface)', borderColor: 'var(--qms-border)' }}>
          <h3 className="text-[13px] font-bold mb-2" style={{ color: 'var(--qms-text)' }}>Today's meetings</h3>
          <div className="space-y-1.5">
            {todayMeetings.map((m, i) => (
              <div key={m.id ?? i} className="flex items-center justify-between text-[12px] py-1">
                <span style={{ color: 'var(--qms-text)' }}>{m.pharmaName} · {m.contactName}</span>
                <span style={{ color: 'var(--qms-text-muted)' }}>{(m.startAt || '').slice(11, 16)}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="grid gap-3.5 mb-4" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))' }}>
        <div className="rounded-2xl border" style={{ background: 'var(--qms-surface)', borderColor: 'var(--qms-border)' }}>
          <div className="px-4 py-3" style={{ borderBottom: '1px solid var(--qms-border)' }}>
            <h3 className="text-[13px] font-bold" style={{ color: 'var(--qms-text)' }}>My companies + divisions</h3>
            <p className="text-[11px]" style={{ color: 'var(--qms-text-muted)' }}>{myClients.length} compan{myClients.length === 1 ? 'y' : 'ies'}</p>
          </div>
          {myClients.length === 0 ? (
            <div className="px-4 py-8 text-center text-[13px]" style={{ color: 'var(--qms-text-muted)' }}>No companies assigned to you yet.</div>
          ) : (
            myClients.map((c) => {
              const cProjects = myProjects.filter((p) => p.clientId === c.id)
              const billed = billingForClient(myInvoices, c.name)
              const outstanding = outstandingForClient(myInvoices, c.name)
              const cPos = posPending.filter((p) => p.clientId === c.id)
              return (
                <div key={c.id} className="flex items-center justify-between gap-3 px-4 py-3" style={{ borderBottom: '1px dashed var(--qms-border)' }}>
                  <div className="flex items-center gap-2.5 min-w-0 flex-1">
                    <span
                      className="w-9 h-9 rounded-lg flex items-center justify-center text-[13px] font-extrabold text-white shrink-0"
                      style={{ background: c.color }}
                    >
                      {c.logo}
                    </span>
                    <div className="min-w-0">
                      <div className="text-[13px] font-bold truncate" style={{ color: 'var(--qms-text)' }}>{c.name}</div>
                      <div className="text-[11px] truncate" style={{ color: 'var(--qms-text-muted)' }}>
                        {cProjects.length} project{cProjects.length === 1 ? '' : 's'}
                      </div>
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <div className="text-[13px] font-bold" style={{ color: 'var(--qms-text)' }}>{formatINR(billed)}</div>
                    <div className="text-[11px]" style={outstanding > 0 ? { color: 'var(--danger)' } : { color: '#059669' }}>
                      {outstanding > 0 ? `${formatINR(outstanding)} open` : 'paid'}
                      {cPos.length > 0 && ` · ${cPos.length} PO pending`}
                    </div>
                  </div>
                </div>
              )
            })
          )}
        </div>

        <div className="rounded-2xl border" style={{ background: 'var(--qms-surface)', borderColor: 'var(--qms-border)' }}>
          <div className="px-4 py-3" style={{ borderBottom: '1px solid var(--qms-border)' }}>
            <h3 className="text-[13px] font-bold" style={{ color: 'var(--qms-text)' }}>Project types · count + billing</h3>
            <p className="text-[11px]" style={{ color: 'var(--qms-text-muted)' }}>Across my portfolio</p>
          </div>
          {typeBreakdown.length === 0 ? (
            <div className="px-4 py-8 text-center text-[13px]" style={{ color: 'var(--qms-text-muted)' }}>No projects yet.</div>
          ) : (
            typeBreakdown.map((t) => {
              const color = PROJECT_TYPE_COLORS[t.type]
              return (
                <div key={t.type} className="flex items-center justify-between gap-3 px-4 py-3" style={{ borderBottom: '1px dashed var(--qms-border)' }}>
                  <div className="flex items-center gap-2.5">
                    <span className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0" style={{ background: `${color}22`, color }}>
                      <FiFolder size={15} />
                    </span>
                    <div>
                      <div className="text-[13px] font-bold" style={{ color: 'var(--qms-text)' }}>{t.type}</div>
                      <div className="text-[11px]" style={{ color: 'var(--qms-text-muted)' }}>{t.count} project{t.count === 1 ? '' : 's'}</div>
                    </div>
                  </div>
                  <div className="text-[13px] font-bold" style={{ color }}>{formatINR(t.billing)}</div>
                </div>
              )
            })
          )}
        </div>
      </div>

      <div className="grid gap-3.5" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))' }}>
        <div className="rounded-2xl border" style={{ background: 'var(--qms-surface)', borderColor: 'var(--qms-border)' }}>
          <div className="flex items-center justify-between px-4 py-3" style={{ borderBottom: '1px solid var(--qms-border)' }}>
            <div>
              <h3 className="text-[13px] font-bold" style={{ color: 'var(--qms-text)' }}>POs pending · project started</h3>
              <p className="text-[11px]" style={{ color: 'var(--qms-text-muted)' }}>Camps executed but PO not yet uploaded</p>
            </div>
            <span
              className="text-[10px] font-bold px-2 py-0.5 rounded-full"
              style={posPending.length > 0 ? { background: 'rgba(245,158,11,.15)', color: '#d97706' } : { background: 'rgba(16,185,129,.15)', color: '#059669' }}
            >
              {posPending.length}
            </span>
          </div>
          {posPending.length === 0 ? (
            <div className="px-4 py-8 text-center text-[13px]" style={{ color: 'var(--qms-text-muted)' }}>No PO pending. Every executed project has a PO upload. ✓</div>
          ) : (
            posPending.slice(0, 6).map((p) => {
              const client = clients.find((c) => c.id === p.clientId)
              return (
                <div key={p.id} className="px-4 py-3" style={{ borderBottom: '1px dashed var(--qms-border)' }}>
                  <div className="text-[13px] font-bold" style={{ color: 'var(--qms-text)' }}>{client?.name ?? '—'} · {p.id}</div>
                  <div className="text-[11px]" style={{ color: 'var(--qms-text-muted)' }}>{p.name} · {p.campsDone}/{p.campsTarget} camps done</div>
                </div>
              )
            })
          )}
        </div>

        <div className="rounded-2xl border" style={{ background: 'var(--qms-surface)', borderColor: 'var(--qms-border)' }}>
          <div className="flex items-center justify-between px-4 py-3" style={{ borderBottom: '1px solid var(--qms-border)' }}>
            <div>
              <h3 className="text-[13px] font-bold" style={{ color: 'var(--qms-text)' }}>Invoicing &amp; outstanding</h3>
              <p className="text-[11px]" style={{ color: 'var(--qms-text-muted)' }}>My clients' AR</p>
            </div>
            <span
              className="text-[10px] font-bold px-2 py-0.5 rounded-full"
              style={totalOutstanding > 0 ? { background: 'rgba(244,63,94,.15)', color: 'var(--danger)' } : { background: 'rgba(16,185,129,.15)', color: '#059669' }}
            >
              {totalOutstanding > 0 ? formatINR(totalOutstanding) : 'paid'}
            </span>
          </div>
          <div className="grid grid-cols-3 gap-2 p-3">
            {[
              { label: 'Total billed', value: totalBilled, color: 'var(--qms-brand)' },
              { label: 'Paid', value: totalPaid, color: '#059669' },
              { label: 'Outstanding', value: totalOutstanding, color: totalOutstanding > 0 ? 'var(--danger)' : 'var(--qms-text-muted)' },
            ].map((tile) => (
              <div key={tile.label} className="rounded-lg p-2.5 text-center" style={{ background: 'var(--qms-surface-strong)' }}>
                <div className="text-[15px] font-extrabold" style={{ color: tile.color }}>{formatINR(tile.value)}</div>
                <div className="text-[10px]" style={{ color: 'var(--qms-text-muted)' }}>{tile.label}</div>
              </div>
            ))}
          </div>
          {overdueInvoices.length > 0 && (
            <div className="px-4 pb-3">
              <div className="text-[10px] font-bold uppercase tracking-wider mb-1.5" style={{ color: 'var(--qms-text-muted)' }}>
                Overdue ({overdueInvoices.length})
              </div>
              {overdueInvoices.slice(0, 4).map((inv) => (
                <div key={inv.id} className="flex items-center justify-between text-[12px] py-1" style={{ borderTop: '1px dashed var(--qms-border)' }}>
                  <div style={{ color: 'var(--qms-text)' }}><b>{inv.id}</b> · {inv.clientName}</div>
                  <div className="font-bold" style={{ color: 'var(--danger)' }}>{formatINR(inv.amount)}</div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {addTaskOpen && meRep && (
        <AddTaskDialog
          ownerKey={meRep.name.split(' ')[0]}
          onClose={() => setAddTaskOpen(false)}
          onSave={(input: AddTaskInput) => {
            addTask(input)
            setAddTaskOpen(false)
          }}
        />
      )}

      {snoozingTaskId && (
        <SnoozeTaskDialog
          onClose={() => setSnoozingTaskId(null)}
          onConfirm={(snoozedTo, snoozedTime) => {
            snooze(snoozingTaskId, snoozedTo, snoozedTime)
            setSnoozingTaskId(null)
          }}
        />
      )}
    </div>
  )
}

interface TaskRowProps {
  task: SalesTask
  teamMode: boolean
  rep: SalesRep | undefined
  canAct: boolean
  onMarkDone: () => void
  onSnooze: () => void
  todayIso: string
}

const TaskRow = ({ task, teamMode, rep, canAct, onMarkDone, onSnooze, todayIso }: TaskRowProps) => {
  const meta = TASK_KIND_META[task.kind]
  const Icon = meta.icon
  const isDone = task.status === 'DONE'
  const isSnoozed = task.status === 'PENDING' && !!task.snoozedTo && task.snoozedTo > todayIso

  return (
    <div className="flex items-center gap-2.5 px-4 py-2.5" style={{ borderBottom: '1px dashed var(--qms-border)', opacity: isDone ? 0.55 : 1 }}>
      {teamMode && rep && (
        <span
          className="w-6 h-6 rounded-full flex items-center justify-center text-[9px] font-extrabold text-white shrink-0"
          style={{ background: 'var(--qms-brand)' }}
          title={rep.name}
        >
          {rep.name.split(' ').map((s) => s[0]).slice(0, 2).join('').toUpperCase()}
        </span>
      )}
      <span className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0" style={{ background: `${meta.color}22`, color: meta.color }}>
        <Icon size={15} />
      </span>
      <div className="flex-1 min-w-0">
        <div className="text-[13px] font-bold truncate" style={{ color: 'var(--qms-text)', textDecoration: isDone ? 'line-through' : undefined }}>
          {task.title}
        </div>
        <div className="text-[11px] truncate" style={{ color: 'var(--qms-text-muted)' }}>
          {teamMode && rep && <b>{rep.name.split(' ')[0]} · </b>}
          {task.detail}
          {isSnoozed && <b> · snoozed to {task.snoozedTo}{task.snoozedTime ? ` ${task.snoozedTime}` : ''}</b>}
        </div>
      </div>
      {isDone ? (
        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-success-soft text-success shrink-0">Done</span>
      ) : isSnoozed ? (
        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full shrink-0" style={{ background: 'rgba(245,158,11,.15)', color: '#d97706' }}>
          {task.snoozedTo}
        </span>
      ) : canAct ? (
        <div className="flex gap-1.5 shrink-0">
          <Button size="xs" onClick={onMarkDone}><FiCheckSquare size={12} /> Yes</Button>
          <Button size="xs" variant="ghost" className="text-danger" onClick={onSnooze}><FiX size={12} /> No</Button>
        </div>
      ) : (
        <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full shrink-0" style={{ background: 'var(--qms-surface-strong)', color: 'var(--qms-text-muted)' }}>
          View only
        </span>
      )}
    </div>
  )
}

export default TodayTab
