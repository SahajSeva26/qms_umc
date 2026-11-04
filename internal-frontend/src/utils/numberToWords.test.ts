import { describe, it, expect } from 'vitest'
import { rupeesInWords } from './numberToWords'

describe('rupeesInWords', () => {
  it('matches the sample tax invoice total exactly', () => {
    expect(rupeesInWords(279424)).toBe('Two Lakh Seventy Nine Thousand Four Hundred Twenty Four')
  })

  it('handles zero', () => {
    expect(rupeesInWords(0)).toBe('Zero')
  })

  it('handles a bare hundred with no tens/ones', () => {
    expect(rupeesInWords(100)).toBe('One Hundred')
  })

  it('handles a plain two-digit number', () => {
    expect(rupeesInWords(42)).toBe('Forty Two')
  })

  it('handles crore-scale amounts', () => {
    expect(rupeesInWords(1_23_45_678)).toBe('One Crore Twenty Three Lakh Forty Five Thousand Six Hundred Seventy Eight')
  })

  it('drops fractional paise, matching the sample invoice convention', () => {
    expect(rupeesInWords(279424.75)).toBe('Two Lakh Seventy Nine Thousand Four Hundred Twenty Four')
  })
})
