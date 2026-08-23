import { useMemo } from 'react'
import type { Camp } from '@/features/camps/camp.types'
import {
  buildDietitianCandidates, loadCandidateIndex,
  type DietitianCandidateList,
} from '@/features/diet/services/dietitianCandidates.service'

// The React boundary for the camp dietitian shortlist.
//
// WHY useMemo AND NOT useQuery
// The shortlist is a pure derivation of `camps` (already a cached query) plus
// the dietitian stores. Wrapping it in useQuery would mean:
//   1. A cache entry that outlives the modal. The list is ~1,000 annotated
//      objects; holding it for the default gcTime after the picker closes is
//      exactly the "large objects retained longer than necessary" problem. A
//      useMemo is released with the component.
//   2. A staleness risk the synchronous read does not have. Two of the backing
//      stores (rate history, BCA equipment) are also written by features/om
//      through its own service, which invalidates its own keys — never
//      `dietKeys`. A cached shortlist could therefore serve data the current
//      synchronous read would not.
//   3. A fake async boundary: queryFn would have to wrap a synchronous call in
//      a resolved promise purely to look like an API.
//
// It is still a hook, and that is the point: when
// `GET /camps/:id/dietitian-candidates` exists, this body becomes a useQuery
// keyed under dietKeys and NO consumer changes — they already receive the
// finished DietitianCandidateList.
export const useDietitianCandidates = (camp: Camp | null, camps: Camp[]): DietitianCandidateList => {
  return useMemo(
    () => (camp ? buildDietitianCandidates(camp, camps) : { requiresBca: false, candidates: [] }),
    [camp, camps],
  )
}

/**
 * Same shortlist for MANY camps at once (the Assign tab's card list), with one
 * index shared across them — otherwise each card re-parses every store.
 *
 * `topByScore` is passed through so a caller that only shows a single
 * suggestion keeps its existing "best of the top N by score" rule.
 */
export const useDietitianCandidatesByCamp = (
  targetCamps: Camp[],
  allCamps: Camp[],
  topByScore?: number,
): Map<string, DietitianCandidateList> => {
  return useMemo(() => {
    const out = new Map<string, DietitianCandidateList>()
    if (!targetCamps.length) return out
    const index = loadCandidateIndex(allCamps)
    targetCamps.forEach((c) => out.set(c.id, buildDietitianCandidates(c, allCamps, { index, topByScore })))
    return out
  }, [targetCamps, allCamps, topByScore])
}
