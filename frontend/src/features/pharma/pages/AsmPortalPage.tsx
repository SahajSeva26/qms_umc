import PharmaRoleGate from '@/features/pharma/components/PharmaRoleGate'
import PharmaProjectsPage from '@/features/pharma/pages/PharmaProjectsPage'

const AsmPortalPage = () => (
  <PharmaRoleGate roleTypeCode="pharma-asm">
    <div className="w-full">
      <div className="mb-4">
        <div className="text-[12px] mb-1" style={{ color: 'var(--qms-text-muted)' }}>Pharma · ASM Portal</div>
        <h1 className="text-2xl font-bold" style={{ color: 'var(--qms-text)' }}>Your projects</h1>
      </div>
      <PharmaProjectsPage />
    </div>
  </PharmaRoleGate>
)

export default AsmPortalPage
