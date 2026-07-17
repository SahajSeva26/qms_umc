import { useState } from 'react'
import type { IconType } from 'react-icons'
import { FiCalendar, FiAlertTriangle, FiBriefcase, FiFileText, FiCheckSquare, FiZap } from 'react-icons/fi'
import { TASKS, QUARTER } from '@/features/dashboard/dashboard.mock'
import { useAuth } from '@/hooks/useAuth'
import UserAvatar from '@/components/ui/UserAvatar'
import type { DashboardTask } from '@/types/dashboard.types'

const KIND_META: Record<DashboardTask['kind'], { color: string; icon: IconType }> = {
  MEETING: { color: 'var(--qms-role-sales-lead)', icon: FiCalendar },
  MOM: { color: 'var(--danger)', icon: FiAlertTriangle },
  LEAD: { color: 'var(--warning)', icon: FiBriefcase },
  PO: { color: 'var(--qms-role-admin)', icon: FiFileText },
  CUSTOM: { color: 'var(--qms-teal)', icon: FiCheckSquare },
}

const FILTERS: DashboardTask['status'][] = ['PENDING', 'SNOOZED', 'DONE']

const SalesCommandCenter = () => {
  const { user } = useAuth()
  const [tasks, setTasks] = useState<DashboardTask[]>(TASKS)
  const [taskFilter, setTaskFilter] = useState<DashboardTask['status']>('PENDING')

  const markTask = (id: string, action: 'YES' | 'NO') => {
    setTasks((prev) =>
      prev.map((t) =>
        t.id === id
          ? action === 'YES'
            ? { ...t, status: 'DONE' }
            : { ...t, status: 'SNOOZED', snoozeUntil: 'tomorrow' }
          : t
      )
    )
  }

  const visible = tasks.filter((t) => t.status === taskFilter)
  const counts = {
    PENDING: tasks.filter((t) => t.status === 'PENDING').length,
    SNOOZED: tasks.filter((t) => t.status === 'SNOOZED').length,
    DONE: tasks.filter((t) => t.status === 'DONE').length,
  }

  return (
    <div
      className="rounded-2xl border p-4 md:p-5 mb-3.5"
      style={{ background: 'var(--qms-surface)', borderColor: 'var(--qms-border)' }}
    >
      <div className="flex items-center justify-between gap-3 mb-3">
        <div>
          <h2 className="text-[15px] font-bold" style={{ color: 'var(--qms-text)' }}>Sales Command Center</h2>
          <p className="text-[11px]" style={{ color: 'var(--qms-text-muted)' }}>Full sales dashboard · pipeline · targets · performance</p>
        </div>
        <span
          className="text-[11px] font-bold px-2 py-1 rounded-full"
          style={{ background: 'var(--qms-surface-strong)', color: 'var(--qms-text-soft)' }}
        >
          {QUARTER}
        </span>
      </div>

      <div
        className="flex items-start gap-2.5 rounded-xl p-3 mb-4"
        style={{ background: 'linear-gradient(135deg, rgba(36,81,240,.08), rgba(20,184,166,.06))', border: '1px solid var(--qms-border)' }}
      >
        <div
          className="w-7 h-7 rounded-lg flex items-center justify-center text-white shrink-0"
          style={{ background: 'linear-gradient(135deg, var(--qms-brand), var(--qms-teal))' }}
        >
          <FiZap size={14} />
        </div>
        <p className="text-[12px] leading-relaxed" style={{ color: 'var(--qms-text-soft)' }}>
          <span className="font-bold" style={{ color: 'var(--qms-text)' }}>Sales copilot:</span>{' '}
          Team is tracking toward quarter target. Review the task list below to keep momentum.
        </p>
      </div>

      <div
        className="rounded-xl p-4 mb-4"
        style={{ background: 'var(--qms-surface-strong)', border: '1px solid var(--qms-border)' }}
      >
        <h3 className="text-sm font-bold mb-0.5" style={{ color: 'var(--qms-text)' }}>
          Good morning, {user?.firstName ?? 'there'} 👋
        </h3>
        <p className="text-[11px]" style={{ color: 'var(--qms-text-muted)' }}>{tasks.length} tasks due</p>
      </div>

      <div className="flex items-center justify-between mb-2.5">
        <h3 className="text-[13px] font-bold" style={{ color: 'var(--qms-text)' }}>Today's task list</h3>
        <div className="flex gap-1.5">
          {FILTERS.map((f) => (
            <button
              key={f}
              onClick={() => setTaskFilter(f)}
              className="px-2.5 py-1 rounded-full text-[11px] font-semibold border transition-all"
              style={
                f === taskFilter
                  ? { background: 'var(--qms-brand)', borderColor: 'var(--qms-brand)', color: '#fff' }
                  : { background: 'var(--qms-surface-strong)', borderColor: 'var(--qms-border)', color: 'var(--qms-text-muted)' }
              }
            >
              {f.charAt(0) + f.slice(1).toLowerCase()} {counts[f]}
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-1">
        {visible.length === 0 && (
          <div className="text-[13px] py-6 text-center" style={{ color: 'var(--qms-text-muted)' }}>
            Nothing here.
          </div>
        )}
        {visible.map((task) => {
          const meta = KIND_META[task.kind]
          const Icon = meta.icon
          return (
            <div
              key={task.id}
              className="flex items-center gap-3 py-2.5 px-1.5 rounded-lg"
              style={{ borderBottom: '1px dashed var(--qms-border)' }}
            >
              {task.ownerName && <UserAvatar firstName={task.ownerName.split(' ')[0]} lastName={task.ownerName.split(' ')[1]} tone={task.ownerTone} size="sm" />}
              <div
                className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0"
                style={{ background: `color-mix(in oklch, ${meta.color}, transparent 86%)`, color: meta.color }}
              >
                <Icon size={13} />
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-[13px] font-semibold truncate" style={{ color: 'var(--qms-text)' }}>{task.title}</div>
                <div className="text-[11px] truncate" style={{ color: 'var(--qms-text-muted)' }}>{task.detail}</div>
              </div>
              {task.canAct && task.status === 'PENDING' ? (
                <div className="flex gap-1.5 shrink-0">
                  <button
                    onClick={() => markTask(task.id, 'YES')}
                    className="px-2.5 py-1 rounded-lg text-[11px] font-bold bg-success-soft text-success"
                  >
                    Yes
                  </button>
                  <button
                    onClick={() => markTask(task.id, 'NO')}
                    className="px-2.5 py-1 rounded-lg text-[11px] font-bold"
                    style={{ background: 'var(--qms-surface-strong)', color: 'var(--qms-text-muted)' }}
                  >
                    No
                  </button>
                </div>
              ) : (
                <span
                  className="text-[11px] font-semibold px-2 py-1 rounded-full shrink-0"
                  style={{ background: 'var(--qms-surface-strong)', color: 'var(--qms-text-muted)' }}
                >
                  {task.status === 'DONE' ? 'Done' : task.status === 'SNOOZED' ? `Snoozed · ${task.snoozeUntil}` : 'View only'}
                </span>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

export default SalesCommandCenter
