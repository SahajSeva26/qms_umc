import { useState } from 'react'
import { FiFolder, FiPlusCircle, FiBarChart2, FiUsers } from 'react-icons/fi'
import PharmaRoleGate from '@/features/pharma/components/PharmaRoleGate'
import PharmaProjectsPage from '@/features/pharma/pages/PharmaProjectsPage'
import MrBookCampTab from '@/features/pharma/components/MrBookCampTab'
import PharmaDashboardTab from '@/features/pharma/components/PharmaDashboardTab'
import PharmaDoctorsTab from '@/features/pharma/components/PharmaDoctorsTab'

type TabId = 'dashboard' | 'projects' | 'book' | 'doctors'

const TABS: { id: TabId; label: string; icon: typeof FiFolder }[] = [
  { id: 'dashboard', label: 'Dashboard', icon: FiBarChart2 },
  { id: 'projects', label: 'Your projects', icon: FiFolder },
  { id: 'book', label: 'Book camp', icon: FiPlusCircle },
  { id: 'doctors', label: 'Doctors', icon: FiUsers },
]

interface PharmaPortalPageProps {
  roleTypeCode: string
  /** Shown in the breadcrumb, e.g. "HO" → "Pharma · HO Portal". */
  portalLabel: string
}

// Shared shell for all 4 pharma portals (HO/RSM/ASM/MR) — identical tab structure and booking form.
// Confirmed product decision (not prototype-accurate, which has per-role tabs) — revisit later per the user's own call, see md-files/ui-revisions.md.
const PharmaPortalPage = ({ roleTypeCode, portalLabel }: PharmaPortalPageProps) => {
  const [tab, setTab] = useState<TabId>('dashboard')

  return (
    <PharmaRoleGate roleTypeCode={roleTypeCode}>
      <div className="w-full">
        <div className="mb-4">
          <div className="text-[12px] mb-1" style={{ color: 'var(--qms-text-muted)' }}>Pharma · {portalLabel} Portal</div>
          <h1 className="text-2xl font-bold" style={{ color: 'var(--qms-text)' }}>{portalLabel} Portal</h1>
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

        {tab === 'dashboard' && <PharmaDashboardTab />}
        {tab === 'projects' && <PharmaProjectsPage />}
        {tab === 'book' && <MrBookCampTab />}
        {tab === 'doctors' && <PharmaDoctorsTab />}
      </div>
    </PharmaRoleGate>
  )
}

export default PharmaPortalPage
