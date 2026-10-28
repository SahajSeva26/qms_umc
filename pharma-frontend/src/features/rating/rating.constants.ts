// Mirrors backend/src/modules/operations/rating/rating.constants.ts's 3 sub-score grounds
// exactly (onTime/attire/communication). Mirrors internal-frontend's rating.constants.ts.
export const RATING_GROUNDS = [
  { key: 'onTime', label: 'On time', hint: 'Reached and set up before the slot started' },
  { key: 'attire', label: 'Attire', hint: 'Dressed appropriately for the camp' },
  { key: 'communication', label: 'Communication', hint: 'Conduct with the doctor, staff and patients' },
] as const

export type RatingGroundKey = (typeof RATING_GROUNDS)[number]['key']
