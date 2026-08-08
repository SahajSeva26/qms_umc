import { z } from 'zod'
import { ITEM_TYPES } from '@/features/inventory/inventory.types'

// Validates ItemMasterTab.tsx's create/edit form (ItemFormValues) — the one
// form covering all 6 item types (the 3 "asset" types — Device/IT Asset/
// Office Asset — and the 3 "consumable" types share this same form/schema,
// per the unified item-master record documented in inventory.types.ts).
// saveItem() currently only enforces "Name is required" — every other field
// is genuinely optional there, so only `name` stays required. Numeric fields
// below (cost/quantity/percentage/year counts) get a non-negative floor,
// matching what each already implies; assetStatus/deprMethod stay optional
// but are constrained to the same fixed option sets their <select> already
// offers, so this never rejects real UI-driven state.
const ASSET_STATUSES = ['Available', 'Allocated', 'Under Repair', 'Lost', 'Damaged', 'Scrapped'] as const
const DEPRECIATION_METHODS = ['Straight Line', 'Written Down Value', 'None'] as const

function isNotFutureDate(v: string | undefined): boolean {
  if (!v) return true
  const d = new Date(v)
  if (Number.isNaN(d.getTime())) return true
  return d.getTime() <= Date.now()
}

export const itemSchema = z.object({
  itemType: z.enum(ITEM_TYPES),
  name: z.string().trim().min(1, 'Name is required'),
  code: z.string().optional(),
  category: z.string().optional(),
  vendor: z.string().optional(),
  gst: z.number().min(0, 'GST % cannot be negative').nullish(),
  purchaseCost: z.number().min(0, 'Purchase cost cannot be negative').nullish(),

  // Asset-only
  manufacturer: z.string().optional(),
  model: z.string().optional(),
  serialNo: z.string().optional(),
  qrCode: z.string().optional(),
  barcode: z.string().optional(),
  purchaseDate: z.string().optional(),
  invoiceNo: z.string().optional(),
  warrantyYears: z.number().min(0, 'Warranty years cannot be negative').nullish(),
  warrantyEnd: z.string().optional(),
  amcApplicable: z.boolean().optional(),
  amcCost: z.number().min(0, 'AMC cost cannot be negative').nullish(),
  usefulLifeYears: z.number().min(0, 'Useful life cannot be negative').nullish(),
  deprMethod: z.enum(DEPRECIATION_METHODS).optional(),
  deprPct: z.number().min(0, 'Depreciation % cannot be negative').nullish(),
  currentValue: z.number().min(0, 'Current value cannot be negative').nullish(),
  assetStatus: z.enum(ASSET_STATUSES).optional(),
  calibApplicable: z.boolean().optional(),
  calibFreqDays: z.number().min(0, 'Calibration frequency cannot be negative').nullish(),
  calibDue: z.string().optional(),
  usedForTests: z.array(z.string()).optional(),

  // Consumable-only
  uom: z.string().optional(),
  qtyOnHand: z.number().min(0, 'Quantity cannot be negative').nullish(),
  reorderLevel: z.number().min(0, 'Reorder level cannot be negative').nullish(),
  batchNo: z.string().optional(),
  mfgDate: z.string().optional().refine(isNotFutureDate, 'Manufacturing date cannot be in the future'),
  expiryDate: z.string().optional(),
  storage: z.string().optional(),
  linkedDeviceId: z.string().optional(),
})

export type ItemForm = z.infer<typeof itemSchema>
