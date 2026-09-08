import type { InventoryAssignmentEntity } from '@/types/inventoryAssignment.types'
import type { InventoryDeviceEntity } from '@/types/inventoryDevice.types'
import { INVENTORY_DEVICE_STATUS_LABEL } from '@/types/inventoryDevice.types'
import { toCsv, downloadCsv, type CsvColumn } from '@/utils/csvExport'
import { toast } from '@/components/ui/sonner'

// Assignment search only returns a slim device ref (serialNumber/status) —
// calibration dates live on the full InventoryDeviceEntity, joined here by id.
export interface AssignedDeviceRow {
  assignment: InventoryAssignmentEntity
  device: InventoryDeviceEntity | null
}

const COLUMNS: CsvColumn<AssignedDeviceRow>[] = [
  { header: 'FO Name', get: (r) => r.assignment.assignee.name ?? r.assignment.assignee.id },
  { header: 'Status', get: (r) => (r.device ? INVENTORY_DEVICE_STATUS_LABEL[r.device.status] : '—') },
  { header: 'Serial Number', get: (r) => r.assignment.inventory.serialNumber ?? '—' },
  { header: 'Last calibration', get: (r) => r.device?.lastCalibrationDate ?? '—' },
  { header: 'Next calibration', get: (r) => r.device?.nextCalibrationDate ?? '—' },
]

export function assignedDevicesToCsv(rows: AssignedDeviceRow[]): string {
  return toCsv(rows, COLUMNS)
}

export function downloadAssignedDevicesCsv(rows: AssignedDeviceRow[], filename: string): void {
  downloadCsv(assignedDevicesToCsv(rows), filename)
  toast.success(`Exported ${rows.length} device${rows.length === 1 ? '' : 's'}`)
}
