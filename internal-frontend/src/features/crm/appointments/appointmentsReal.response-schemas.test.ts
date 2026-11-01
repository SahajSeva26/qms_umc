import { describe, it, expect } from 'vitest'
import { AppointmentDetailResponseSchema } from '@/features/crm/appointments/appointmentsReal.response-schemas'

const VALID_APPOINTMENT_RESPONSE = {
  success: true,
  message: 'Appointment fetched successfully',
  data: {
    id: '6a82b68f3a74392ec77b5b8e',
    code: 'mtg-000015',
    tenant: { _id: '6a7c8ddba4741b587778a59b', name: 'Torrent Pharma', code: 'torrent' },
    division: { _id: '6a7d091bb5b009519888f592', name: 'Pediatrics Division', code: 'ped' },
    type: 'new',
    salesPerson: '6a7c8363a4741b587778840f',
    contactPerson: { _id: '6a7d09dab5b0095198890e9b', name: 'Sameer Kulkarni' },
    internalMembers: [],
    mode: 'online',
    destinationLink: '',
    duration: { startTime: '2026-08-17T10:00:00.000Z', endTime: '2026-08-17T11:00:00.000Z' },
    agenda: { public: '', private: '' },
    status: 'done',
    mom: { details: 'Adversarial test MOM details' },
    stageHistory: [
      {
        from: 'planned',
        to: 'done',
        reason: 'Test reason for marking done',
        nextSteps: 'Quotation',
        actor: { roleId: '6a7c8363a4741b587778840f', name: 'system user', email: 'system@gmail.com' },
        createdAt: '2026-08-17T12:00:00.000Z',
      },
    ],
    createdAt: '2026-08-17T09:59:00.000Z',
    updatedAt: '2026-08-17T12:00:00.000Z',
  },
}

describe('AppointmentDetailResponseSchema', () => {
  it('accepts a valid real appointment response with stageHistory.nextSteps set', () => {
    const result = AppointmentDetailResponseSchema.safeParse(VALID_APPOINTMENT_RESPONSE)
    expect(result.success).toBe(true)
  })

  it('accepts an appointment with an EMPTY stageHistory — a freshly-created, never-moved appointment', () => {
    const freshAppointment = { ...VALID_APPOINTMENT_RESPONSE, data: { ...VALID_APPOINTMENT_RESPONSE.data, status: 'planned', stageHistory: [] } }
    const result = AppointmentDetailResponseSchema.safeParse(freshAppointment)
    expect(result.success).toBe(true)
  })

  it('accepts a stageHistory entry with no nextSteps — optional per the real backend schema (moveStage without a next step)', () => {
    const withoutNextSteps = {
      ...VALID_APPOINTMENT_RESPONSE,
      data: {
        ...VALID_APPOINTMENT_RESPONSE.data,
        stageHistory: [{ from: 'planned', to: 'cancelled', reason: 'No longer needed', actor: {}, createdAt: '2026-08-17T12:00:00.000Z' }],
      },
    }
    const result = AppointmentDetailResponseSchema.safeParse(withoutNextSteps)
    expect(result.success).toBe(true)
  })

  it('accepts populated ref fields as EITHER a bare id string or an object — refName/refId already handle both, so neither shape is a mismatch', () => {
    const withBareIds = {
      ...VALID_APPOINTMENT_RESPONSE,
      data: { ...VALID_APPOINTMENT_RESPONSE.data, tenant: '6a7c8ddba4741b587778a59b', division: '6a7d091bb5b009519888f592', contactPerson: '6a7d09dab5b0095198890e9b' },
    }
    const result = AppointmentDetailResponseSchema.safeParse(withBareIds)
    expect(result.success).toBe(true)
  })

  it('rejects stageHistory[].nextSteps being a non-string — the exact class of drift the original bug lived on', () => {
    const malformed = {
      ...VALID_APPOINTMENT_RESPONSE,
      data: {
        ...VALID_APPOINTMENT_RESPONSE.data,
        stageHistory: [{ ...VALID_APPOINTMENT_RESPONSE.data.stageHistory[0], nextSteps: 12345 }],
      },
    }
    const result = AppointmentDetailResponseSchema.safeParse(malformed)
    expect(result.success).toBe(false)
  })

  it('rejects an unrecognized status value', () => {
    const malformed = { ...VALID_APPOINTMENT_RESPONSE, data: { ...VALID_APPOINTMENT_RESPONSE.data, status: 'rescheduled' } }
    const result = AppointmentDetailResponseSchema.safeParse(malformed)
    expect(result.success).toBe(false)
  })

  it('rejects success: false even if data happens to be present', () => {
    const malformed = { ...VALID_APPOINTMENT_RESPONSE, success: false }
    const result = AppointmentDetailResponseSchema.safeParse(malformed)
    expect(result.success).toBe(false)
  })

  it('rejects a broken envelope missing the data key entirely', () => {
    const malformed = { success: true, message: 'ok' }
    const result = AppointmentDetailResponseSchema.safeParse(malformed)
    expect(result.success).toBe(false)
  })
})
