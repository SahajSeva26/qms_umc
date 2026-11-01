// Stable empty-array reference for `?? EMPTY_ARRAY` fallbacks — a literal `?? []`
// creates a new array every render, defeating useMemo/useCallback deps on it.
export const EMPTY_ARRAY: never[] = []
