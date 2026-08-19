import InventoryMasterTab from '@/features/inventory/real/components/InventoryMasterTab'

const InventoryMastersPage = () => {
  return (
    <div className="w-full">
      <div className="mb-3.5">
        <p className="text-[11px] font-semibold uppercase tracking-wide mb-1" style={{ color: 'var(--qms-text-muted)' }}>
          Operations · Item Master
        </p>
        <h1 className="text-2xl font-bold" style={{ color: 'var(--qms-text)' }}>Item Master</h1>
      </div>

      <InventoryMasterTab />
    </div>
  )
}

export default InventoryMastersPage
