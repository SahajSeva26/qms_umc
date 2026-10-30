import { z } from 'zod'

// Mirrors tenant.schemas.ts's own addressSchema (not exported there, so duplicated locally).
// LocationAddressFields renders the postal inputs but validates nothing itself.
const addressSchema = z.object({
  addressLine1: z.string().trim().min(1, 'Address is required.'),
  addressLine2: z.string().optional(),
  locality: z.string().optional(),
  city: z.string().trim().min(1, 'City is required.'),
  state: z.string().trim().min(1, 'State is required.'),
  country: z.string().trim().min(1).optional(),
  pincode: z.string().trim().min(1, 'Pincode is required.'),
  googlePlaceId: z.string().optional(),
  coordinates: z.tuple([
    z.number().min(-180).max(180),
    z.number().min(-90).max(90),
  ]).optional(),
})

const contactSchema = z.object({
  name: z.string().trim().min(1, 'Contact name is required.'),
  number: z.string().optional(),
  email: z.string().trim().email('Enter a valid email.').optional().or(z.literal('')),
  designation: z.string().optional(),
})

// Nullable (not just optional) to match LocationAddressFields's `value: LocationValue | null` contract.
export const createVendorMasterSchema = z.object({
  code: z.string().trim().min(1, 'Vendor code is required.'),
  name: z.string().trim().min(1, 'Vendor name is required.'),
  contacts: z.array(contactSchema).optional(),
  address: addressSchema.nullable().optional(),
})
export type CreateVendorMasterFormValues = z.infer<typeof createVendorMasterSchema>

export const updateVendorMasterSchema = z.object({
  name: z.string().trim().min(1, 'Vendor name is required.'),
  contacts: z.array(contactSchema).optional(),
  address: addressSchema.nullable().optional(),
  status: z.enum(['active', 'inactive']).optional(),
})
export type UpdateVendorMasterFormValues = z.infer<typeof updateVendorMasterSchema>
