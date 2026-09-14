import { describe, it, expect } from 'vitest'
import { toLatLngLiteral, toCoordinatesTuple, fromPlacesAddressComponents, fromGeocoderAddressComponents } from './location.utils'

describe('coordinate conversion', () => {
  it('toLatLngLiteral converts [lng, lat] to {lat, lng} — order genuinely swapped, not just relabeled', () => {
    // India Gate: stored as [lng, lat] = [77.2295, 28.6129]
    expect(toLatLngLiteral([77.2295, 28.6129])).toEqual({ lat: 28.6129, lng: 77.2295 })
  })

  it('toCoordinatesTuple converts {lat, lng} back to [lng, lat]', () => {
    expect(toCoordinatesTuple({ lat: 28.6129, lng: 77.2295 })).toEqual([77.2295, 28.6129])
  })

  it('round-trips without altering the values', () => {
    const original: [number, number] = [72.8296, 19.1197]
    expect(toCoordinatesTuple(toLatLngLiteral(original))).toEqual(original)
  })
})

describe('fromPlacesAddressComponents', () => {
  const component = (longText: string, types: string[]) => ({ longText, shortText: longText, types })

  it('maps a complete set of Places API address components', () => {
    const result = fromPlacesAddressComponents(
      [
        component('221', ['street_number']),
        component('Baker Street', ['route']),
        component('Marylebone', ['sublocality', 'political']),
        component('Mumbai', ['locality', 'political']),
        component('Maharashtra', ['administrative_area_level_1', 'political']),
        component('400001', ['postal_code']),
        component('India', ['country', 'political']),
      ],
      'place-id-123',
    )

    expect(result).toEqual({
      addressLine1: '221 Baker Street',
      addressLine2: undefined,
      locality: 'Marylebone',
      city: 'Mumbai',
      state: 'Maharashtra',
      country: 'India',
      pincode: '400001',
      googlePlaceId: 'place-id-123',
    })
  })

  it('required fields become "", never undefined, when Google omits them — a locality-level result with no street number/pincode', () => {
    const result = fromPlacesAddressComponents(
      [component('Mumbai', ['locality', 'political']), component('Maharashtra', ['administrative_area_level_1', 'political'])],
      'place-id-456',
    )

    expect(result.addressLine1).toBe('')
    expect(result.pincode).toBe('')
    expect(result.city).toBe('Mumbai')
    expect(result.state).toBe('Maharashtra')
    // Never an omitted key — the properties genuinely exist as ''.
    expect(Object.prototype.hasOwnProperty.call(result, 'addressLine1')).toBe(true)
    expect(Object.prototype.hasOwnProperty.call(result, 'pincode')).toBe(true)
  })

  it('falls back to defaultCountry when Google supplies no country component', () => {
    const result = fromPlacesAddressComponents([component('Mumbai', ['locality'])], null, 'India')
    expect(result.country).toBe('India')
  })

  it('country is undefined when neither Google nor a defaultCountry supplies one', () => {
    const result = fromPlacesAddressComponents([component('Mumbai', ['locality'])], null)
    expect(result.country).toBeUndefined()
  })

  it('maps a missing place id to undefined, not null', () => {
    const result = fromPlacesAddressComponents([], null)
    expect(result.googlePlaceId).toBeUndefined()
  })
})

describe('fromGeocoderAddressComponents', () => {
  const component = (long_name: string, types: string[]) => ({ long_name, short_name: long_name, types })

  it('maps a complete set of legacy Geocoding API address components (long_name/short_name, not longText/shortText)', () => {
    const result = fromGeocoderAddressComponents(
      [
        component('221', ['street_number']),
        component('Baker Street', ['route']),
        component('Mumbai', ['locality', 'political']),
        component('Maharashtra', ['administrative_area_level_1', 'political']),
        component('400001', ['postal_code']),
        component('India', ['country', 'political']),
      ],
      'geocoder-place-id',
    )

    expect(result).toEqual({
      addressLine1: '221 Baker Street',
      addressLine2: undefined,
      locality: undefined,
      city: 'Mumbai',
      state: 'Maharashtra',
      country: 'India',
      pincode: '400001',
      googlePlaceId: 'geocoder-place-id',
    })
  })

  it('required fields become "" when Google omits them, same contract as the Places mapper', () => {
    const result = fromGeocoderAddressComponents([], undefined)
    expect(result.addressLine1).toBe('')
    expect(result.city).toBe('')
    expect(result.state).toBe('')
    expect(result.pincode).toBe('')
  })

  it('country is undefined (not "") when Google omits it and no defaultCountry is given — genuinely optional, unlike the other fields', () => {
    const result = fromGeocoderAddressComponents([], undefined)
    expect(result.country).toBeUndefined()
  })

  it('falls back to defaultCountry when Google supplies no country component', () => {
    const result = fromGeocoderAddressComponents([component('Mumbai', ['locality'])], undefined, 'India')
    expect(result.country).toBe('India')
  })
})
