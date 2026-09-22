import { describe, it, expect } from 'vitest'
import { toEmployeeFieldsPayload, dropBlankStrings, EMPTY_EMPLOYEE_FIELDS_VALUES } from './employeeForm'

describe('dropBlankStrings', () => {
  it('converts blank string values back to undefined, leaving other values untouched', () => {
    expect(dropBlankStrings({ a: '', b: 'kept', c: 0, d: false })).toEqual({ a: undefined, b: 'kept', c: 0, d: false })
  })

  it('passes through undefined unchanged', () => {
    expect(dropBlankStrings(undefined)).toBeUndefined()
  })
})

describe('toEmployeeFieldsPayload — blank optional sub-fields must become undefined, not \'\'', () => {
  // The backend's optional string fields (BankDetailsSchema/EmployeeProfileSchema in
  // employee.validators.ts) are `.min(1).optional()` — undefined is fine, '' 400s.
  it('strips a blank bankDetails.branch left over from an untouched <Input> to undefined', () => {
    const payload = toEmployeeFieldsPayload({
      ...EMPTY_EMPLOYEE_FIELDS_VALUES,
      doj: '2026-01-01',
      bankDetails: { accountHolderName: 'Ravi Kumar', accountNumber: '', ifscCode: '', bankName: 'HDFC', branch: '' },
    })

    expect(payload.bankDetails).toEqual({ accountHolderName: 'Ravi Kumar', accountNumber: undefined, ifscCode: undefined, bankName: 'HDFC', branch: undefined })
  })

  it('strips blank optional profile string fields (fatherName/bloodGroup) to undefined', () => {
    const payload = toEmployeeFieldsPayload({
      ...EMPTY_EMPLOYEE_FIELDS_VALUES,
      doj: '2026-01-01',
      profile: { firstName: 'Ravi', lastName: '', fatherName: '', bloodGroup: 'O+' },
    })

    expect(payload.profile).toEqual({ firstName: 'Ravi', lastName: undefined, fatherName: undefined, bloodGroup: 'O+' })
  })

  it('strips blank optional location string fields (addressLine2/locality/country/googlePlaceId) to undefined', () => {
    const payload = toEmployeeFieldsPayload({
      ...EMPTY_EMPLOYEE_FIELDS_VALUES,
      doj: '2026-01-01',
      location: {
        addressLine1: '12 MG Road', addressLine2: '', locality: '', city: 'Mumbai', state: 'Maharashtra',
        country: '', pincode: '400058', googlePlaceId: '', coordinates: [72.8777, 19.076],
      },
    })

    expect(payload.location).toEqual({
      addressLine1: '12 MG Road', addressLine2: undefined, locality: undefined, city: 'Mumbai', state: 'Maharashtra',
      country: undefined, pincode: '400058', googlePlaceId: undefined, coordinates: [72.8777, 19.076],
    })
  })

  it('an untouched bankDetails/location/profile section stays undefined, not an object of blank strings', () => {
    const payload = toEmployeeFieldsPayload({ ...EMPTY_EMPLOYEE_FIELDS_VALUES, doj: '2026-01-01' })

    expect(payload.bankDetails).toBeUndefined()
    expect(payload.location).toBeUndefined()
    expect(payload.profile).toBeUndefined()
  })
})
