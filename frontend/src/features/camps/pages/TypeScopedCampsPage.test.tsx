import { describe, it, expect, vi, beforeEach } from 'vitest'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen, within, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import { usePermission } from '@/hooks/usePermission'
import { useCampsReal } from '@/features/camps/hooks/useCampsReal'
import { useCampReport } from '@/features/camps/hooks/useCampReport'
import { useCampRefNames } from '@/features/camps/hooks/useCampRefNames'
import TypeScopedCampsPage from './TypeScopedCampsPage'

vi.mock('@/hooks/usePermission')
vi.mock('@/features/camps/hooks/useCampsReal')
vi.mock('@/features/camps/hooks/useCampReport')
vi.mock('@/features/camps/hooks/useCampReal')
vi.mock('@/features/camps/hooks/useCampRefNames')
vi.mock('@/features/camps/hooks/useMoveCampStage', () => ({
  useMoveCampStage: () => ({ mutate: vi.fn(), isPending: false, isError: false }),
}))
vi.mock('@/features/camps/hooks/useAllocateFo', () => ({
  useAllocateFo: () => ({ mutate: vi.fn(), isPending: false, isError: false }),
}))

function mockPermission(canWrite = false) {
  vi.mocked(usePermission).mockReturnValue({
    hasAnyPermission: () => canWrite,
    session: { tenant: { type: 'customer' }, role: { id: 'r-viewer' }, roleType: { code: 'admin' } },
  } as unknown as ReturnType<typeof usePermission>)
}

function mockCampsRealList() {
  vi.mocked(useCampsReal).mockReturnValue({
    data: { success: true, message: '', data: { count: 0, items: [] } },
    isLoading: false, isError: false, error: null, refetch: vi.fn(),
  } as unknown as ReturnType<typeof useCampsReal>)
}

function mockRefNames() {
  vi.mocked(useCampRefNames).mockReturnValue({
    doctorName: () => 'Dr. Aarav Mehta',
    divisionName: () => 'Cardio Division',
    projectName: () => 'Screening Drive',
    roleName: () => 'Ravi Kumar',
    doctors: [], divisions: [], roles: [], projects: [],
  } as unknown as ReturnType<typeof useCampRefNames>)
}

function makeQueryClient() {
  return new QueryClient({ defaultOptions: { queries: { retry: false } } })
}

function renderPage(type: 'screening' | 'diet', title: string) {
  return render(
    <QueryClientProvider client={makeQueryClient()}>
      <MemoryRouter initialEntries={['/camps']}>
        <Routes>
          <Route path="/camps" element={<TypeScopedCampsPage type={type} title={title} />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

describe.each([
  { type: 'screening' as const, title: 'Screening Camps' },
  { type: 'diet' as const, title: 'Diet Camps' },
])('TypeScopedCampsPage (type=$type)', ({ type, title }) => {
  beforeEach(() => {
    vi.resetAllMocks()
    mockRefNames()
    mockCampsRealList()
    mockPermission(false)
  })

  it('renders the title prop as the page heading', () => {
    renderPage(type, title)

    expect(screen.getByRole('heading', { name: title })).toBeInTheDocument()
  })

  it('calls useCampsReal with the fixed type and the correct ALL -> undefined mapping', () => {
    renderPage(type, title)

    expect(useCampsReal).toHaveBeenCalledWith(expect.objectContaining({
      type,
      status: undefined,
      billingType: undefined,
    }))
  })

  it('never calls useCampReport — no KPI strip fetch for a type-scoped page', () => {
    renderPage(type, title)

    expect(useCampReport).not.toHaveBeenCalled()
  })

  it('does not render a Type filter dropdown', () => {
    renderPage(type, title)

    expect(screen.queryByText('Type')).not.toBeInTheDocument()
  })

  it('still renders Status/Billing filters and the camp table shell', () => {
    renderPage(type, title)

    expect(screen.getAllByText('Status').length).toBeGreaterThan(0)
    expect(screen.getByText('Billing')).toBeInTheDocument()
  })

  it('keeps type fixed after the user changes Status, City, and other filters', async () => {
    const user = userEvent.setup()
    renderPage(type, title)

    // Change Status via the shared Select — it's the first of the two
    // remaining comboboxes on this page (Status, Billing) since Type is hidden.
    const [statusTrigger] = screen.getAllByRole('combobox')
    await user.click(statusTrigger)
    const listbox = await screen.findByRole('listbox')
    await user.click(within(listbox).getByRole('option', { name: 'Confirmed' }))

    await waitFor(() => expect(useCampsReal).toHaveBeenLastCalledWith(expect.objectContaining({
      type,
      status: 'confirmed',
    })))

    // Change City (debounced text input).
    await user.type(screen.getByPlaceholderText('City...'), 'Mumbai')
    await waitFor(() => expect(useCampsReal).toHaveBeenLastCalledWith(expect.objectContaining({
      type,
      city: 'Mumbai',
    })), { timeout: 1000 })

    // type must never have drifted across any of the calls triggered above.
    const allTypesPassed = vi.mocked(useCampsReal).mock.calls.map((call) => call[0].type)
    expect(allTypesPassed.every((t) => t === type)).toBe(true)
  })

  it('uses a type-specific fallback subtitle while loading/erroring, not the all-types Camp Management text', () => {
    vi.mocked(useCampsReal).mockReturnValue({
      data: undefined, isLoading: true, isError: false, error: null, refetch: vi.fn(),
    } as unknown as ReturnType<typeof useCampsReal>)

    renderPage(type, title)

    expect(screen.getByText(`${title} wired to the real backend.`)).toBeInTheDocument()
    expect(screen.queryByText(/screening \/ diet \/ lab/i)).not.toBeInTheDocument()
  })
})
