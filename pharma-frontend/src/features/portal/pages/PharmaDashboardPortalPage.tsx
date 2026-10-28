import { lazy, Suspense, useState } from 'react'
import { FiBarChart2, FiCalendar } from 'react-icons/fi'
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

interface PharmaDashboardPortalPageProps {
  roleTypeCode: string
  /** Shown in the breadcrumb, e.g. "HO" → "Pharma · HO Portal". */
  portalLabel: string
}

type TabId = 'dashboard' | 'schedule'

const TABS: { id: TabId; label: string; icon: typeof FiBarChart2 }[] = [
  { id: 'dashboard', label: 'Dashboard', icon: FiBarChart2 },
  { id: 'schedule', label: 'Camp schedule', icon: FiCalendar },
]

// Shared, thin portal shell for HO/RSM/ASM — the same two tabs for all three roles, since the
// underlying GET /camps the Schedule tab calls is server-scoped per role server-side (see
// usePharmaCamps.ts) — correctly for HO (division-wide) today, but ASM/RSM scoping is a KNOWN,
// still-pending backend gap (see md-files/BACKEND_REQUEST_camp-asm-rsm-own-scope.md): it currently
// only matches camps where the ASM/RSM's own id happens to be stamped onto them at booking time,
// not their actual downline. A fuller multi-tab portal (projects, doctors, etc.) is a later,
// separate step.
const PharmaDashboardPortalPage = ({ roleTypeCode, portalLabel }: PharmaDashboardPortalPageProps) => {
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
        {tab === 'schedule' && (
          <Suspense fallback={<RouteFallback />}>
            <PharmaCampScheduleTab />
          </Suspense>
        )}
      </div>
    </PharmaRoleGate>
  )
}

export default PharmaDashboardPortalPage
