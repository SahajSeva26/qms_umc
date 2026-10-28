// Promoted to types/campref.types.ts so other features (Ops Manager, Diet
// Camps) can read these lookups through the shared types layer instead of
// reaching into features/camps/ internals — same pattern as the
// CLIENTS/DIVISIONS/STAGES promotions. Re-exported here for backward
// compatibility with existing imports in this feature.
export { CLIENT_NAMES, DIVISION_NAMES, FO_NAMES, clientName, divisionName, foName } from '@/types/campref.types'
