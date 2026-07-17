export const getGreeting = (): string => {
  const hr = new Date().getHours()
  if (hr >= 5 && hr < 12) return 'Good morning'
  if (hr >= 12 && hr < 17) return 'Good afternoon'
  return 'Good evening'
}

export const formatClockDisplay = (): string => {
  const now = new Date()
  return (
    now.toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit', hour12: true }) +
    ' · ' +
    now.toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' })
  )
}

export const formatINR = (value: number): string => {
  if (value >= 1_00_00_000) return `₹${(value / 1_00_00_000).toFixed(2)} Cr`
  if (value >= 1_00_000) return `₹${(value / 1_00_000).toFixed(2)} L`
  if (value >= 1_000) return `₹${(value / 1_000).toFixed(1)} K`
  return `₹${value}`
}

export const formatDate = (date: string | Date): string => {
  return new Intl.DateTimeFormat('en-IN', {
    day: '2-digit', month: 'short', year: 'numeric',
  }).format(new Date(date))
}

export const formatPercent = (value: number, decimals = 1): string => {
  return `${value.toFixed(decimals)}%`
}
