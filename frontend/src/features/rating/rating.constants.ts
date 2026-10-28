// Mirrors backend/src/modules/operations/rating/rating.constants.ts's 3 sub-score grounds exactly
// (onTime/attire/communication) — NOT the prototype's newer onTime/campExecution/softSkill scheme,
// which our backend doesn't implement. See md-files/BACKEND_REQUEST_camp-dossier.md.
export const RATING_GROUNDS = [
  { key: 'onTime', label: 'On time', hint: 'Reached and set up before the slot started' },
  { key: 'attire', label: 'Attire', hint: 'Dressed appropriately for the camp' },
  { key: 'communication', label: 'Communication', hint: 'Conduct with the doctor, staff and patients' },
] as const

export type RatingGroundKey = (typeof RATING_GROUNDS)[number]['key']

// A ground scored below this requires a reason — mirrors the prototype's REASON_THRESHOLD.
export const RATING_REASON_THRESHOLD = 4
