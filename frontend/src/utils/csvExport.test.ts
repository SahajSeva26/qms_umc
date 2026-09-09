import { describe, it, expect } from 'vitest'
import { toCsv } from './csvExport'

describe('toCsv — CSV formula injection', () => {
  const columns = [{ header: 'Value', get: (row: { value: string | number }) => row.value }]

  it.each(['=cmd|/c calc', '+1+1', '-1+1', '@SUM(A1)'])(
    'prefixes a cell starting with %s so Excel/Sheets treats it as text, not a formula',
    (formula) => {
      const csv = toCsv([{ value: formula }], columns)
      const [, dataLine] = csv.split('\n')
      expect(dataLine.startsWith(`'${formula}`)).toBe(true)
    },
  )

  it('leaves an ordinary value untouched', () => {
    const csv = toCsv([{ value: 'Acme Corp' }], columns)
    const [, dataLine] = csv.split('\n')
    expect(dataLine).toBe('Acme Corp')
  })

  it('still quotes a formula-prefixed value that also contains a comma', () => {
    const csv = toCsv([{ value: '=1,2' }], columns)
    const [, dataLine] = csv.split('\n')
    expect(dataLine).toBe(`"'=1,2"`)
  })
})
