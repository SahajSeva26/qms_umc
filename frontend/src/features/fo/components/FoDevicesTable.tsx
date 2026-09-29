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

// Matches the prototype's Devices tab (fo-manager.js:722-749), backed by the
// real inventory-assignment module (also covers consumables, not just devices).
const FoDevicesTable = ({ roles, geoByRole, devicesByRole, onOpen }: FoDevicesTableProps) => (
  <div className="rounded-xl border overflow-hidden" style={{ borderColor: 'var(--qms-border)', background: 'var(--qms-surface-card)' }}>
    <div className="overflow-x-auto">
      <table className="w-full text-[13px]">
        <thead>
          <tr style={{ borderBottom: '1px solid var(--qms-border)' }}>
            <th className="text-left font-bold text-[11px] uppercase tracking-wider px-4 py-2.5" style={{ color: 'var(--qms-text-muted)', width: 220 }}>Field Officer</th>
            <th className="text-left font-bold text-[11px] uppercase tracking-wider px-4 py-2.5" style={{ color: 'var(--qms-text-muted)' }}>Devices handed over</th>
          </tr>
        </thead>
        <tbody>
          {roles.map((role) => {
            const entry = devicesByRole[role.id]
            const assignments = entry?.assignments ?? []
            const geo = geoByRole.get(role.id)
            return (
              <tr key={role.id} style={{ borderBottom: '1px solid var(--qms-border)' }}>
                <td className="px-4 py-2.5">
                  <button onClick={() => onOpen(role.id)} className="text-left">
                    <div className="font-semibold truncate" style={{ color: 'var(--qms-text)' }}>{displayName(role)}</div>
                    <div className="text-[11px] truncate" style={{ color: 'var(--qms-text-muted)' }}>{geo?.city ?? '—'}</div>
                  </button>
                </td>
                <td className="px-4 py-2.5">
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
                </td>
              </tr>
            )
          })}
          {roles.length === 0 && (
            <tr><td colSpan={2} className="text-center py-8 text-[13px]" style={{ color: 'var(--qms-text-muted)' }}>No FOs match these filters.</td></tr>
          )}
        </tbody>
      </table>
    </div>
  </div>
)

export default FoDevicesTable
