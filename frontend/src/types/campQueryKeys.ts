// Shared by camps and pharma — both list the same backend camp records under separate cache namespaces.
export const CAMP_QUERY_NAMESPACES = {
  internal: 'campsReal',
  pharma: 'pharma-camps',
} as const
