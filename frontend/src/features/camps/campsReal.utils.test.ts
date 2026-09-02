import { describe, it, expect } from 'vitest'
import { campRefId, campRefName, canRunScreening, saveErrorMessage } from './campsReal.utils'

describe('campRefId', () => {
  it('returns the id string as-is for a bare string value', () => {
    expect(campRefId('role-1')).toBe('role-1')
  })

  it('resolves a populated object via _id first, falling back to id', () => {
    expect(campRefId({ _id: 'role-1', id: 'role-2' })).toBe('role-1')
    expect(campRefId({ id: 'role-2' })).toBe('role-2')
  })

  it('returns null for an object with neither _id nor id', () => {
    expect(campRefId({})).toBeNull()
  })

  it('returns null for null/undefined', () => {
    expect(campRefId(null)).toBeNull()
    expect(campRefId(undefined)).toBeNull()
  })
})

describe('campRefName', () => {
  it('returns null for a bare string id — no name to resolve without a lookup', () => {
    expect(campRefName('role-1')).toBeNull()
  })

  it('returns the populated object\'s own name', () => {
    expect(campRefName({ name: 'Ramesh' })).toBe('Ramesh')
  })

  it('returns null for an object with no name, and for null/undefined', () => {
    expect(campRefName({})).toBeNull()
    expect(campRefName(null)).toBeNull()
    expect(campRefName(undefined)).toBeNull()
  })
})

describe('canRunScreening', () => {
  const campWithPopulatedFo = { fo: { _id: 'r-fo', id: 'r-fo' } }
  const campWithStringFo = { fo: 'r-fo' }
  const campWithNoFo = { fo: null }

  it('a screening:manage/system:manage holder always qualifies, regardless of camp.fo or their own role', () => {
    expect(canRunScreening(campWithNoFo, undefined, undefined, true)).toBe(true)
    expect(canRunScreening(campWithPopulatedFo, 'someone-else', 'sales-rep', true)).toBe(true)
  })

  it('qualifies a matching role id whose roleType IS field-officer', () => {
    expect(canRunScreening(campWithPopulatedFo, 'r-fo', 'field-officer', false)).toBe(true)
  })

  it('qualifies a matching role id even when camp.fo is a bare string id, not a populated object', () => {
    expect(canRunScreening(campWithStringFo, 'r-fo', 'field-officer', false)).toBe(true)
  })

  it('blocks a matching role id whose roleType is NOT field-officer — id equality alone is never enough', () => {
    expect(canRunScreening(campWithPopulatedFo, 'r-fo', 'sales-rep', false)).toBe(false)
    expect(canRunScreening(campWithStringFo, 'r-fo', 'sales-rep', false)).toBe(false)
  })

  it('blocks a non-matching role id even with the correct roleType', () => {
    expect(canRunScreening(campWithPopulatedFo, 'r-someone-else', 'field-officer', false)).toBe(false)
  })

  it('blocks when the viewer role id is missing entirely', () => {
    expect(canRunScreening(campWithPopulatedFo, undefined, 'field-officer', false)).toBe(false)
  })
})

describe('saveErrorMessage', () => {
  it('joins per-field validation reasons when data.data.fields is present', () => {
    const err = { response: { data: { message: 'Validation failed', data: { fields: { name: 'Name is required', date: 'Date is required' } } } } }
    expect(saveErrorMessage(err)).toBe('name: Name is required; date: Date is required')
  })

  it('falls back to the plain top-level message when no fields object is present', () => {
    const err = { response: { data: { message: 'Camp not found' } } }
    expect(saveErrorMessage(err)).toBe('Camp not found')
  })

  it('falls back to a generic message when neither fields nor message is present', () => {
    expect(saveErrorMessage({})).toBe('Failed to save changes.')
    expect(saveErrorMessage(new Error('network error'))).toBe('Failed to save changes.')
  })

  it('falls back to the plain message when fields is present but empty', () => {
    const err = { response: { data: { message: 'Camp not found', data: { fields: {} } } } }
    expect(saveErrorMessage(err)).toBe('Camp not found')
  })
})
