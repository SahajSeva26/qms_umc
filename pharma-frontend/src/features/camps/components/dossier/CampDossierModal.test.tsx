import { describe, it, expect, vi, beforeEach } from 'vitest'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import CampDossierModal from './CampDossierModal'
import { pharmaCampsService } from '@/features/camps/camps.service'
import type { CampEntity } from '@/types/campReal.types'

vi.mock('@/features/camps/camps.service', () => ({
  pharmaCampsService: {
    myCamps: vi.fn(),
    getCamp: vi.fn(),
  },
}))

// CampDossierContent's RatingCard genuinely calls the rating service — without this mock it
// fails in a real test environment (no backend), producing a transient error-state Retry button
// that destabilizes the Tab sequence below. Resolved empty so the dialog's tabbable-element set
// is deterministic for the focus-trap assertions.
vi.mock('@/features/rating/rating.service', () => ({
  ratingService: {
    searchRatings: vi.fn(async () => ({ success: true, message: '', data: { items: [], count: 0 } })),
  },
}))

vi.mock('@/hooks/useSession', () => ({
  useSession: () => ({ session: null, hasAnyPermission: () => false }),
}))

function campFixture(overrides: Partial<CampEntity> = {}): CampEntity {
  return {
    id: 'camp-1', code: 'cmp-000001', project: 'proj-1',
    doctor: 'doc-1', type: 'screening', patientExpectation: 0,
    fo: null, dietitian: null, mr: null, date: '2026-09-15',
    timeSlot: '9am-1pm', location: null,
    status: 'closed', stageHistory: [],
    createdAt: '', updatedAt: '', ...overrides,
  } as CampEntity
}

function makeQueryClient() {
  return new QueryClient({ defaultOptions: { queries: { retry: false } } })
}

function renderModal(campId: string | null, onClose = vi.fn()) {
  return render(
    <QueryClientProvider client={makeQueryClient()}>
      <MemoryRouter>
        <CampDossierModal campId={campId} onClose={onClose} />
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

// These exercise the P2 fix: the dossier used to render its sheet in a bare <div>, not
// DialogPrimitive.Popup — so none of the real dialog semantics (focus entry, focus containment,
// Escape-to-close, focus restoration) ever applied. Routing through the real popup primitive
// should make all of this work the same as every other dialog in the app.
describe('CampDossierModal — real dialog semantics via DialogPrimitive.Popup', () => {
  beforeEach(() => {
    vi.mocked(pharmaCampsService.getCamp).mockResolvedValue({ success: true, message: '', data: campFixture() })
  })

  it('renders nothing when campId is null', () => {
    renderModal(null)
    expect(screen.queryByText('Camp dossier')).not.toBeInTheDocument()
  })

  it('shows a dossier-shaped skeleton (not plain loading text) while GET /camps/:id is in flight', async () => {
    vi.mocked(pharmaCampsService.getCamp).mockReturnValue(new Promise(() => {}))
    renderModal('camp-1')
    await screen.findByText('Camp dossier')

    const skeleton = await screen.findByText('', { selector: '[aria-busy="true"]' })
    expect(skeleton).toBeInTheDocument()
    expect(screen.queryByText(/loading camp dossier/i)).not.toBeInTheDocument()
  })

  it('exposes a real dialog role, so assistive tech and focus-trap libraries treat it as a modal', async () => {
    renderModal('camp-1')
    expect(await screen.findByText('Camp dossier')).toBeInTheDocument()
    expect(screen.getByRole('dialog')).toBeInTheDocument()
  })

  it('moves focus into the dialog on open (focus entry) — not left on whatever had focus before', async () => {
    renderModal('camp-1')
    await screen.findByText('Camp dossier')

    const dialog = screen.getByRole('dialog')
    await waitFor(() => expect(dialog.contains(document.activeElement)).toBe(true))
  })

  it('Escape calls onClose, same as every other dialog in the app', async () => {
    const onClose = vi.fn()
    const user = userEvent.setup()
    renderModal('camp-1', onClose)
    await screen.findByText('Camp dossier')

    await user.keyboard('{Escape}')

    await waitFor(() => expect(onClose).toHaveBeenCalled())
  })

  it('the Close button calls onClose', async () => {
    const onClose = vi.fn()
    const user = userEvent.setup()
    renderModal('camp-1', onClose)
    await screen.findByText('Camp dossier')

    await user.click(screen.getByRole('button', { name: /close/i }))

    expect(onClose).toHaveBeenCalled()
  })

  it('focus stays contained inside the dialog — Tab never lands on something outside it', async () => {
    const user = userEvent.setup()
    render(
      <QueryClientProvider client={makeQueryClient()}>
        <MemoryRouter>
          <button type="button">Outside trigger</button>
          <CampDossierModal campId="camp-1" onClose={vi.fn()} />
        </MemoryRouter>
      </QueryClientProvider>,
    )
    await screen.findByText('Camp dossier')

    const dialog = screen.getByRole('dialog')
    await waitFor(() => expect(dialog.contains(document.activeElement)).toBe(true))

    // Tab repeatedly — focus must never land on the real page outside the dialog. base-ui's own
    // off-screen focus-guard sentinels (data-base-ui-focus-guard, clip-path: inset(50%)) sit as
    // SIBLINGS of the dialog, not inside it, by design — they're what redirects a Tab-out attempt
    // back into the dialog, so landing there briefly is the focus trap working correctly, not escaping.
    const isInsideOrGuard = (el: Element | null) =>
      !!el && (dialog.contains(el) || el.hasAttribute('data-base-ui-focus-guard'))
    for (let i = 0; i < 6; i++) {
      await user.tab()
      expect(isInsideOrGuard(document.activeElement)).toBe(true)
    }
  })
})
