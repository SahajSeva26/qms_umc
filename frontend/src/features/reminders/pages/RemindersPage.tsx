import { useState } from 'react'
import { FiGrid, FiList, FiZap, FiMessageSquare } from 'react-icons/fi'
import { useCampsData } from '@/hooks/useCampsData'
import { usePeopleData } from '@/hooks/usePeopleData'
import { useReminderThreads, useReminderConfig } from '@/features/reminders/hooks/useReminders'
import DashboardTab from '@/features/reminders/components/DashboardTab'
import CampTimelinesTab from '@/features/reminders/components/CampTimelinesTab'
import TriggersTab from '@/features/reminders/components/TriggersTab'
import TemplatesSettingsTab from '@/features/reminders/components/TemplatesSettingsTab'

type TabId = 'dashboard' | 'timelines' | 'triggers' | 'templates'

const TABS: { id: TabId; label: string; icon: typeof FiGrid }[] = [
  { id: 'dashboard', label: 'Dashboard', icon: FiGrid },
  { id: 'timelines', label: 'Camp Timelines', icon: FiList },
  { id: 'triggers', label: 'Triggers', icon: FiZap },
  { id: 'templates', label: 'Templates & Settings', icon: FiMessageSquare },
]

// AI Camp Reminder & Confirmation — faithful React port of the vanilla-JS
// prototype's reminder-automation.html/js screen. Voice + WhatsApp reminders
// to FO & Dietitian · T-24h + T-2h · response capture · escalations ·
// per-camp activity timeline. The engine (tick/manualTrigger/bulkTrigger) is
// entirely owned by reminders.service.ts + useReminders.ts — this page and
// its tab components are pure rendering + user actions on top of it.
const RemindersPage = () => {
  const [tab, setTab] = useState<TabId>('dashboard')
  const { camps } = useCampsData()
  const { people } = usePeopleData()
  const { config } = useReminderConfig()
  const { threads, isLoading, manualTrigger, bulkTrigger, runTick, refresh } = useReminderThreads(camps, people)

  return (
    <div className="max-w-7xl">
      <div className="mb-3 flex items-start justify-between gap-3 flex-wrap">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-wide mb-1" style={{ color: 'var(--qms-text-muted)' }}>Operations · AI Automation</p>
          <h1 className="text-2xl font-bold" style={{ color: 'var(--qms-text)' }}>AI Camp Reminder &amp; Confirmation</h1>
          <p className="text-[13px] mt-1 max-w-3xl" style={{ color: 'var(--qms-text-muted)' }}>
            Voice + WhatsApp reminders to FO &amp; Dietitian · T-24h + T-2h · response capture · escalations · per-camp activity timeline
          </p>
        </div>
        <div className="flex items-center gap-2">
          {config?.enabled === false ? (
            <span className="text-[11px] font-extrabold tracking-wide px-3 py-1.5 rounded-full" style={{ background: 'rgba(239,68,68,.14)', color: '#b91c1c' }}>DISABLED</span>
          ) : (
            <span
              className="inline-flex items-center gap-1.5 text-[11px] font-extrabold tracking-wide px-3 py-1.5 rounded-full"
              style={{ background: 'linear-gradient(135deg,rgba(124,92,255,.14),rgba(59,109,255,.14))', border: '1px dashed rgba(124,92,255,.45)', color: '#7c5cff' }}
            >
              SIMULATION MODE
            </span>
          )}
        </div>
      </div>

      <div className="flex flex-wrap gap-1 mb-4 border-b overflow-x-auto" style={{ borderColor: 'var(--qms-border)' }}>
        {TABS.map((t) => {
          const Icon = t.icon
          return (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className="flex items-center gap-1.5 px-3.5 py-2.5 text-[13px] font-semibold border-b-2 transition-colors whitespace-nowrap"
              style={{
                color: tab === t.id ? 'var(--qms-text)' : 'var(--qms-text-muted)',
                borderBottomColor: tab === t.id ? 'var(--qms-brand)' : 'transparent',
              }}
            >
              <Icon size={13} /> {t.label}
            </button>
          )
        })}
      </div>

      {tab === 'dashboard' && (
        <DashboardTab threads={threads} isLoading={isLoading} onRefresh={refresh} />
      )}
      {tab === 'timelines' && (
        <CampTimelinesTab threads={threads} camps={camps} people={people} manualTrigger={manualTrigger} />
      )}
      {tab === 'triggers' && (
        <TriggersTab camps={camps} people={people} threads={threads} manualTrigger={manualTrigger} bulkTrigger={bulkTrigger} runTick={runTick} />
      )}
      {tab === 'templates' && <TemplatesSettingsTab />}
    </div>
  )
}

export default RemindersPage
