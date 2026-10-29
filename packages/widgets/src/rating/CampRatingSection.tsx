import { lazy, Suspense, useState, type ReactNode } from 'react'
import type { AxiosInstance } from 'axios'
import { FiStar } from 'react-icons/fi'
import { useRatings, useMyRatings } from '@qms/core'
import { Button } from '@qms/ui'
import DialogErrorBoundary from '../dialog/DialogErrorBoundary'
import RatingDisplay from './RatingDisplay'

// RateCampModal only loads once a camp's own rater actually opens the rate/edit form — it pulls
// in @qms/ui's Dialog (@base-ui/react/dialog), which nothing else eagerly mounted here needs.
//
// DialogErrorBoundary stays EAGER, deliberately, even though CampRatingSection is always eagerly
// mounted wherever a camp drawer/dossier renders: it exists specifically to catch a failed
// `lazy(() => import('./RateCampModal'))`, and a boundary that is itself behind React.lazy has
// nothing left to catch a failure of ITS OWN chunk — the exact failure mode it exists to guard
// against. It stays cheap to keep eager because it has no Dialog/icon dependency of its own (see
// its own file) — only RateCampModal's real Base UI dialog chrome is deferred.
const RateCampModal = lazy(() => import('./RateCampModal'))

export interface CampRatingAccess {
  /** GET /ratings (search) — guarded by rating:search OR rating:manage. Set when the viewer may
   * query ratings broadly (not just their own). */
  canSearch: boolean
  /** GET /ratings/me?camp=... — guarded by rating:get OR rating:search OR rating:manage, and
   * own-scoped server-side to ratings where the caller is the worker OR the rater. Set when the
   * viewer may read only their OWN rating for this camp, without the broader rating:search grant. */
  canReadOwn: boolean
  /** POST /ratings — guarded by rating:create OR rating:manage. Independent of both read flags
   * above: a role can hold create without holding search or get-own (e.g. a narrowly-scoped
   * rater role) — see the create-only branch below for how that's handled. */
  canCreate: boolean
  /** PUT /ratings/:id — guarded by rating:update OR rating:manage. Independent of canCreate: the
   * backend's own assertRaterOrManage allows only the ORIGINAL rater or a rating:manage actor to
   * edit, which is a materially different question from "may this viewer create a new rating." */
  canUpdate: boolean
}

export interface CampRatingSectionProps {
  campId: string
  /** Who may do what with this camp's rating — see CampRatingAccess. Each field is the CALLER's
   * policy to compute (own-worker ownership, camp status, and the actual rating:* permissions are
   * all app-specific — this component has no opinion on who "the rater" is). */
  ratingAccess: CampRatingAccess
  /** The CALLING app's own configured axios instance. */
  api: AxiosInstance
  toast: { success: (msg: string) => void; error: (msg: string) => void }
  getErrorMessage: (err: unknown, fallback: string) => string
  /** Each caller supplies its own chrome (Section vs Card vs anything else) around the same
   * content/logic below. */
  wrapper: (children: ReactNode) => ReactNode
}

const CampRatingSection = ({
  campId,
  ratingAccess,
  api,
  toast,
  getErrorMessage,
  wrapper,
}: CampRatingSectionProps) => {
  const { canSearch, canReadOwn, canCreate, canUpdate } = ratingAccess
  const [modalOpen, setModalOpen] = useState(false)
  // Surfaced durably (not just a toast) when a create-only viewer (no read capability at all)
  // hits the backend's real 409 — they have no way to see the rating that already exists, so a
  // transient toast alone would leave them staring at a "Rate camp" button that keeps failing
  // with no visible explanation.
  const [createOnlyConflict, setCreateOnlyConflict] = useState<string | null>(null)

  // canSearch and canReadOwn are mutually exclusive in practice (a canSearch viewer never needs
  // canReadOwn's narrower query), but both hooks are called unconditionally — Rules of Hooks —
  // with `enabled` doing the actual gating, same pattern as every other conditional query here.
  const searchResult = useRatings(api, { camp: campId }, { enabled: canSearch })
  const myResult = useMyRatings(api, { camp: campId }, { enabled: !canSearch && canReadOwn })

  const canRead = canSearch || canReadOwn
  const { items, isLoading, error, refetch } = canSearch ? searchResult : myResult
  const existing = canRead ? (items[0] ?? null) : null

  const openModal = () => {
    setCreateOnlyConflict(null)
    setModalOpen(true)
  }

  if (!canRead && !canCreate) return null
  // A read-capable viewer with nothing to show and nothing to do (can't create, no error) sees
  // nothing — matches the previous behavior for that case exactly.
  if (canRead && !canCreate && !existing && !error) return null

  return wrapper(
    <>
      {!canRead ? (
        // create-only, no read capability at all: never queries GET /ratings or GET /ratings/me —
        // the viewer's permissions don't allow either, so this doesn't make a doomed request.
        createOnlyConflict ? (
          <div className="flex items-center justify-between gap-2 text-[12px]" style={{ color: 'var(--qms-text-muted)' }}>
            <span>{createOnlyConflict}</span>
          </div>
        ) : (
          <Button size="sm" onClick={openModal}>
            <FiStar size={12} /> Rate camp
          </Button>
        )
      ) : isLoading ? (
        <div className="text-[12px]" style={{ color: 'var(--qms-text-muted)' }}>Loading…</div>
      ) : error ? (
        <div className="flex items-center justify-between gap-2 text-[12px]" style={{ color: 'var(--qms-text-muted)' }}>
          <span>Couldn't load this camp's rating.</span>
          <Button variant="outline" size="sm" onClick={() => refetch()}>Retry</Button>
        </div>
      ) : existing ? (
        <>
          <RatingDisplay rating={existing} />
          {canUpdate && (
            <Button variant="outline" size="sm" className="mt-2" onClick={openModal}>
              <FiStar size={12} /> Edit rating
            </Button>
          )}
        </>
      ) : canCreate ? (
        <Button size="sm" onClick={openModal}>
          <FiStar size={12} /> Rate camp
        </Button>
      ) : null}

      {modalOpen && (
        <DialogErrorBoundary onClose={() => setModalOpen(false)}>
          <Suspense fallback={null}>
            <RateCampModal
              open
              campId={campId}
              existing={existing}
              onClose={() => setModalOpen(false)}
              api={api}
              toast={toast}
              getErrorMessage={getErrorMessage}
              onCreateConflict={!canRead ? (message) => setCreateOnlyConflict(message) : undefined}
            />
          </Suspense>
        </DialogErrorBoundary>
      )}
    </>,
  )
}

export default CampRatingSection
