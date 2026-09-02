import { format } from 'date-fns'

// API dateOfBirth is a full ISO timestamp, not a bare date — slice to the
// date-only portion first so this can't render a day early west of UTC.
export const formatPatientDob = (value: string) => {
  const dateOnly = value.slice(0, 10)
  return format(new Date(`${dateOnly}T00:00:00`), 'd MMM yyyy')
}

export const maskedMobile = (mobile: string) => `•••• ${mobile.slice(-4)}`
