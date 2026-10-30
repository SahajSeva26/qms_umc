// Query-key registry for the Diet feature.
//
// One place to look up (and invalidate) every Diet cache entry. All keys are
// nested under the 'diet' root so a coarse `invalidateQueries({ queryKey:
// dietKeys.all })` reaches everything derived from the dietitian stores —
// which is what most writes need, because the stores are interdependent
// (adding a bank account changes the roster view, the profile bundle AND the
// payment rollup's bankComplete flag).
//
// The existing camps cache (['camps'], owned by features/camps via the shared
// useCampsData hook) is deliberately NOT re-declared here.

export const dietKeys = {
  all: ['diet'] as const,

  /** Full dietitian roster (real people + local enrolments). */
  roster: () => [...dietKeys.all, 'roster'] as const,

  /** Per-camp invitation list. */
  invites: (campId: string) => [...dietKeys.all, 'invites', campId] as const,

  /** Payout ledger (all entries). */
  payments: () => [...dietKeys.all, 'payments'] as const,

  /**
   * Every cached profile bundle for ONE dietitian, across camp revisions.
   *
   * This is the invalidation target for writes to a single dietitian's stores
   * (BCA equipment, rate history, payouts). Because `profile()` appends
   * `campsRev`, invalidating this prefix reaches every revision TanStack still
   * holds for that dietitian, and nothing belonging to anyone else — which is
   * what lets those mutations stop invalidating the whole `['diet']` subtree.
   */
  profileFor: (dietitianId: string) =>
    [...dietKeys.all, 'profile', dietitianId] as const,

  /**
   * Assembled profile bundle. `campsRev` is the camps query's dataUpdatedAt —
   * the bundle joins dietitian stores with camp records, so it must recompute
   * when either side changes.
   */
  profile: (dietitianId: string, campsRev: number) =>
    [...dietKeys.profileFor(dietitianId), campsRev] as const,
}
