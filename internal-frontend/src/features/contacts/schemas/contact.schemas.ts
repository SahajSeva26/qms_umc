import { z } from 'zod'
import { DESIGNATIONS_BY_DEPARTMENT, type ContactDepartment } from '@/features/contacts/contact.constants'

// Mirrors the backend's assertDesignationMatchesDepartment (contact.service.ts): a designation
// is only valid alongside its own department's key list, and a department is required once a
// designation is set.
function designationMatchesDepartment(department: string | undefined, designation: string | undefined): boolean {
  if (!designation) return true
  if (!department) return false
  return DESIGNATIONS_BY_DEPARTMENT[department as ContactDepartment]?.some((d) => d.key === designation) ?? false
}

// tenant is optional client-side — resolved server-side for a customer-tenant
// caller regardless of what's sent, required only for platform staff.
export const createContactSchema = z
  .object({
    tenant: z.string().optional(),
    division: z.string().optional(),
    name: z.string().trim().min(1, 'Name is required'),
    designation: z.string().trim().optional(),
    department: z.string().trim().optional(),
    email: z.string().trim().email('Enter a valid email').optional().or(z.literal('')),
    phone: z.string().trim().optional(),
    location: z.string().trim().optional(),
    type: z.enum(['customer', 'platform']).optional(),
  })
  // division is required for 'customer'-type contacts (the default type).
  .refine((data) => (data.type ?? 'customer') !== 'customer' || !!data.division, {
    message: 'A division is required for customer contacts',
    path: ['division'],
  })
  .refine((data) => designationMatchesDepartment(data.department, data.designation), {
    message: 'Select a department before choosing a designation',
    path: ['designation'],
  })

export const updateContactSchema = z
  .object({
    name: z.string().trim().min(1, 'Name is required'),
    designation: z.string().trim().optional(),
    department: z.string().trim().optional(),
    email: z.string().trim().email('Enter a valid email').optional().or(z.literal('')),
    phone: z.string().trim().optional(),
    location: z.string().trim().optional(),
    type: z.enum(['customer', 'platform']).optional(),
    status: z.enum(['active', 'inactive']).optional(),
  })
  .refine((data) => designationMatchesDepartment(data.department, data.designation), {
    message: 'Select a department before choosing a designation',
    path: ['designation'],
  })
