import { useState } from 'react'
import { FiFolder, FiPlusCircle } from 'react-icons/fi'
import PharmaRoleGate from '@/features/pharma/components/PharmaRoleGate'
import PharmaProjectsPage from '@/features/pharma/pages/PharmaProjectsPage'
import MrBookCampTab from '@/features/pharma/components/MrBookCampTab'

type TabId = 'projects' | 'book'

const TABS: { id: TabId; label: string; icon: typeof FiFolder }[] = [
  { id: 'projects', label: 'Your projects', icon: FiFolder },
  { id: 'book', label: 'Book camp', icon: FiPlusCircle },
]

const MrPortalPage = () => {
  const [tab, setTab] = useState<TabId>('projects')

  return (
    <PharmaRoleGate roleTypeCode="pharma-mr">
      <div className="w-full">
        <div className="mb-4">
          <div className="text-[12px] mb-1" style={{ color: 'var(--qms-text-muted)' }}>Pharma · MR Portal</div>
          <h1 className="text-2xl font-bold" style={{ color: 'var(--qms-text)' }}>MR Portal</h1>
        </div>

        <div className="flex flex-wrap gap-1 mb-4 border-b overflow-x-auto" style={{ borderColor: 'var(--qms-border)' }}>
          {TABS.map((t) => {
            const Icon = t.icon
            return (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                className="flex items-center gap-1.5 px-3 py-2.5 text-[12.5px] font-semibold border-b-2 transition-colors shrink-0"
                style={{
                  color: tab === t.id ? 'var(--qms-text)' : 'var(--qms-text-muted)',
                  borderBottomColor: tab === t.id ? 'var(--qms-brand)' : 'transparent',
                }}
              >
                <Icon size={12} /> {t.label}
              </button>
            )
          })}
        </div>

        {tab === 'projects' && <PharmaProjectsPage />}
        {tab === 'book' && <MrBookCampTab />}
      </div>
    </PharmaRoleGate>
  )
}

export default MrPortalPage
