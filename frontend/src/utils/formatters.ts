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
