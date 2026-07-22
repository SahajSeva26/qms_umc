// Device/equipment catalog master — screening devices (BP monitors, ECG,
// SpO2, spirometers, etc.) allocated to camps and assigned to FOs/dietitians.
// Mirrors the prototype's admin-data.js DEVICE_CATALOG (window.QMS_MASTER.devices).
// TODO: entirely mock/frontend-only — Phase 2 per CLAUDE.md (Inventory & Devices),
// this catalog is only a read-only lookup for Operations screens until then.

export interface DeviceCatalogItem {
  id: string
  name: string
  category: string
  unitsAvailable: number
}
