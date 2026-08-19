export const IDENTIFIER_DISPLAY_LENGTH = 10

// Shared with any real (non-mock) inventory table cell showing a free-text,
// uncapped identifier (Item Master's code, a device's serialNumber, a
// consumable's batch) — a hard character-count cut + ellipsis, distinct from
// the CSS `truncate` used on genuinely free-text fields like item name.
export const truncateIdentifier = (value: string) =>
  value.length > IDENTIFIER_DISPLAY_LENGTH ? `${value.slice(0, IDENTIFIER_DISPLAY_LENGTH)}…` : value
