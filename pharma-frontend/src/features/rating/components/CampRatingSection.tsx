import { lazy, Suspense, useState, type ReactNode } from 'react'
import { FiStar } from 'react-icons/fi'
import { Button } from '@qms/ui'
import DialogErrorBoundary from '@/components/ui/DialogErrorBoundary'
import { useSession } from '@/hooks/useSession'
import { useRatings } from '@/features/rating/hooks/useRatings'
import RatingDisplay from '@/features/rating/components/RatingDisplay'
import type { CampEntity, CampPopulatedRole } from '@/types/campReal.types'

// Only loads once a camp's own MR actually opens the rate/edit form — most viewers never trigger it.
const RateCampModal = lazy(() => import('@/features/rating/components/RateCampModal'))

const mrRoleId = (mr: CampEntity['mr']): string | undefined =>
  mr && typeof mr !== 'string' ? (mr as CampPopulatedRole)._id : (mr ?? undefined)

interface CampRatingSectionProps {
  camp: CampEntity
  /** Each caller supplies its own chrome (Section vs Card) around the same content/logic below —
   * extracted here because PharmaCampDetailDrawer and CampDossierContent had drifted into two
   * independent copies of this permission check, and only one of them got fixed when the gap
   * (HO/RSM/ASM have no rating:* permission, so an unguarded useRatings call 403s for them) was
   * first found. One shared component means that can't happen again. */
  wrapper: (children: ReactNode) => ReactNode
}

// Only the camp's own MR may rate, and only once closed (mirrors backend assertCampMrOrManage).
// Gated on the rating:get/rating:search/rating:create permission (not just role/isOwnMr) —
// confirmed against the backend that only pharma-mr's role type holds any rating:* permission
// today (see defaultRoleTypes.ts); HO/RSM/ASM have none, so useRatings would 403 for them.
// Checking the permission directly (rather than a role-code check) means this stays correct if
// that grant ever changes, and — the whole point of this component existing — guarantees a
// non-rating role makes ZERO rating requests, never a doomed one that 403s.
const CampRatingSection = ({ camp, wrapper }: CampRatingSectionProps) => {
  const { session, hasAnyPermission } = useSession()
  const [modalOpen, setModalOpen] = useState(false)
  const isOwnMr = !!session?.role.id && session.role.id === mrRoleId(camp.mr)
  const canViewRating = hasAnyPermission(['rating:get', 'rating:search', 'rating:manage'])
  const canRate = isOwnMr && camp.status === 'closed' && hasAnyPermission(['rating:create', 'rating:manage'])

  const { items, isLoading, error, refetch } = useRatings(
    { camp: camp.id },
    { enabled: canViewRating && (canRate || camp.status === 'closed') },
  )
  const existing = items[0] ?? null

  if (!canViewRating) return null
  if (!canRate && !existing && !error) return null

  return wrapper(
    <>
      {isLoading ? (
        <div className="text-[12px]" style={{ color: 'var(--qms-text-muted)' }}>Loading…</div>
      ) : error ? (
        <div className="flex items-center justify-between gap-2 text-[12px]" style={{ color: 'var(--qms-text-muted)' }}>
          <span>Couldn't load this camp's rating.</span>
          <Button variant="outline" size="sm" onClick={() => refetch()}>Retry</Button>
        </div>
      ) : existing ? (
        <>
          <RatingDisplay rating={existing} />
          {canRate && (
            <Button variant="outline" size="sm" className="mt-2" onClick={() => setModalOpen(true)}>
              <FiStar size={12} /> Edit rating
            </Button>
          )}
        </>
      ) : canRate ? (
        <Button size="sm" onClick={() => setModalOpen(true)}>
          <FiStar size={12} /> Rate camp
        </Button>
      ) : null}

      {modalOpen && (
        <DialogErrorBoundary onClose={() => setModalOpen(false)}>
          <Suspense fallback={null}>
            <RateCampModal open campId={camp.id} existing={existing} onClose={() => setModalOpen(false)} />
          </Suspense>
        </DialogErrorBoundary>
      )}
    </>,
  )
}

export default CampRatingSection
