import PharmaRoleGate from '@/features/pharma/components/PharmaRoleGate'
import BookCampForm from '@/features/pharma/components/BookCampForm'

const MrPortalPage = () => (
  <PharmaRoleGate roleTypeCode="pharma-mr">
    <div className="w-full max-w-xl">
      <div className="mb-4">
        <div className="text-[12px] mb-1" style={{ color: 'var(--qms-text-muted)' }}>Pharma · MR Portal</div>
        <h1 className="text-2xl font-bold" style={{ color: 'var(--qms-text)' }}>Book a camp</h1>
      </div>
      <div className="rounded-lg border p-5" style={{ borderColor: 'var(--qms-border)' }}>
        <BookCampForm needsMrPicker={false} />
      </div>
    </div>
  </PharmaRoleGate>
)

export default MrPortalPage
