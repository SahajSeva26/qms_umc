import { describe, it, expect } from 'vitest'
import { haversineDistanceKm } from './geo'

describe('haversineDistanceKm', () => {
  it('returns 0 for the same point', () => {
    expect(haversineDistanceKm([72.8777, 19.076], [72.8777, 19.076])).toBeCloseTo(0, 5)
  })

  it('returns a realistic distance for two known cities (Mumbai -> Pune, ~120km)', () => {
    const mumbai: [number, number] = [72.8777, 19.076]
    const pune: [number, number] = [73.8567, 18.5204]
    expect(haversineDistanceKm(mumbai, pune)).toBeGreaterThan(100)
    expect(haversineDistanceKm(mumbai, pune)).toBeLessThan(150)
  })

  it('returns a much larger distance for two far-apart cities (Mumbai -> Gurugram, ~1150km)', () => {
    const mumbai: [number, number] = [72.8777, 19.076]
    const gurugram: [number, number] = [77.0266, 28.4595]
    expect(haversineDistanceKm(mumbai, gurugram)).toBeGreaterThan(1000)
  })
})
