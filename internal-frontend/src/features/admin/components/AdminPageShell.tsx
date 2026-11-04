import type { IconType } from 'react-icons'
import type { ReactNode } from 'react'

export interface AdminPageTab {
  view: string
  label: string
  icon: IconType
}

interface AdminPageShellProps {
  children: ReactNode
  tabs: AdminPageTab[]
  activeView: string
  onViewChange: (view: string) => void
}

// One tab strip only, no nested "Master Data" sub-tab level — user's explicit call.
function AdminPageShell({ children, tabs, activeView, onViewChange }: AdminPageShellProps) {
  return (
    <div className="w-full">
      <div className="mb-4">
        <div className="text-[12px] mb-1" style={{ color: 'var(--qms-text-muted)' }}>Admin · Master Data</div>
        <h1 className="text-2xl font-bold" style={{ color: 'var(--qms-text)' }}>Master Data</h1>
      </div>

      <div className="flex gap-1 mb-4 border-b overflow-x-auto hide-scrollbar" style={{ borderColor: 'var(--qms-border)' }}>
        {tabs.map((tab) => {
          const active = activeView === tab.view
          const Icon = tab.icon
          return (
            <button
              key={tab.view}
              onClick={() => onViewChange(tab.view)}
              className="flex items-center gap-1.5 px-4 py-2.5 text-[13px] font-semibold border-b-2 -mb-px shrink-0 transition-colors"
              style={{
                color: active ? 'var(--qms-text)' : 'var(--qms-text-muted)',
                borderBottomColor: active ? 'var(--qms-brand)' : 'transparent',
              }}
            >
              <Icon size={13} /> {tab.label}
            </button>
          )
        })}
      </div>

      {children}
    </div>
  )
}

export default AdminPageShell
