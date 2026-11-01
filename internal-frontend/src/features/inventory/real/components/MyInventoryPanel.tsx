import { usePermission } from '@/hooks/usePermission'
import FoInventoryContent from '@/features/inventory/real/components/FoInventoryContent'

// A field worker's own devices/consumables — distinct from InventoryFoInventoryPanel, which is the
// org-wide roster (every FO's holdings, manager-only via inventory-assignment:manage). The read
// endpoint (GET /inventory-assignments) has no permission gate AND no own-scope enforcement at all
// server-side — it accepts any `assignee` filter from any authenticated caller, not just their own
// id (backend gap, not enforced here or anywhere). This tab passes the viewer's own role id by
// convention, but that is a UI choice, not a privacy boundary — a caller who knows another role's
// id can already fetch that person's holdings directly against the API today, before or without
// this tab. Flagged for the backend to add real own-scoping or a dedicated /me-style endpoint.
const MyInventoryPanel = () => {
  const { session } = usePermission()
  const roleId = session?.role.id

  if (!roleId) {
    return (
      <div className="text-[13px] py-10 text-center" style={{ color: 'var(--qms-text-muted)' }}>
        Could not resolve your account — try reloading the page.
      </div>
    )
  }

  return (
    <div>
      <p className="text-[12px] mb-3" style={{ color: 'var(--qms-text-muted)' }}>
        Devices and consumables currently assigned to you.
      </p>
      <FoInventoryContent active foRoleId={roleId} />
    </div>
  )
}

export default MyInventoryPanel
