import { searchDownlineMrs } from '@/features/pharma'

// Reuses the existing GET /roles/mrs call (already server-scoped to the caller's own downline —
// for ASM, that's exactly their direct-report MRs, which is all "My Team" needs for this role).
// Narrow re-export, not a duplicate HTTP call — see md-files/BACKEND_REQUESTS.md §6 for why RSM/HO
// can't use this same endpoint for their own (deeper) My Team view yet.
export const teamService = {
  searchDownlineMrs,
}
