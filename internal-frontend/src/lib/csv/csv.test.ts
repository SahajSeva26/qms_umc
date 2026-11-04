import { describe, it, expect } from 'vitest'
import { toCsv } from './csv'

describe('toCsv — CSV formula injection', () => {
  it.each(['=cmd|/c calc', '+1+1', '-1+1', '@SUM(A1)'])(
    'prefixes a cell starting with %s so Excel/Sheets treats it as text, not a formula',
    (formula) => {
      const csv = toCsv([{ value: formula }])
      const [, dataLine] = csv.split('\r\n')
      expect(dataLine.startsWith(`'${formula}`)).toBe(true)
    },
  )

  it('leaves an ordinary value untouched', () => {
    const csv = toCsv([{ value: 'Acme Corp' }])
    const [, dataLine] = csv.split('\r\n')
    expect(dataLine).toBe('Acme Corp')
  })
})
