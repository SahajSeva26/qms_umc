import { useReshapingResolver } from '@/hooks/useReshapingResolver'
import { createTenantSchema } from '@/features/access-management/tenant/schemas/tenant.schemas'
import type { CreateTenantPayload } from '@/types/accessManagement.types'
import type { LocationValue } from '@/types/location.types'

export interface TenantFormValues {
  code: string
  name: string
  salesPerson: string
  ownerFirstName: string
  ownerLastName: string
  ownerEmail: string
  ownerPassword: string
  ownerPhone: string
  ownerGender: '' | 'male' | 'female' | 'other'
  address: LocationValue | null
  businessLifetime: string
  gst: string
}

export const EMPTY_FORM_VALUES: TenantFormValues = {
  code: '',
  name: '',
  salesPerson: '',
  ownerFirstName: '',
  ownerLastName: '',
  ownerEmail: '',
  ownerPassword: '',
  ownerPhone: '',
  ownerGender: '',
  address: null,
  businessLifetime: '',
  gst: '',
}

const OWNER_FIELD_TO_FORM_FIELD: Record<string, keyof TenantFormValues> = {
  firstName: 'ownerFirstName',
  lastName: 'ownerLastName',
  email: 'ownerEmail',
  password: 'ownerPassword',
  phone: 'ownerPhone',
  gender: 'ownerGender',
}

// Optional end-to-end, unlike Camp where location is required for FO auto-allocation.
const ADDRESS_FIELD_TO_FORM_FIELD: Record<string, keyof TenantFormValues> = {
  addressLine1: 'address', addressLine2: 'address', locality: 'address',
  city: 'address', state: 'address', country: 'address', pincode: 'address',
  googlePlaceId: 'address', coordinates: 'address',
}

export const useTenantFormResolver = () =>
  useReshapingResolver<TenantFormValues, CreateTenantPayload>({
    schema: createTenantSchema,
    toPayload: (values) => ({
      code: values.code,
      name: values.name,
      salesPerson: values.salesPerson,
      owner: {
        firstName: values.ownerFirstName,
        lastName: values.ownerLastName || undefined,
        email: values.ownerEmail,
        password: values.ownerPassword,
        phone: values.ownerPhone || undefined,
        gender: values.ownerGender || undefined,
      },
      address: values.address ?? undefined,
      businessLifetime: values.businessLifetime === '' ? undefined : Number(values.businessLifetime),
      gst: values.gst || undefined,
    }),
    nestedFieldMaps: { owner: OWNER_FIELD_TO_FORM_FIELD, address: ADDRESS_FIELD_TO_FORM_FIELD },
  })

// Drives each step's trigger([...]) call on Next — one array per CreateTenantDialog step.
export const CREATE_TENANT_STEP_FIELD_NAMES: (keyof TenantFormValues)[][] = [
  ['code', 'name', 'salesPerson'],
  ['address'],
  ['ownerFirstName', 'ownerLastName', 'ownerEmail', 'ownerPassword', 'ownerPhone', 'ownerGender'],
]
