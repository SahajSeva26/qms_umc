import { z } from 'zod'

const INDIAN_MOBILE_REGEX = /^(?:\+91[\s-]?|91[\s-]?|0)?[6-9]\d{9}$/

export const editProfileSchema = z.object({
  phone: z.string().trim().regex(INDIAN_MOBILE_REGEX, 'Enter a valid 10-digit mobile number').optional().or(z.literal('')),
  altPhone: z.string().trim().regex(INDIAN_MOBILE_REGEX, 'Enter a valid alternate mobile number').optional().or(z.literal('')),
  email: z.string().trim().email('Enter a valid email').optional().or(z.literal('')),
  temporaryAddress: z.string().trim().max(250, 'Temporary address is too long (max 250 characters)'),
})

export type EditProfileFormValues = z.infer<typeof editProfileSchema>
