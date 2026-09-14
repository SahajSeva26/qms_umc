import InventoryVendorsPanel from '@/features/inventory/real/components/InventoryVendorsPanel'

const VendorMastersPage = () => {
  return (
    <div className="w-full">
      <div className="mb-3.5">
        <p className="text-[11px] font-semibold uppercase tracking-wide mb-1" style={{ color: 'var(--qms-text-muted)' }}>
          Operations · Vendor Master
        </p>
        <h1 className="text-2xl font-bold" style={{ color: 'var(--qms-text)' }}>Vendor Master</h1>
      </div>

      <InventoryVendorsPanel />
    </div>
  )
}

export default VendorMastersPage
