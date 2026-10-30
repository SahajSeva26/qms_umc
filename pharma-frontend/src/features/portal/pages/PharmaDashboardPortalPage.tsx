import { lazy, Suspense, useState } from 'react'
import { FiBarChart2, FiCalendar, FiUserPlus, FiUsers } from 'react-icons/fi'
import { RouteFallback } from '@qms/ui'
import PharmaRoleGate from '@/features/pharma/components/PharmaRoleGate'
import PharmaDashboardTab from '@/features/pharma/components/PharmaDashboardTab'

// Lazy — same convention as MrPortalPage's non-default tabs. Dashboard stays eager (default tab,
// needs fast first paint). Deliberately NOT routed through features/camps's public barrel
// (index.ts) — confirmed via a real Vite build that a lazy component statically re-exported from
// a barrel that's ALSO eagerly reachable (as this barrel is, via its hook exports) loses its own
// chunk isolation entirely, even when consumed via this exact direct path. The barrel intentionally
// only ever exports eager, lightweight hooks for this reason.
const PharmaCampScheduleTab = lazy(() => import('@/features/camps/components/PharmaCampScheduleTab'))
// Same chunk MrPortalPage's own "Book camp" tab already loads (RHF + Zod + the Maps SDK boundary)
// — a user who never books shouldn't download any of it.
const MrBookCampTab = lazy(() => import('@/features/pharma/components/MrBookCampTab'))
const MyTeamTab = lazy(() => import('@/features/team/components/MyTeamTab'))

interface PharmaDashboardPortalPageProps {
  roleTypeCode: string
  /** Shown in the breadcrumb, e.g. "HO" → "Pharma · HO Portal". */
  portalLabel: string
}

type TabId = 'dashboard' | 'schedule' | 'book' | 'team'

const BASE_TABS: { id: TabId; label: string; icon: typeof FiBarChart2 }[] = [
  { id: 'dashboard', label: 'Dashboard', icon: FiBarChart2 },
  { id: 'schedule', label: 'Camp schedule', icon: FiCalendar },
  { id: 'book', label: 'Book on behalf of MR', icon: FiUserPlus },
]

// My Team only for ASM today — GET /roles/mrs gives ASM their real direct reports, but RSM/HO
// need a deeper tree (ASM grouping, or the full RSM→ASM→MR tree) that endpoint can't produce yet.
// See md-files/BACKEND_REQUESTS.md §6/§7 — left absent for RSM/HO rather than shown with a
// flat/misleading substitute.
const MY_TEAM_ROLE_TYPES = new Set(['pharma-asm'])

// Shared, thin portal shell for HO/RSM/ASM — the same tabs for all three roles, since the
// underlying GET /camps the Schedule tab calls is server-scoped per role server-side (see
// usePharmaCamps.ts for the full scoping note) — HO sees their whole division, ASM/RSM see their
// downline (a booking-time snapshot, not a live hierarchy lookup). The "Book on behalf of MR" tab
// reuses MrBookCampTab's own component (needsMrPicker=true) — same booking implementation as the
// MR's own tab, not a separate build; MrPicker's GET /roles/mrs search is itself server-scoped to
// the caller's downline, and POST /camps/book's assertCanBook re-enforces the same hierarchy
// independently, so no extra client-side role filtering is needed here. A fuller multi-tab portal
// (projects, doctors, etc.) is a later, separate step.
const PharmaDashboardPortalPage = ({ roleTypeCode, portalLabel }: PharmaDashboardPortalPageProps) => {
  const [tab, setTab] = useState<TabId>('dashboard')
  const TABS = MY_TEAM_ROLE_TYPES.has(roleTypeCode)
    ? [...BASE_TABS, { id: 'team' as const, label: 'My Team', icon: FiUsers }]
    : BASE_TABS

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
        {tab === 'schedule' && (
          <Suspense fallback={<RouteFallback />}>
            <PharmaCampScheduleTab />
          </Suspense>
        )}
        {tab === 'book' && (
          <Suspense fallback={<RouteFallback />}>
            <MrBookCampTab needsMrPicker />
          </Suspense>
        )}
        {tab === 'team' && (
          <Suspense fallback={<RouteFallback />}>
            <MyTeamTab />
          </Suspense>
        )}
      </div>
    </PharmaRoleGate>
  )
}

export default PharmaDashboardPortalPage
