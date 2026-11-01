import { describe, it, expect, vi, beforeEach } from 'vitest'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { ReactNode } from 'react'
import type { DoctorEntity } from '@/types/doctor.types'
import CampDoctorSearchPicker from './CampDoctorSearchPicker'

vi.mock('@/features/doctors/doctors.service', () => ({
  doctorsService: {
    searchDoctors: vi.fn(),
  },
}))

function doctorFixture(overrides: Partial<DoctorEntity> = {}): DoctorEntity {
  return {
    id: 'doc-1', pharmaCode: 'DOC-1', name: 'Dr. Priya Sharma', specialization: 'cp',
    mobile: '9876543210', email: 'p@example.com', location: null,
    division: 'div-1', createdAt: '', updatedAt: '', ...overrides,
  } as DoctorEntity
}

function makeWrapper() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  )
}

function renderPicker(props: Partial<React.ComponentProps<typeof CampDoctorSearchPicker>> = {}) {
  const Wrapper = makeWrapper()
  return render(
    <Wrapper>
      <CampDoctorSearchPicker value="" label="" division="div-1" onChange={vi.fn()} {...props} />
    </Wrapper>,
  )
}

describe('CampDoctorSearchPicker — platform-side, plain division-scoped search (NOT distance-sorted)', () => {
  beforeEach(async () => {
    vi.resetAllMocks()
    const { doctorsService } = await import('@/features/doctors/doctors.service')
    vi.mocked(doctorsService.searchDoctors).mockResolvedValue({
      success: true, message: '', data: { items: [doctorFixture()], count: 1 },
    })
  })

  it('shows a "Select a division first" placeholder when no division is given', () => {
    renderPicker({ division: undefined })

    expect(screen.getByPlaceholderText('Select a division first')).toBeInTheDocument()
  })

  it('never fires a search while no division is set, even after typing', async () => {
    const { doctorsService } = await import('@/features/doctors/doctors.service')
    const user = userEvent.setup()
    renderPicker({ division: undefined })

    await user.type(screen.getByPlaceholderText('Select a division first'), 'Priya')
    await new Promise((resolve) => setTimeout(resolve, 400))

    expect(doctorsService.searchDoctors).not.toHaveBeenCalled()
  })

  it('never fires a search while the query is empty, even with a division set', async () => {
    const { doctorsService } = await import('@/features/doctors/doctors.service')
    renderPicker()

    await new Promise((resolve) => setTimeout(resolve, 400))

    expect(doctorsService.searchDoctors).not.toHaveBeenCalled()
  })

  it('debounces and calls searchDoctors with BOTH name and division once a division is set and text is typed', async () => {
    const { doctorsService } = await import('@/features/doctors/doctors.service')
    const user = userEvent.setup()
    renderPicker()

    await user.type(screen.getByPlaceholderText('Search doctor by name…'), 'Priya')

    await waitFor(() =>
      expect(doctorsService.searchDoctors).toHaveBeenCalledWith(
        expect.objectContaining({ name: 'Priya', division: 'div-1' }),
      ),
    )
    expect(await screen.findByText(/Dr\. Priya Sharma \(DOC-1\)/)).toBeInTheDocument()
  })

  it('scopes the search to whichever division is currently passed in', async () => {
    const { doctorsService } = await import('@/features/doctors/doctors.service')
    const user = userEvent.setup()
    renderPicker({ division: 'div-2' })

    await user.type(screen.getByPlaceholderText('Search doctor by name…'), 'Priya')

    await waitFor(() => expect(doctorsService.searchDoctors).toHaveBeenCalledWith(
      expect.objectContaining({ name: 'Priya', division: 'div-2' }),
    ))
  })

  it('shows "No matching doctors found." when the division-scoped search returns nothing', async () => {
    const { doctorsService } = await import('@/features/doctors/doctors.service')
    vi.mocked(doctorsService.searchDoctors).mockResolvedValue({
      success: true, message: '', data: { items: [], count: 0 },
    })
    const user = userEvent.setup()
    renderPicker()

    await user.type(screen.getByPlaceholderText('Search doctor by name…'), 'zzz-no-match')

    expect(await screen.findByText('No matching doctors found.')).toBeInTheDocument()
  })

  it('surfaces a search failure with a working Retry, not a silent/empty result', async () => {
    const { doctorsService } = await import('@/features/doctors/doctors.service')
    vi.mocked(doctorsService.searchDoctors)
      .mockRejectedValueOnce(new Error('network'))
      .mockResolvedValue({ success: true, message: '', data: { items: [doctorFixture()], count: 1 } })
    const user = userEvent.setup()
    renderPicker()

    await user.type(screen.getByPlaceholderText('Search doctor by name…'), 'Priya')

    const retryButton = await screen.findByRole('button', { name: /retry/i })
    expect(screen.getByText("Couldn't search doctors. Try again.")).toBeInTheDocument()

    await user.click(retryButton)

    expect(await screen.findByText(/Dr\. Priya Sharma/)).toBeInTheDocument()
    expect(doctorsService.searchDoctors).toHaveBeenCalledTimes(2)
  })

  it('selecting a doctor calls onChange with its id and label', async () => {
    const onChange = vi.fn()
    const user = userEvent.setup()
    renderPicker({ onChange })

    await user.type(screen.getByPlaceholderText('Search doctor by name…'), 'Priya')
    const option = await screen.findByText(/Dr\. Priya Sharma/)
    await user.click(option)

    expect(onChange).toHaveBeenCalledWith('doc-1', 'Dr. Priya Sharma (DOC-1)')
  })

  it('respects the disabled prop regardless of division state', () => {
    renderPicker({ disabled: true })

    expect(screen.getByPlaceholderText('Search doctor by name…')).toBeDisabled()
  })
})
