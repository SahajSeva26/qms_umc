import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { FiGrid, FiBarChart2, FiFolderPlus, FiUserPlus, FiClipboard, FiDollarSign, FiCreditCard, FiRotateCcw, FiUsers, FiCheckSquare, FiExternalLink, FiShield, FiFileText, FiTrendingUp, FiDatabase, FiNavigation } from 'react-icons/fi'
import { useAuth } from '@/hooks/useAuth'
import { useCampsData } from '@/hooks/useCampsData'
import { usePeopleData } from '@/hooks/usePeopleData'
import { useProjectsDataShared } from '@/hooks/useProjectsDataShared'
import { useOm } from '@/features/om/hooks/useOm'
import OmIdBar from '@/features/om/components/OmIdBar'
import OverviewTab from '@/features/om/components/tabs/OverviewTab'
import DashboardTab from '@/features/om/components/tabs/DashboardTab'
import RosterTab from '@/features/om/components/tabs/RosterTab'
import DietitianInterviewsTab from '@/features/om/components/tabs/DietitianInterviewsTab'
import AssignmentsTab from '@/features/om/components/tabs/AssignmentsTab'
import ExpensesTab from '@/features/om/components/tabs/ExpensesTab'
import DietitianPaymentsTab from '@/features/om/components/tabs/DietitianPaymentsTab'
import ReopenRequestsTab from '@/features/om/components/tabs/ReopenRequestsTab'
import AuditTab from '@/features/om/components/tabs/AuditTab'
import VerificationTab from '@/features/om/components/tabs/VerificationTab'
import PoManagementTab from '@/features/om/components/tabs/PoManagementTab'
import InvoicingTab from '@/features/om/components/tabs/InvoicingTab'
import RevenueAssuranceTab from '@/features/om/components/tabs/RevenueAssuranceTab'
import MastersTab from '@/features/om/components/tabs/MastersTab'

type Mode = 'Screening' | 'Diet'
type TabId =
  | 'overview' | 'dashboard' | 'projects' | 'campmgmt' | 'fos' | 'foonb' | 'assign'
  | 'expenses' | 'dietpay' | 'reopen' | 'interviews' | 'verification' | 'po' | 'invoicing' | 'revenue' | 'masters' | 'audit'

const OmPage = () => {
  const { user } = useAuth()
  const navigate = useNavigate()
  const canToggleMode = user?.role === 'admin' || user?.role === 'super_admin'
  const initialMode: Mode = user?.role === 'om_diet' ? 'Diet' : 'Screening'
  const [mode, setMode] = useState<Mode>(initialMode)
  // Mirrors om-portal.js:123: Diet OMs land on Dashboard (its richer default
  // view), Screening OMs land on Command Center.
  const [tab, setTab] = useState<TabId>(initialMode === 'Diet' ? 'dashboard' : 'overview')

  const handleModeChange = (next: Mode) => {
    setMode(next)
    setTab(next === 'Diet' ? 'dashboard' : 'overview')
  }

  const { camps, doctors } = useCampsData()
  const { people: fos, devices } = usePeopleData('Field Officer')
  const { people: dietitians } = usePeopleData('Dietitian')
  const { projects } = useProjectsDataShared()
  const om = useOm()

  const isDiet = mode === 'Diet'

  const tabs = useMemo(() => {
    const base: { id: TabId; label: string; icon: typeof FiGrid; screeningOnly?: boolean; dietOnly?: boolean }[] = [
      { id: 'overview', label: 'Command Center', icon: FiGrid },
      { id: 'dashboard', label: 'Dashboard', icon: FiBarChart2 },
      { id: 'projects', label: 'Project Management', icon: FiFolderPlus },
      { id: 'campmgmt', label: 'Camp Management', icon: FiClipboard, screeningOnly: true },
      { id: 'fos', label: isDiet ? 'Dietitian Management' : 'FO Management', icon: FiUsers },
      { id: 'foonb', label: 'FO Onboarding', icon: FiUserPlus, screeningOnly: true },
      { id: 'assign', label: 'Assignments', icon: FiCheckSquare },
      { id: 'expenses', label: isDiet ? 'Remuneration & Payments' : 'Expenses & Payments', icon: FiDollarSign },
      { id: 'dietpay', label: 'Dietitian Payments', icon: FiCreditCard, dietOnly: true },
      { id: 'reopen', label: 'Reopen Requests', icon: FiRotateCcw, dietOnly: true },
      { id: 'interviews', label: 'Dietitian Interviews', icon: FiUsers, dietOnly: true },
      { id: 'verification', label: 'Verification', icon: FiShield, screeningOnly: true },
      { id: 'po', label: 'PO Management', icon: FiFileText, screeningOnly: true },
      { id: 'invoicing', label: 'Invoicing', icon: FiFileText, screeningOnly: true },
      { id: 'revenue', label: 'Revenue Assurance', icon: FiTrendingUp, screeningOnly: true },
      { id: 'masters', label: 'Masters', icon: FiDatabase, screeningOnly: true },
      { id: 'audit', label: 'Audit', icon: FiClipboard },
    ]
    return base.filter((t) => (isDiet ? !t.screeningOnly : !t.dietOnly))
  }, [isDiet])

  const activeTab = tabs.find((t) => t.id === tab) ?? tabs[0]

  return (
    <div className="max-w-7xl">
      <OmIdBar mode={mode} onModeChange={handleModeChange} canToggle={canToggleMode} userName={user ? `${user.firstName} ${user.lastName}` : 'Ops Manager'} />

      <div className="flex items-start justify-between gap-3 mb-3">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-wide mb-1" style={{ color: 'var(--qms-text-muted)' }}>Operations · {mode} Camps</p>
          <h1 className="text-2xl font-bold" style={{ color: 'var(--qms-text)' }}>Operations Manager — {mode}</h1>
          <p className="text-[12px] mt-1" style={{ color: 'var(--qms-text-muted)' }}>
            {isDiet
              ? 'Diet camps · dietitian remuneration · dietitian enrollment & approvals · dietitian + device assignment · audit'
              : 'Screening camps · FO TA/DA · FO enrollment & approvals · device + camp assignment · audit'}
          </p>
        </div>
        <button
          onClick={() => setTab('assign')}
          className="flex items-center gap-1.5 text-[13px] font-bold px-3.5 py-2 rounded-xl text-white shrink-0"
          style={{ background: 'var(--qms-brand)' }}
        >
          <FiNavigation size={13} /> Assign camps
        </button>
      </div>

      <div className="flex flex-wrap gap-1 mb-4 border-b overflow-x-auto" style={{ borderColor: 'var(--qms-border)' }}>
        {tabs.map((t) => {
          const Icon = t.icon
          return (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className="flex items-center gap-1.5 px-3 py-2.5 text-[12.5px] font-semibold border-b-2 transition-colors shrink-0"
              style={{
                color: activeTab.id === t.id ? 'var(--qms-text)' : 'var(--qms-text-muted)',
                borderBottomColor: activeTab.id === t.id ? 'var(--qms-brand)' : 'transparent',
              }}
            >
              <Icon size={12} /> {t.label}
            </button>
          )
        })}
      </div>

      {tab === 'overview' && (
        <OverviewTab
          camps={camps}
          mode={mode}
          fos={fos}
          dietitians={dietitians}
          projects={projects}
          expenseOverlay={om.expenseOverlay}
          onGoTab={(t) => setTab(t as TabId)}
        />
      )}

      {tab === 'dashboard' && (
        <DashboardTab
          camps={camps}
          mode={mode}
          fos={fos}
          dietitians={dietitians}
          devices={devices}
          expenseOverlay={om.expenseOverlay}
          rateHistory={om.rateHistory}
          foEnrollments={om.foEnrollments}
          dietEnrollments={om.dietEnrollments}
          onGoTab={(t) => setTab(t as TabId)}
        />
      )}

      {tab === 'projects' && (
        <div className="rounded-xl border p-6 text-center" style={{ background: 'var(--qms-surface)', borderColor: 'var(--qms-border)' }}>
          <p className="text-[13px] mb-3" style={{ color: 'var(--qms-text-muted)' }}>Project Management is a full standalone module.</p>
          <button onClick={() => navigate('/projects')} className="text-[13px] font-bold px-4 py-2 rounded-xl text-white inline-flex items-center gap-1.5" style={{ background: 'var(--qms-brand)' }}>
            Open Project Management <FiExternalLink size={12} />
          </button>
        </div>
      )}

      {(tab === 'campmgmt' || tab === 'fos') && tab === 'campmgmt' && (
        <div className="rounded-xl border p-6 text-center" style={{ background: 'var(--qms-surface)', borderColor: 'var(--qms-border)' }}>
          <p className="text-[13px] mb-3" style={{ color: 'var(--qms-text-muted)' }}>
            Camp Management is a full standalone module — opens as a real page, not embedded.
          </p>
          <button onClick={() => navigate('/camps')} className="text-[13px] font-bold px-4 py-2 rounded-xl text-white inline-flex items-center gap-1.5" style={{ background: 'var(--qms-brand)' }}>
            Open Camp Management <FiExternalLink size={12} />
          </button>
        </div>
      )}

      {tab === 'fos' && !isDiet && (
        <div className="rounded-xl border p-6 text-center" style={{ background: 'var(--qms-surface)', borderColor: 'var(--qms-border)' }}>
          <p className="text-[13px] mb-3" style={{ color: 'var(--qms-text-muted)' }}>FO Management is a full standalone module.</p>
          <button onClick={() => navigate('/fo')} className="text-[13px] font-bold px-4 py-2 rounded-xl text-white inline-flex items-center gap-1.5" style={{ background: 'var(--qms-brand)' }}>
            Open FO Management <FiExternalLink size={12} />
          </button>
        </div>
      )}

      {tab === 'fos' && isDiet && <RosterTab mode={mode} fos={fos} dietitians={dietitians} devices={devices} om={om} />}

      {tab === 'foonb' && !isDiet && <RosterTab mode={mode} fos={fos} dietitians={dietitians} devices={devices} om={om} />}

      {tab === 'assign' && (
        <AssignmentsTab
          camps={camps}
          mode={mode}
          fos={fos}
          dietitians={dietitians}
          devices={devices}
          onAssignFo={(campId, foId) => om.assignFo(campId, foId, fos.find((f) => f.id === foId)?.name ?? foId)}
          onAssignDevices={om.assignDevices}
          onProposeDietitian={(campId, dietitianId, reasons, score) => {
            const dietitian = dietitians.find((d) => d.id === dietitianId)
            if (!dietitian) return
            om.proposeDietitian(campId, dietitianId, dietitian.name, reasons, score, user?.firstName ?? 'Ops Manager')
          }}
        />
      )}

      {tab === 'expenses' && <ExpensesTab camps={camps} mode={mode} fos={fos} dietitians={dietitians} om={om} />}

      {tab === 'dietpay' && <DietitianPaymentsTab camps={camps} dietitians={dietitians} om={om} />}

      {tab === 'reopen' && <ReopenRequestsTab camps={camps} om={om} />}

      {tab === 'interviews' && <DietitianInterviewsTab om={om} />}

      {tab === 'verification' && <VerificationTab camps={camps} doctors={doctors} fos={fos} />}

      {tab === 'po' && <PoManagementTab camps={camps} />}

      {tab === 'invoicing' && <InvoicingTab camps={camps} />}

      {tab === 'revenue' && <RevenueAssuranceTab camps={camps} />}

      {tab === 'masters' && <MastersTab />}

      {tab === 'audit' && <AuditTab camps={camps} mode={mode} />}
    </div>
  )
}

export default OmPage
