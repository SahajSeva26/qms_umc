import { describe, it, expect } from 'vitest'
import { renderHook } from '@testing-library/react'
import { z } from 'zod'
import { useReshapingResolver } from '@/hooks/useReshapingResolver'

// Mirrors createDivisionSchema's shape (trim/lowercase, nested object, optional number),
// plus a nested tuple field (mirrors bookCampPayloadSchema's location.coordinates) to
// exercise the resolver's recursive nested-error flattening at more than one level deep.
const testSchema = z.object({
  code: z.string().trim().min(3).regex(/^\S+$/, 'Code cannot contain spaces.').toLowerCase(),
  name: z.string().trim().min(1),
  mrCount: z.number().int().nonnegative().optional(),
  head: z.object({
    firstName: z.string().trim().min(1, "Head's first name is required"),
    email: z.string().trim().min(1, "Head's email is required").email(),
    coordinates: z.tuple([
      z.number('Longitude is required.').min(-180).max(180),
      z.number('Latitude is required.').min(-90).max(90),
    ]).optional(),
  }),
})

interface TestFormValues {
  code: string
  name: string
  mrCount: number
  headFirstName: string
  headEmail: string
  headLng?: number
  headLat?: number
}

const HEAD_FIELD_TO_FORM_FIELD: Record<string, keyof TestFormValues> = {
  firstName: 'headFirstName',
  email: 'headEmail',
  coordinates: 'headLng',
}

// z.infer, not ReturnType<typeof toTestPayload> — they disagree on whether
// mrCount is an optional key vs. a required key with optional value.
type TestPayload = z.infer<typeof testSchema>

const toTestPayload = (values: TestFormValues): TestPayload => ({
  code: values.code,
  name: values.name,
  mrCount: Number.isNaN(values.mrCount) ? undefined : values.mrCount,
  head: {
    firstName: values.headFirstName,
    email: values.headEmail,
    coordinates: values.headLng !== undefined && values.headLat !== undefined ? [values.headLng, values.headLat] : undefined,
  },
})

function setupResolver() {
  return renderHook(() =>
    useReshapingResolver<TestFormValues, TestPayload>({
      schema: testSchema,
      toPayload: toTestPayload,
      nestedFieldMaps: { head: HEAD_FIELD_TO_FORM_FIELD },
    }),
  ).result.current
}

describe('useReshapingResolver', () => {
  it('parsePayload returns the schema-TRANSFORMED payload, not the raw form values', async () => {
    const { parsePayload } = setupResolver()

    const payload = await parsePayload({
      code: 'CARDIO',
      name: '  Cardiology Division  ',
      mrCount: 5,
      headFirstName: 'Jane',
      headEmail: 'jane@example.com',
    })

    expect(payload.code).toBe('cardio')
    expect(payload.name).toBe('Cardiology Division')
  })

  it('resolver maps nested head.* schema errors back onto the form\'s flat headX fields', async () => {
    const { resolver } = setupResolver()

    const values: TestFormValues = {
      code: 'cardio1',
      name: 'Cardiology',
      mrCount: 0,
      headFirstName: '',
      headEmail: 'not-an-email',
    }

    const result = await resolver(values, undefined, { shouldUseNativeValidation: false, fields: {} })

    expect(result.errors).toHaveProperty('headFirstName')
    expect(result.errors).toHaveProperty('headEmail')
    expect(result.errors).not.toHaveProperty('head')
  })

  it('preserves mrCount: 0 (a valid, meaningful value) rather than treating it as blank', async () => {
    const { parsePayload } = setupResolver()

    const payload = await parsePayload({
      code: 'cardio1',
      name: 'Cardiology',
      mrCount: 0,
      headFirstName: 'Jane',
      headEmail: 'jane@example.com',
    })

    expect(payload.mrCount).toBe(0)
  })

  it('treats a cleared/blank number input (NaN, from RHF\'s valueAsNumber) as omitted, not a validation error', async () => {
    const { parsePayload } = setupResolver()

    // NaN: what valueAsNumber produces for a cleared field.
    const payload = await parsePayload({
      code: 'cardio1',
      name: 'Cardiology',
      mrCount: NaN,
      headFirstName: 'Jane',
      headEmail: 'jane@example.com',
    })

    expect(payload.mrCount).toBeUndefined()
  })

  it('a single-level nested error (head.firstName) still flattens to a clean {message} leaf — regression guard for the recursive-flattening change', async () => {
    const { resolver } = setupResolver()

    const values: TestFormValues = {
      code: 'cardio1',
      name: 'Cardiology',
      mrCount: 0,
      headFirstName: '',
      headEmail: 'jane@example.com',
    }
    const result = await resolver(values, undefined, { shouldUseNativeValidation: false, fields: {} })

    expect(result.errors).toHaveProperty('headFirstName')
    expect((result.errors as Record<string, { message?: string }>).headFirstName?.message).toBeTruthy()
  })

  it('an out-of-range nested tuple element flattens to a displayable {message}, not a stranded {0: {message}} object', async () => {
    const { resolver } = setupResolver()

    const values: TestFormValues = {
      code: 'cardio1',
      name: 'Cardiology',
      mrCount: 0,
      headFirstName: 'Jane',
      headEmail: 'jane@example.com',
      headLng: 200, // out of range (-180..180) -> Zod issue at head.coordinates.0
      headLat: 10,
    }

    const result = await resolver(values, undefined, { shouldUseNativeValidation: false, fields: {} })
    const mapped = result.errors as Record<string, { message?: string } | undefined>

    expect(mapped).toHaveProperty('headLng')
    expect(mapped.headLng?.message).toBeTruthy()
  })
})

// Mirrors BookCampForm.tsx's real nestedFieldMaps.location shape: EVERY
// nested key maps to the SAME single target form field, because one widget
// (LocationPicker + LocationAddressFields) represents the whole nested
// object rather than one input per nested field. THREE fields (not two) so
// the accumulation test can distinguish correct ordered chaining from a
// scrambled-order or dropped-message regression — a 2-field .toContain()
// check can't tell those apart.
const manyToOneSchema = z.object({
  location: z.object({
    city: z.string().trim().min(1, 'City is required.'),
    state: z.string().trim().min(1, 'State is required.'),
    pincode: z.string().trim().min(1, 'Pincode is required.'),
  }),
})
type ManyToOnePayload = z.infer<typeof manyToOneSchema>
interface ManyToOneFormValues {
  location: { city: string; state: string; pincode: string }
}
const toManyToOnePayload = (values: ManyToOneFormValues): ManyToOnePayload => ({ location: values.location })

function setupManyToOneResolver() {
  return renderHook(() =>
    useReshapingResolver<ManyToOneFormValues, ManyToOnePayload>({
      schema: manyToOneSchema,
      toPayload: toManyToOnePayload,
      nestedFieldMaps: { location: { city: 'location', state: 'location', pincode: 'location' } },
    }),
  ).result.current
}

describe('useReshapingResolver — many nested keys mapped to one target field', () => {
  it('accumulates exactly TWO sibling error messages, in schema-declaration order — not just "both present" but "both present in the right order"', async () => {
    const { resolver } = setupManyToOneResolver()

    const result = await resolver(
      { location: { city: '', state: '', pincode: '411001' } },
      undefined,
      { shouldUseNativeValidation: false, fields: {} },
    )

    const message = (result.errors as Record<string, { message?: string }>).location?.message
    // Exact equality, not .toContain() twice — a swapped order or an extra
    // inserted junk string would fail this but could slip past two separate
    // .toContain() checks.
    expect(message).toBe('City is required. State is required.')
  })

  it('accumulates all THREE sibling error messages when all three are simultaneously invalid — the case a 2-field test can\'t exercise', async () => {
    const { resolver } = setupManyToOneResolver()

    const result = await resolver(
      { location: { city: '', state: '', pincode: '' } },
      undefined,
      { shouldUseNativeValidation: false, fields: {} },
    )

    const message = (result.errors as Record<string, { message?: string }>).location?.message
    expect(message).toBe('City is required. State is required. Pincode is required.')
  })

  it('still works normally when only ONE sibling is invalid', async () => {
    const { resolver } = setupManyToOneResolver()

    const result = await resolver(
      { location: { city: '', state: 'Maharashtra', pincode: '411001' } },
      undefined,
      { shouldUseNativeValidation: false, fields: {} },
    )

    const message = (result.errors as Record<string, { message?: string }>).location?.message
    expect(message).toBe('City is required.')
  })
})
