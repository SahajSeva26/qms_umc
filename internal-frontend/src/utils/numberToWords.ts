// Indian numbering system (lakh/crore) number-to-words, for the "Amount Chargeable (in words)"
// line on a printed tax invoice. Pure derivation from the real invoice total — no backend field.
const ONES = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen']
const TENS = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety']

function twoDigits(n: number): string {
  if (n < 20) return ONES[n]
  const tens = Math.floor(n / 10)
  const ones = n % 10
  return ones ? `${TENS[tens]} ${ONES[ones]}` : TENS[tens]
}

function threeDigits(n: number): string {
  const hundreds = Math.floor(n / 100)
  const rest = n % 100
  if (hundreds && rest) return `${ONES[hundreds]} Hundred ${twoDigits(rest)}`
  if (hundreds) return `${ONES[hundreds]} Hundred`
  return twoDigits(rest)
}

/** Whole-rupee amount → Indian-numbering words, e.g. 279424 -> "Two Lakh Seventy Nine Thousand Four Hundred Twenty Four". Fractional paise are dropped, matching the sample invoice's own convention. */
export function rupeesInWords(amount: number): string {
  const whole = Math.floor(Math.abs(amount))
  if (whole === 0) return 'Zero'

  const crore = Math.floor(whole / 1_00_00_000)
  const lakh = Math.floor((whole % 1_00_00_000) / 1_00_000)
  const thousand = Math.floor((whole % 1_00_000) / 1_000)
  const hundred = whole % 1_000

  const parts: string[] = []
  if (crore) parts.push(`${threeDigits(crore)} Crore`)
  if (lakh) parts.push(`${threeDigits(lakh)} Lakh`)
  if (thousand) parts.push(`${threeDigits(thousand)} Thousand`)
  if (hundred) parts.push(threeDigits(hundred))

  return parts.join(' ')
}
