import { describe, it, expect } from 'vitest'
import {
  createDoctorFormSchema,
  editDoctorFormSchema,
  fromDoctorEntity,
  toCreateDoctorPayload,
  toUpdateDoctorPayload,
  type EditDoctorFormValues,
} from './doctorForm'

const validLocation = {
  addressLine1: '221 Baker Street',
  city: 'Pune',
  state: 'Maharashtra',
  pincode: '411001',
  coordinates: [73.8567, 18.5204] as [number, number],
}

const validCreateValues = {
  pharmaCode: 'DOC-1',
  name: 'Dr. Priya Sharma',
  specialization: 'cp' as const,
  mobile: '9876543210',
  email: 'priya@example.com',
  location: validLocation,
}

describe('createDoctorFormSchema', () => {
  it('accepts a fully valid payload', () => {
    expect(createDoctorFormSchema.safeParse(validCreateValues).success).toBe(true)
  })

  it('rejects a blank pharmaCode', () => {
    const result = createDoctorFormSchema.safeParse({ ...validCreateValues, pharmaCode: '' })
    expect(result.success).toBe(false)
  })

  it('rejects a blank name', () => {
    const result = createDoctorFormSchema.safeParse({ ...validCreateValues, name: '' })
    expect(result.success).toBe(false)
  })

  it('rejects a blank email', () => {
    const result = createDoctorFormSchema.safeParse({ ...validCreateValues, email: '' })
    expect(result.success).toBe(false)
  })

  it('rejects an invalid email format', () => {
    const result = createDoctorFormSchema.safeParse({ ...validCreateValues, email: 'not-an-email' })
    expect(result.success).toBe(false)
  })

  it('rejects mobile under 10 characters', () => {
    const result = createDoctorFormSchema.safeParse({ ...validCreateValues, mobile: '12345' })
    expect(result.success).toBe(false)
  })

  it('rejects an incomplete location (missing coordinates)', () => {
    const { coordinates, ...incomplete } = validLocation
    void coordinates
    const result = createDoctorFormSchema.safeParse({ ...validCreateValues, location: incomplete })
    expect(result.success).toBe(false)
  })
})

describe('editDoctorFormSchema', () => {
  const baseEditValues: EditDoctorFormValues = {
    name: 'Dr. Priya Sharma',
    specialization: 'cp',
    mobile: '9876543210',
    status: 'active',
    email: 'priya@example.com',
    location: validLocation,
  }

  it('accepts a fully valid payload', () => {
    expect(editDoctorFormSchema.safeParse(baseEditValues).success).toBe(true)
  })

  it('a doctor with location: null (legacy, untouched) still passes the resolver when only name changes', () => {
    const values = { ...baseEditValues, location: null, name: 'Dr. New Name' }
    expect(editDoctorFormSchema.safeParse(values).success).toBe(true)
  })

  it('an existing blank email left untouched passes the resolver', () => {
    const values = { ...baseEditValues, email: '' }
    expect(editDoctorFormSchema.safeParse(values).success).toBe(true)
  })

  it('an existing mobile under 10 characters, left untouched, passes the resolver (must NOT be schema-rejected outright)', () => {
    const values = { ...baseEditValues, mobile: '123' }
    expect(editDoctorFormSchema.safeParse(values).success).toBe(true)
  })

  it('a legacy non-blank invalid email passes the resolver too (real validation is dirty-gated, not schema-level)', () => {
    const values = { ...baseEditValues, email: 'not-an-email' }
    expect(editDoctorFormSchema.safeParse(values).success).toBe(true)
  })
})

describe('toCreateDoctorPayload', () => {
  it('maps form values plus scope into the exact create payload shape', () => {
    const payload = toCreateDoctorPayload(validCreateValues, { division: 'div-1', tenant: 't-1' })
    expect(payload).toEqual({ ...validCreateValues, division: 'div-1', tenant: 't-1' })
  })

  it('omits tenant when scope has no tenant (customer-tenant actor)', () => {
    const payload = toCreateDoctorPayload(validCreateValues, { division: 'div-1', tenant: undefined })
    expect(payload.tenant).toBeUndefined()
    expect(payload.division).toBe('div-1')
  })
})

describe('toUpdateDoctorPayload', () => {
  const values: EditDoctorFormValues = {
    name: 'Dr. New Name',
    specialization: 'gp',
    mobile: '9000000000',
    status: 'inactive',
    email: 'new@example.com',
    location: validLocation,
  }

  it('omits every field when nothing is dirty', () => {
    const payload = toUpdateDoctorPayload(values, {})
    expect(payload).toEqual({})
  })

  it('includes only the dirty scalar fields', () => {
    const payload = toUpdateDoctorPayload(values, { name: true, status: true })
    expect(payload).toEqual({ name: 'Dr. New Name', status: 'inactive' })
    expect(payload).not.toHaveProperty('mobile')
    expect(payload).not.toHaveProperty('email')
    expect(payload).not.toHaveProperty('location')
  })

  it('includes the full location object when dirtyFields.location is a truthy nested object (not a plain boolean)', () => {
    // RHF's real dirtyFields shape for an object field is a DeepPartial (e.g. {city: true}),
    // never a plain `true` — the mapper must check truthiness of the whole sub-object.
    const payload = toUpdateDoctorPayload(values, { location: { city: true } as never })
    expect(payload.location).toEqual(validLocation)
  })

  it('includes every dirty field at once', () => {
    const payload = toUpdateDoctorPayload(values, {
      name: true, specialization: true, mobile: true, email: true, status: true, location: { city: true } as never,
    })
    expect(payload).toEqual({
      name: 'Dr. New Name',
      specialization: 'gp',
      mobile: '9000000000',
      email: 'new@example.com',
      status: 'inactive',
      location: validLocation,
    })
  })
})

describe('fromDoctorEntity', () => {
  it('maps a doctor entity into edit-form values, defaulting an absent status to active', () => {
    const values = fromDoctorEntity({
      name: 'Dr. Priya Sharma',
      specialization: 'cp',
      mobile: '9876543210',
      email: 'priya@example.com',
      location: validLocation,
      status: undefined,
    })
    expect(values.status).toBe('active')
  })

  it('preserves a real status when present', () => {
    const values = fromDoctorEntity({
      name: 'Dr. Priya Sharma',
      specialization: 'cp',
      mobile: '9876543210',
      email: 'priya@example.com',
      location: validLocation,
      status: 'inactive',
    })
    expect(values.status).toBe('inactive')
  })

  it('preserves a null location (legacy doctor)', () => {
    const values = fromDoctorEntity({
      name: 'Dr. Priya Sharma',
      specialization: 'cp',
      mobile: '9876543210',
      email: 'priya@example.com',
      location: null,
    })
    expect(values.location).toBeNull()
  })
})
