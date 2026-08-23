import PharmaRoleGate from '@/features/pharma/components/PharmaRoleGate'
import BookCampForm from '@/features/pharma/components/BookCampForm'

const HoPortalPage = () => (
  <PharmaRoleGate roleTypeCode="pharma-division-head">
    <div className="w-full max-w-xl">
      <div className="mb-4">
        <div className="text-[12px] mb-1" style={{ color: 'var(--qms-text-muted)' }}>Pharma · HO Portal</div>
        <h1 className="text-2xl font-bold" style={{ color: 'var(--qms-text)' }}>Book a camp</h1>
      </div>
      <div className="rounded-lg border p-5" style={{ borderColor: 'var(--qms-border)' }}>
        <BookCampForm needsMrPicker />
      </div>
    </div>
  </PharmaRoleGate>
)

export default HoPortalPage
