import { z } from 'zod'

const INVENTORY_DEVICE_STATUS_VALUES = ['available', 'in-transit', 'assigned', 'maintainance', 'lost', 'damaged'] as const

const optionalDateInput = z.string().trim().optional()

// Create-only fields (item/vendor/serialNumber) — immutable post-create, so
// this resolver is only ever used for the create-mode form.
export const createInventoryDeviceSchema = z.object({
  item: z.string().trim().min(1, 'Item is required.'),
  vendor: z.string().trim().min(1, 'Vendor is required.'),
  // No upper bound existed before — matches the same cap applied to Item
  // Master's identifier fields (name/code/sku/unit).
  serialNumber: z.string().trim().min(1, 'Serial number is required.').max(200, 'Serial number must be 200 characters or fewer.'),
  manufacturingDate: optionalDateInput,
  warrantyExpiryDate: optionalDateInput,
  lastCalibrationDate: optionalDateInput,
  nextCalibrationDate: optionalDateInput,
})
export type InventoryDeviceCreateFormValues = z.infer<typeof createInventoryDeviceSchema>

// Edit-mode fields only — item/serialNumber are shown as read-only text in
// the UI and never part of this form's fields at all.
export const updateInventoryDeviceSchema = z.object({
  manufacturingDate: optionalDateInput,
  warrantyExpiryDate: optionalDateInput,
  lastCalibrationDate: optionalDateInput,
  nextCalibrationDate: optionalDateInput,
  status: z.enum(INVENTORY_DEVICE_STATUS_VALUES),
})
export type InventoryDeviceUpdateFormValues = z.infer<typeof updateInventoryDeviceSchema>

// The backend stores calibration as two dates rather than a separate status.
// Requiring both here prevents "Mark done" from creating an unscheduled device,
// while the ordering refinement keeps the derived calibration status truthful.
export const completeDeviceCalibrationSchema = z.object({
  lastCalibrationDate: z.string().trim().min(1, 'Calibration date is required.'),
  nextCalibrationDate: z.string().trim().min(1, 'Next calibration date is required.'),
}).refine(
  (values) => values.nextCalibrationDate > values.lastCalibrationDate,
  { path: ['nextCalibrationDate'], message: 'Next calibration must be after the completion date.' },
)
export type CompleteDeviceCalibrationFormValues = z.infer<typeof completeDeviceCalibrationSchema>
