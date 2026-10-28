import SideDrawer from '@/components/ui/SideDrawer'
import FoInventoryContent from '@/features/inventory/real/components/FoInventoryContent'

interface FoInventoryDrawerProps {
  open: boolean
  onClose: () => void
  foRoleId: string
  foName: string
  foCode: string
}

// Header chrome only — KPI-tile strip + devices/consumables tables live in the shared
// FoInventoryContent, also used by MyInventoryPanel. ₹ valuation columns dropped — no price
// field on our real models.
const FoInventoryDrawer = ({ open, onClose, foRoleId, foName, foCode }: FoInventoryDrawerProps) => {
  const initials = foName.split(' ').map((s) => s[0]).filter(Boolean).slice(0, 2).join('').toUpperCase()

  return (
    <SideDrawer open={open} title="FO inventory" onClose={onClose} widthClassName="max-w-2xl">
      <div className="flex items-center gap-3.5 mb-5">
        <div
          className="w-13 h-13 rounded-2xl flex items-center justify-center text-white font-extrabold shrink-0"
          style={{ background: 'linear-gradient(135deg, var(--qms-brand), var(--qms-teal))' }}
        >
          {initials}
        </div>
        <div className="min-w-0">
          <div className="text-[15px] font-bold truncate" style={{ color: 'var(--qms-text)' }}>{foName}</div>
          <div className="text-[12px]" style={{ color: 'var(--qms-text-muted)' }}>Field Officer · {foCode}</div>
        </div>
      </div>

      <FoInventoryContent active={open} foRoleId={foRoleId} />
    </SideDrawer>
  )
}

export default FoInventoryDrawer
