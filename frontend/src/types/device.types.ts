// Device/equipment catalog master — screening devices (BP monitors, ECG,
// SpO2, spirometers, etc.) allocated to camps and assigned to FOs/dietitians.
// Mirrors the prototype's admin-data.js DEVICE_CATALOG (window.QMS_MASTER.devices).
// TODO: entirely mock/frontend-only — Phase 2 per CLAUDE.md (Inventory & Devices),
// this catalog is only a read-only lookup for Operations screens until then.

export type DeviceStatus = 'ACTIVE' | 'INACTIVE' | 'MAINTENANCE' | 'FAULTY'

export interface DeviceCatalogItem {
  id: string
  name: string
  category: string
  unitsAvailable: number

  /** Device type string matched (substring) against an HQ's requiredDevice
   * and an FO's deviceTypes[] by the HQ Mapping & Serviceability geo engine
   * and the Incidents · SOS machine-replacement suggester. Distinct from
   * `category` — kept as its own field since the two prototype screens that
   * need it (hq-serviceability.js, machine-replacement.js) both call it
   * `type`, not `category`. */
  type?: string
  status?: DeviceStatus
  serviceStatus?: string
  /** Faultiness is intentionally NOT the single source of truth here —
   * incidents-data.js externalizes fault-flagging into a separate
   * qms.incidents.machineFlags map (see features/incidents/incidents.service.ts's
   * isMachineFaulty()); this field is only a display-fallback the prototype's
   * own machine-replacement.js dead-code-references, mirrored for parity. */
  faulty?: boolean
  assignedFoId?: string
  backupDevice?: string
  nextCalibration?: string
  vendorCity?: string
  vendor?: string
}
