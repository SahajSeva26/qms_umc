import { describe, it, expect } from 'vitest'
import { toLatLngLiteral, toCoordinatesTuple, fromPlacesAddressComponents, fromGeocoderAddressComponents, fromGeocoderAddressComponentsWithFallback } from './location.utils'

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

describe('fromGeocoderAddressComponentsWithFallback', () => {
  const component = (long_name: string, types: string[]) => ({ long_name, short_name: long_name, types })

  it('uses the primary (first) result for every field when it already has everything, ignoring later results entirely', () => {
    const result = fromGeocoderAddressComponentsWithFallback(
      [
        {
          address_components: [
            component('221', ['street_number']),
            component('Baker Street', ['route']),
            component('Mumbai', ['locality']),
            component('Maharashtra', ['administrative_area_level_1']),
            component('400001', ['postal_code']),
          ],
          formatted_address: '221 Baker Street, Mumbai, Maharashtra 400001',
        },
        // A later result with a DIFFERENT pincode — must never override the primary's own real value.
        { address_components: [component('400099', ['postal_code'])] },
      ],
      'place-id',
    )

    expect(result.address.pincode).toBe('400001')
    expect(result.address.addressLine1).toBe('221 Baker Street')
    expect(result.locationHint).toBe('221 Baker Street, Mumbai, Maharashtra 400001')
  })

  it('fills pincode from a later result when the first result genuinely has none — the rural-gap fallback', () => {
    const result = fromGeocoderAddressComponentsWithFallback(
      [
        // First result: only a locality/state, no street or postal code at all — a plausible rural pin drop.
        { address_components: [component('Dehene', ['locality']), component('Maharashtra', ['administrative_area_level_1'])], formatted_address: 'Dehene, Maharashtra, India' },
        // A later result Google also returned for this same point, carrying a real postal_code.
        { address_components: [component('421302', ['postal_code'])] },
      ],
      'place-id',
    )

    expect(result.address.pincode).toBe('421302')
    // Never derived/guessed — addressLine1 stays blank since no result had a street_number/route.
    expect(result.address.addressLine1).toBe('')
    expect(result.address.city).toBe('Dehene')
  })

  it('leaves pincode blank (never invents one from city/state) when NO result anywhere has a postal_code component', () => {
    const result = fromGeocoderAddressComponentsWithFallback(
      [
        { address_components: [component('Dehene', ['locality']), component('Maharashtra', ['administrative_area_level_1'])] },
      ],
      'place-id',
    )

    expect(result.address.pincode).toBe('')
  })

  it('locationHint falls back to a Plus Code when formatted_address is unavailable', () => {
    const result = fromGeocoderAddressComponentsWithFallback(
      [{ address_components: [], plus_code: { compound_code: '7JVW+8Q Dehene, Maharashtra', global_code: '7JVW7JVW+8Q' } }],
      null,
    )
    expect(result.locationHint).toBe('7JVW+8Q Dehene, Maharashtra')
  })

  it('locationHint is null when Google supplies neither a formatted address nor a Plus Code', () => {
    const result = fromGeocoderAddressComponentsWithFallback([{ address_components: [] }], null)
    expect(result.locationHint).toBeNull()
  })

  it('locationHint is null for an empty results array (no primary result at all)', () => {
    const result = fromGeocoderAddressComponentsWithFallback([], null)
    expect(result.locationHint).toBeNull()
    expect(result.address.city).toBe('')
  })
})
