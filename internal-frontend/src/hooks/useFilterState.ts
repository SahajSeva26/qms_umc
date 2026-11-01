import { useState } from 'react'

// Shared "filter bar state" shape: a flat bag of filter values, a per-key
// setter, and a reset back to the caller's own defaults.
export function useFilterState<T extends object>(initialState: T) {
  const [filters, setFilters] = useState<T>(initialState)

  const setFilter = <K extends keyof T>(key: K, value: T[K]) => {
    setFilters((prev) => ({ ...prev, [key]: value }))
  }

  const reset = () => setFilters(initialState)

  return { filters, setFilter, reset }
}
