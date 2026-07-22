import { useMemo, useState } from 'react'
import { FiGrid, FiUserCheck, FiFolder, FiUnlock, FiCreditCard } from 'react-icons/fi'
import { useAuth } from '@/hooks/useAuth'
import { useCampsData } from '@/hooks/useCampsData'
import { useScope, dietCampsForScope, userName } from '@/features/diet/components/approvals/helpers'
import ScopeBanner from '@/features/diet/components/approvals/ScopeBanner'
import DashboardTab from '@/features/diet/components/approvals/DashboardTab'
import AssignTab from '@/features/diet/components/approvals/AssignTab'
import MyProjectsTab from '@/features/diet/components/approvals/MyProjectsTab'
import ReopenTab from '@/features/diet/components/approvals/ReopenTab'
import DietitiansBankTab from '@/features/diet/components/approvals/DietitiansBankTab'

type TabId = 'dashboard' | 'assign' | 'projects' | 'reopen' | 'bank'

const TABS: { id: TabId; label: string; icon: typeof FiGrid }[] = [
  { id: 'dashboard', label: 'Dashboard', icon: FiGrid },
  { id: 'assign', label: 'Assign dietitian', icon: FiUserCheck },
  { id: 'projects', label: 'My diet projects', icon: FiFolder },
  { id: 'reopen', label: 'Reopen requests', icon: FiUnlock },
  { id: 'bank', label: 'Dietitians & bank', icon: FiCreditCard },
]

// Diet Coordinator Workspace — faithful React port of the vanilla-JS
// prototype's diet-approvals.js screen. Fully derived UI: every tab
// recomputes from live camps/people data on every render, no cached view
// state (matches the prototype's own STATE={tab:'dashboard'}-only
// philosophy). The prototype's tabPending/tabHistory/proposalCard/
// daApprove/daReject functions are unreachable dead code (never wired to a
// tab button) and are deliberately NOT ported — the live product has
// exactly these 5 tabs. The header's "Load sample data" seeder button is
// also omitted: this React port already ships with rich seed data baked
// into camps.mock.ts/people.mock.ts, so there's nothing for it to do.
const DietApprovalsPage = () => {
  const { user } = useAuth()
  const { camps } = useCampsData()
  const [tab, setTab] = useState<TabId>('dashboard')

  const name = userName(user)
  const { adminLike, coordId } = useScope(user?.role, name)

  const scopedCamps = useMemo(() => dietCampsForScope(camps, adminLike, coordId), [camps, adminLike, coordId])

  return (
    <div className="max-w-7xl">
      <div className="mb-3">
        <p className="text-[11px] font-semibold uppercase tracking-wide mb-1" style={{ color: 'var(--qms-text-muted)' }}>Operations · Diet Camp Coordination</p>
        <h1 className="text-2xl font-bold" style={{ color: 'var(--qms-text)' }}>Diet Coordinator Workspace</h1>
        <p className="text-[13px] mt-1 max-w-3xl" style={{ color: 'var(--qms-text-muted)' }}>
          Assign dietitians to diet camps in your projects · same nearest-city + positive-feedback ranker · plus unlock-request inbox and dietitian bank-details master.
        </p>
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

      {tab !== 'bank' && <ScopeBanner adminLike={adminLike} coordId={coordId} />}

      {tab === 'dashboard' && <DashboardTab camps={scopedCamps} />}
      {tab === 'assign' && <AssignTab camps={scopedCamps} allCamps={camps} userName={name} />}
      {tab === 'projects' && <MyProjectsTab camps={scopedCamps} adminLike={adminLike} coordId={coordId} />}
      {tab === 'reopen' && <ReopenTab camps={scopedCamps} allCamps={camps} adminLike={adminLike} coordId={coordId} userName={name} />}
      {tab === 'bank' && <DietitiansBankTab />}
    </div>
  )
}

export default DietApprovalsPage
