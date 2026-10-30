import { FiFilter, FiGlobe } from 'react-icons/fi'

interface PaymentScopeBannerProps {
  isCoordOnly: boolean
}

// Markup moved verbatim from DietitianPaymentPage — same classes, colours and
// copy for both branches.
const PaymentScopeBanner = ({ isCoordOnly }: PaymentScopeBannerProps) => {
  if (isCoordOnly) {
    return (
      <div className="rounded-lg px-3.5 py-2.5 mb-3.5 flex items-center gap-2 text-[12.5px]" style={{ background: 'rgba(59,109,255,.06)', border: '1px solid rgba(59,109,255,.2)', color: '#1d4ed8' }}>
        <FiFilter size={13} /> Scoped to dietitians in your assigned projects.
      </div>
    )
  }
  return (
    <div className="rounded-lg px-3.5 py-2.5 mb-3.5 flex items-center gap-2 text-[12.5px]" style={{ background: 'rgba(16,185,129,.06)', border: '1px solid rgba(16,185,129,.2)', color: '#047857' }}>
      <FiGlobe size={13} /> Showing every dietitian in the portal.
    </div>
  )
}

export default PaymentScopeBanner
