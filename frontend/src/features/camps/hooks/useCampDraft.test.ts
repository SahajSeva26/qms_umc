import { describe, it, expect } from 'vitest'
import { renderHook } from '@testing-library/react'
import { useCampDraft } from '@/features/camps/hooks/useCampDraft'
import type { CampEntity } from '@/types/campReal.types'

function campFixture(overrides: Partial<CampEntity> = {}): CampEntity {
  return {
    id: 'camp-1', code: 'cmp-000001', tenant: 't-1', division: 'div-1', project: null,
    doctor: 'doc-1', type: 'screening', billingType: 'billable', patientExpectation: 0,
    fo: null, mr: null, date: '2026-09-15',
    timeSlot: '9am-1pm', city: 'Pune', state: 'Maharashtra',
    coordinates: [73.8567, 18.5204], devices: [], status: 'requested', stageHistory: [],
    createdAt: '', updatedAt: '', ...overrides,
  } as CampEntity
}

describe('useCampDraft — buildInitialDraft', () => {
  it('extracts each populated device sub-document\'s _id into a comma-joined string, not "[object Object]"', () => {
    const camp = campFixture({
      devices: [
        { _id: 'dev-1', name: 'BP Monitor', code: 'BPM-01', type: 'device' },
        { _id: 'dev-2', name: 'Glucometer', code: 'GLU-01', type: 'device' },
      ],
    })

    const { result } = renderHook(() => useCampDraft(camp))

    expect(result.current.draft.devices).toBe('dev-1, dev-2')
    expect(result.current.draft.devices).not.toContain('[object Object]')
  })

  it('produces an empty devices string when the camp has no devices', () => {
    const camp = campFixture({ devices: [] })
    const { result } = renderHook(() => useCampDraft(camp))
    expect(result.current.draft.devices).toBe('')
  })

  it('seeds timeSlot from the camp when it is one of the 4 valid enum values', () => {
    const camp = campFixture({ timeSlot: '10am-2pm' })
    const { result } = renderHook(() => useCampDraft(camp))
    expect(result.current.draft.timeSlot).toBe('10am-2pm')
  })
})
