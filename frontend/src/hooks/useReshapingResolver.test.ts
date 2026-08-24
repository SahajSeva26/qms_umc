import { describe, it, expect } from 'vitest'
import { renderHook } from '@testing-library/react'
import { z } from 'zod'
import { useReshapingResolver } from '@/hooks/useReshapingResolver'

// Mirrors createDivisionSchema's shape (trim/lowercase, nested object, optional number).
const testSchema = z.object({
  code: z.string().trim().min(3).regex(/^\S+$/, 'Code cannot contain spaces.').toLowerCase(),
  name: z.string().trim().min(1),
  mrCount: z.number().int().nonnegative().optional(),
  head: z.object({
    firstName: z.string().trim().min(1, "Head's first name is required"),
    email: z.string().trim().min(1, "Head's email is required").email(),
  }),
})

interface TestFormValues {
  code: string
  name: string
  mrCount: number
  headFirstName: string
  headEmail: string
}

const HEAD_FIELD_TO_FORM_FIELD: Record<string, keyof TestFormValues> = {
  firstName: 'headFirstName',
  email: 'headEmail',
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
})
