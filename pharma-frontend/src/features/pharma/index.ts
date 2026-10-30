// Deliberately narrow public API for cross-feature consumers. Keep this surface limited to the
// downline-MR contract shared by booking and My Team; feature internals stay private.
export { searchDownlineMrs } from './mr.service'
export { displayMrName } from './mr.types'
export type {
  EligibleMr,
  MrPopulatedDivision,
  MrPopulatedUser,
  SearchDownlineMrQuery,
} from './mr.types'
