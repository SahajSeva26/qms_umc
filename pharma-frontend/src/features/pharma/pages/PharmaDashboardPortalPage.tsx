import PharmaRoleGate from '@/features/pharma/components/PharmaRoleGate'
import PharmaDashboardTab from '@/features/pharma/components/PharmaDashboardTab'

interface PharmaDashboardPortalPageProps {
  roleTypeCode: string
  /** Shown in the breadcrumb, e.g. "HO" → "Pharma · HO Portal". */
  portalLabel: string
}

// Dashboard-only landing for HO/RSM/ASM — no tab strip yet (single tab), unlike MR's
// full MrPortalPage. A fuller multi-tab portal is a later, separate step.
const PharmaDashboardPortalPage = ({ roleTypeCode, portalLabel }: PharmaDashboardPortalPageProps) => (
  <PharmaRoleGate roleTypeCode={roleTypeCode}>
    <div className="w-full">
      <div className="mb-4">
        <div className="text-[12px] mb-1" style={{ color: 'var(--qms-text-muted)' }}>Pharma · {portalLabel} Portal</div>
        <h1 className="text-2xl font-bold" style={{ color: 'var(--qms-text)' }}>{portalLabel} Portal</h1>
      </div>
      <PharmaDashboardTab />
    </div>
  </PharmaRoleGate>
)

export default PharmaDashboardPortalPage
