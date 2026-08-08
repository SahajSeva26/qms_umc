import { z } from 'zod'

// Validates VendorsTab.tsx's create/edit form (VendorFormValues). Only `name`
// is currently enforced by saveVendor() ('Vendor name required') — every
// other field is genuinely optional there (defaults silently to '' / 0), so
// only `name` is required here too. Scores/complaint rate are numeric-rate
// fields with no current upper bound anywhere in the code — only a
// non-negative floor is added, matching what a rate/score already implies.
export const vendorSchema = z.object({
  name: z.string().trim().min(1, 'Vendor name required'),
  category: z.string().optional(),
  gst: z.string().optional(),
  pan: z.string().optional(),
  contact: z.string().optional(),
  phone: z.string().optional(),
  email: z.string().optional(),
  city: z.string().optional(),
  deliveryScore: z.number().min(0, 'Delivery score cannot be negative').optional(),
  qualityScore: z.number().min(0, 'Quality score cannot be negative').optional(),
  costScore: z.number().min(0, 'Cost score cannot be negative').optional(),
  complaintRate: z.string().optional().refine(
    (v) => v === undefined || v.trim() === '' || Number(v) >= 0,
    'Complaint rate cannot be negative',
  ),
})

export type VendorForm = z.infer<typeof vendorSchema>
