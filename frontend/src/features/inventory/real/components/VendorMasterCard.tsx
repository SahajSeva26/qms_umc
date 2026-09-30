import type { VendorMasterEntity, VendorStatus } from '@/types/vendorMaster.types'

const STATUS_STYLE: Record<VendorStatus, { bg: string; fg: string }> = {
  active: { bg: 'var(--qms-surface-strong)', fg: 'var(--qms-text-soft)' },
  inactive: { bg: 'rgba(244,63,94,.15)', fg: '#e11d48' },
}

interface VendorMasterCardProps {
  vendor: VendorMasterEntity
  canManage: boolean
  onOpen: (vendor: VendorMasterEntity) => void
}

// Matches the prototype's card layout (inventory-procurement.js:235-247) but only real fields — the
// score bars/price-history have no backing data in our model (see ui-revisions.md).
const VendorMasterCard = ({ vendor, canManage, onOpen }: VendorMasterCardProps) => {
  const primaryContact = vendor.contacts[0]
  const statusStyle = vendor.status ? STATUS_STYLE[vendor.status] : undefined

  return (
    <button
      onClick={() => onOpen(vendor)}
      className="text-left rounded-xl border p-3.5 transition-transform hover:-translate-y-0.5"
      style={{ borderColor: 'var(--qms-border)', background: 'var(--qms-surface-card)' }}
    >
      <div className="flex items-center gap-2.5 mb-2.5">
        <div
          className="w-9.5 h-9.5 rounded-[10px] flex items-center justify-center text-white font-extrabold text-[14px] shrink-0"
          style={{ background: 'linear-gradient(135deg, var(--qms-brand), var(--qms-teal))' }}
        >
          {vendor.name[0]?.toUpperCase()}
        </div>
        <div className="min-w-0 flex-1">
          <div className="font-bold text-[13px] leading-tight truncate" style={{ color: 'var(--qms-text)' }}>{vendor.name}</div>
          <div className="text-[11px] truncate" style={{ color: 'var(--qms-text-muted)' }}>
            {vendor.code}{vendor.address?.city ? ` · ${vendor.address.city}` : ''}
          </div>
        </div>
        {canManage && statusStyle && (
          <span
            className="text-[10px] font-bold px-2 py-0.5 rounded-full shrink-0"
            style={{ background: statusStyle.bg, color: statusStyle.fg }}
          >
            {vendor.status?.toUpperCase()}
          </span>
        )}
      </div>
      <div className="text-[12px]" style={{ color: 'var(--qms-text-muted)' }}>
        {primaryContact ? (
          <>
            {primaryContact.name}
            {primaryContact.number ? ` · ${primaryContact.number}` : ''}
          </>
        ) : (
          'No contact on file'
        )}
      </div>
    </button>
  )
}

export default VendorMasterCard
