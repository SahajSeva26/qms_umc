import { FiUsers } from 'react-icons/fi'
import { useMyTeam } from '@/features/team/hooks/useMyTeam'
import MyTeamCard from '@/features/team/components/MyTeamCard'
import QueryStateBlock from '@/components/ui/QueryStateBlock'
import PaginationControls from '@/components/ui/PaginationControls'
import { usePagination } from '@/hooks/usePagination'

const PAGE_SIZE = 20

// Matches the real list's row shape so the shimmer never jumps in size once data arrives.
const TEAM_SKELETON = (
  <div aria-busy="true" aria-live="polite" className="animate-pulse grid gap-3" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))' }}>
    {Array.from({ length: 6 }).map((_, i) => (
      <div key={i} className="rounded-xl border p-3.5" style={{ borderColor: 'var(--qms-border)' }}>
        <div className="flex items-center gap-2.5">
          <div className="rounded-full shrink-0" style={{ background: 'var(--qms-surface-strong)', width: 38, height: 38 }} />
          <div className="flex-1 space-y-1.5">
            <div className="h-3.5 w-28 rounded" style={{ background: 'var(--qms-surface-strong)' }} />
            <div className="h-3 w-20 rounded" style={{ background: 'var(--qms-surface-strong)' }} />
          </div>
        </div>
      </div>
    ))}
  </div>
)

// ASM's "My Team" — the caller's own direct-report MRs, via the already-safe GET /roles/mrs.
// RSM/HO don't get an equivalent tab yet: their real My Team view needs a deeper tree (RSM needs
// ASM→MR grouping, HO needs the full RSM→ASM→MR tree) that this endpoint can't produce — see
// md-files/BACKEND_REQUESTS.md §6/§7 for the full gap writeup. Card content is limited to what
// GET /roles/mrs actually returns (populated user name, role code, division) — no
// city/camp-count/serviceability data,
// which doesn't exist in our real backend today (the prototype's version simulates it).
const MyTeamTab = () => {
  const { page, setPage, totalPages } = usePagination(PAGE_SIZE)

  const { data, isLoading, isFetching, error, refetch } = useMyTeam(
    { page: String(page), limit: String(PAGE_SIZE) },
    { keepPreviousData: true },
  )
  const mrs = data?.data?.items ?? []
  const totalCount = data?.data?.count ?? 0

  return (
    <div>
      <div className="rounded-xl border px-3.5 py-3 mb-4" style={{ borderColor: 'var(--qms-border)', background: 'var(--qms-surface-card)' }}>
        <div className="flex items-center gap-1.5 font-extrabold text-[13px]" style={{ color: 'var(--qms-text)' }}>
          <FiUsers size={13} /> My team
        </div>
        {!isLoading && !error && (
          <div className="text-[11px] mt-0.5" style={{ color: 'var(--qms-text-soft)' }}>
            {totalCount} MR{totalCount === 1 ? '' : 's'} reporting to you
          </div>
        )}
      </div>

      <QueryStateBlock
        isLoading={isLoading}
        error={error}
        loadingLabel="Loading your team…"
        errorLabel="Failed to load your team. Please try again."
        onRetry={refetch}
        loadingSkeleton={TEAM_SKELETON}
        isFetching={isFetching}
      >
        {mrs.length === 0 ? (
          <div className="text-[13px] py-10 text-center rounded-xl border" style={{ color: 'var(--qms-text-muted)', borderColor: 'var(--qms-border)' }}>
            No MRs reporting to you yet.
          </div>
        ) : (
          <div className="grid gap-3" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))' }}>
            {mrs.map((mr) => <MyTeamCard key={mr.id} mr={mr} />)}
          </div>
        )}
        <PaginationControls page={page} totalPages={totalPages(totalCount)} onPageChange={setPage} disabled={isFetching} />
      </QueryStateBlock>
    </div>
  )
}

export default MyTeamTab
