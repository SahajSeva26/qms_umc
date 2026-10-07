import { FiCpu, FiAlertTriangle } from 'react-icons/fi'
import type { RoleEntity } from '@/types/accessManagement.types'
import type { GeoProfileEntity } from '@/types/geoProfile.types'
import type { InventoryAssignmentEntity } from '@/types/inventoryAssignment.types'
import type { FoRosterDeviceEntry } from '@/features/fo/hooks/useFoRosterDevices'

function displayName(role: RoleEntity): string {
  if (role.user === null || typeof role.user === 'string') return role.name
  return `${role.user.firstName}${role.user.lastName ? ` ${role.user.lastName}` : ''}`
}

// Real item name (e.g. "Glucometer") isn't in the API response yet
// (see md-files/fo-operations-findings.md) — shows the serial number instead.
function deviceLabel(assignment: InventoryAssignmentEntity): string {
  return assignment.inventory.serialNumber ?? `Consumable × ${assignment.quantity}`
}

interface FoDevicesTableProps {
  roles: RoleEntity[]
  geoByRole: Map<string, GeoProfileEntity>
  devicesByRole: Record<string, FoRosterDeviceEntry>
  onOpen: (roleId: string) => void
}

// Matches the prototype's .fo-dev-matrix exactly (fo-manager.js:128-146, a 200px/1fr CSS grid with
// `display:contents` rows), backed by the real inventory-assignment module (also covers consumables,
// not just devices — the prototype's own matrix is device-only).
const FoDevicesTable = ({ roles, geoByRole, devicesByRole, onOpen }: FoDevicesTableProps) => {
  if (roles.length === 0) {
    return (
      <div className="px-4 py-10 text-center text-[13px] rounded-xl border" style={{ color: 'var(--qms-text-muted)', borderColor: 'var(--qms-border)' }}>
        No FOs match these filters.
      </div>
    )
  }

  return (
    <div
      className="grid rounded-xl border overflow-hidden"
      style={{ gridTemplateColumns: '200px 1fr', background: 'var(--qms-surface-card)', borderColor: 'var(--qms-border)' }}
    >
      {roles.map((role) => {
        const entry = devicesByRole[role.id]
        const assignments = entry?.assignments ?? []
        const geo = geoByRole.get(role.id)
        return (
          <div key={role.id} className="contents">
            <div className="px-2.5 py-2.5" style={{ background: 'rgba(0,0,0,.02)', borderBottom: '1px dashed var(--qms-border)' }}>
              <button onClick={() => onOpen(role.id)} className="text-left">
                <div className="font-bold text-[12px] truncate" style={{ color: 'var(--qms-text)' }}>{displayName(role)}</div>
                <div className="text-[11px] truncate" style={{ color: 'var(--qms-text-muted)' }}>{geo?.city ?? '—'}</div>
              </button>
            </div>
            <div className="px-2.5 py-2.5" style={{ borderBottom: '1px dashed var(--qms-border)' }}>
              {entry?.isLoading ? (
                <span className="text-[12px]" style={{ color: 'var(--qms-text-muted)' }}>Loading…</span>
              ) : entry?.error ? (
                <button
                  onClick={() => entry.refetch()}
                  className="inline-flex items-center gap-1.5 text-[12px] font-semibold"
                  style={{ color: '#b91c1c' }}
                >
                  <FiAlertTriangle size={11} /> Couldn't load devices · Retry
                </button>
              ) : assignments.length > 0 ? (
                <div>
                  <div className="flex flex-wrap gap-1">
                    {assignments.map((a) => (
                      <span
                        key={a.id}
                        className="inline-flex items-center gap-1 text-[11px] font-semibold rounded-full"
                        style={{ padding: '3px 8px', background: 'color-mix(in srgb, var(--qms-brand) 10%, transparent)', color: 'var(--qms-brand)' }}
                      >
                        <FiCpu size={11} /> {deviceLabel(a)}
                      </span>
                    ))}
                  </div>
                  {entry?.truncated && (
                    <div className="text-[10px] mt-1" style={{ color: 'var(--qms-text-muted)' }}>More assigned than shown</div>
                  )}
                </div>
              ) : (
                <span className="text-[12px]" style={{ color: 'var(--qms-text-muted)' }}>No devices handed over.</span>
              )}
            </div>
          </div>
        )
      })}
    </div>
  )
}

export default FoDevicesTable
