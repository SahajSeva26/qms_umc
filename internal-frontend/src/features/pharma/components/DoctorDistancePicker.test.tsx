import { describe, it, expect, vi, beforeEach } from 'vitest'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { ReactNode } from 'react'
import type { AxiosError } from 'axios'
import type { DoctorEntity } from '@/types/doctor.types'
import DoctorDistancePicker from './DoctorDistancePicker'

vi.mock('@/features/doctors/doctors.service', () => ({
  doctorsService: {
    nearestDoctors: vi.fn(),
  },
}))

function doctorFixture(overrides: Partial<DoctorEntity> = {}): DoctorEntity {
  return {
    id: 'doc-1', pharmaCode: 'DOC-1', name: 'Dr. Priya Sharma', specialization: 'cp',
    mobile: '9876543210', email: 'p@example.com', location: null,
    division: 'div-1', distanceMeters: 12000, createdAt: '', updatedAt: '', ...overrides,
  } as DoctorEntity
}

function axiosError(status: number, message = 'error'): AxiosError {
  const err = new Error('request failed') as AxiosError
  err.isAxiosError = true
  err.response = { status, data: { message }, statusText: '', headers: {}, config: {} as never }
  err.toJSON = () => ({})
  return err
}

function makeWrapper() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  )
}

const READY_PROPS = { coordinates: [77.02, 28.52] as [number, number] }

function renderPicker(props: Partial<React.ComponentProps<typeof DoctorDistancePicker>> = {}) {
  const Wrapper = makeWrapper()
  return render(
    <Wrapper>
      <DoctorDistancePicker value="" label="Doctor" onChange={vi.fn()} {...READY_PROPS} {...props} />
    </Wrapper>,
  )
}

describe('DoctorDistancePicker — pharma-side distance-sorted doctor lookup via /doctors/nearest', () => {
  beforeEach(async () => {
    vi.resetAllMocks()
    const { doctorsService } = await import('@/features/doctors/doctors.service')
    vi.mocked(doctorsService.nearestDoctors).mockResolvedValue({
      success: true, message: '', data: { items: [doctorFixture()], count: 1 },
    })
  })

  it('is disabled with a "Pick a location first" placeholder when no coordinates are given', () => {
    renderPicker({ coordinates: undefined })

    expect(screen.getByPlaceholderText('Pick a location first')).toBeDisabled()
  })

  it('never calls nearestDoctors while the dropdown is closed, even with coordinates present', async () => {
    const { doctorsService } = await import('@/features/doctors/doctors.service')
    renderPicker()

    await new Promise((resolve) => setTimeout(resolve, 50))

    expect(doctorsService.nearestDoctors).not.toHaveBeenCalled()
  })

  it('calls nearestDoctors with coordinates once the dropdown opens (no division param — the backend derives it server-side), and renders the doctor with distance', async () => {
    const { doctorsService } = await import('@/features/doctors/doctors.service')
    const user = userEvent.setup()
    renderPicker()

    await user.click(screen.getByPlaceholderText('Search doctor by name…'))

    await waitFor(() =>
      expect(doctorsService.nearestDoctors).toHaveBeenCalledWith(
        expect.objectContaining({ lng: 77.02, lat: 28.52 }),
      ),
    )
    const [calledQuery] = vi.mocked(doctorsService.nearestDoctors).mock.calls[0]
    expect(calledQuery).not.toHaveProperty('division')
    expect(await screen.findByText(/Dr\. Priya Sharma \(DOC-1\) — 12\.0 km/)).toBeInTheDocument()
  })

  it('client-side filters the fetched results by typed name — no server round trip for text search', async () => {
    const { doctorsService } = await import('@/features/doctors/doctors.service')
    vi.mocked(doctorsService.nearestDoctors).mockResolvedValue({
      success: true,
      message: '',
      data: {
        items: [doctorFixture(), doctorFixture({ id: 'doc-2', pharmaCode: 'DOC-2', name: 'Dr. Rohan Mehta', distanceMeters: 20000 })],
        count: 2,
      },
    })

    const user = userEvent.setup()
    renderPicker()
    await user.click(screen.getByPlaceholderText('Search doctor by name…'))
    await screen.findByText(/Dr\. Priya Sharma/)
    expect(screen.getByText(/Dr\. Rohan Mehta/)).toBeInTheDocument()

    await user.type(screen.getByPlaceholderText('Search doctor by name…'), 'priya')

    await waitFor(() => expect(screen.queryByText(/Dr\. Rohan Mehta/)).not.toBeInTheDocument())
    expect(screen.getByText(/Dr\. Priya Sharma/)).toBeInTheDocument()
    expect(doctorsService.nearestDoctors).toHaveBeenCalledTimes(1)
  })

  it('surfaces the REAL API error message on a 403 — not a hardcoded "no division" string, since a 403 can also mean a permissions/config drift', async () => {
    const { doctorsService } = await import('@/features/doctors/doctors.service')
    vi.mocked(doctorsService.nearestDoctors).mockRejectedValue(axiosError(403, 'Your account is not assigned to a division'))
    const user = userEvent.setup()
    renderPicker()

    await user.click(screen.getByPlaceholderText('Search doctor by name…'))

    expect(await screen.findByText('Your account is not assigned to a division')).toBeInTheDocument()
  })

  it('surfaces a distinct 403 message even when the real API text differs — e.g. a permissions/config drift, not just "no division"', async () => {
    const { doctorsService } = await import('@/features/doctors/doctors.service')
    vi.mocked(doctorsService.nearestDoctors).mockRejectedValue(axiosError(403, 'Forbidden: camp:book permission required'))
    const user = userEvent.setup()
    renderPicker()

    await user.click(screen.getByPlaceholderText('Search doctor by name…'))

    expect(await screen.findByText('Forbidden: camp:book permission required')).toBeInTheDocument()
    expect(screen.queryByText(/your account isn't assigned to a division/i)).not.toBeInTheDocument()
  })

  it('falls back to the generic search-failure message when a non-403 error carries no usable API message (e.g. a plain network error)', async () => {
    const { doctorsService } = await import('@/features/doctors/doctors.service')
    vi.mocked(doctorsService.nearestDoctors).mockRejectedValue(new Error('network'))
    const user = userEvent.setup()
    renderPicker()

    await user.click(screen.getByPlaceholderText('Search doctor by name…'))

    expect(await screen.findByText("Couldn't search doctors. Try again.")).toBeInTheDocument()
  })

  it('surfaces the REAL backend message on a non-403 error too (e.g. a 500) — never a flat hardcoded string when the server actually said something', async () => {
    const { doctorsService } = await import('@/features/doctors/doctors.service')
    vi.mocked(doctorsService.nearestDoctors).mockRejectedValue(axiosError(500, 'Internal doctor search failure — try again shortly'))
    const user = userEvent.setup()
    renderPicker()

    await user.click(screen.getByPlaceholderText('Search doctor by name…'))

    expect(await screen.findByText('Internal doctor search failure — try again shortly')).toBeInTheDocument()
    expect(screen.queryByText("Couldn't search doctors. Try again.")).not.toBeInTheDocument()
  })

  it('retry re-fires the query after a failure', async () => {
    const { doctorsService } = await import('@/features/doctors/doctors.service')
    vi.mocked(doctorsService.nearestDoctors)
      .mockRejectedValueOnce(new Error('network'))
      .mockResolvedValue({ success: true, message: '', data: { items: [doctorFixture()], count: 1 } })
    const user = userEvent.setup()
    renderPicker()

    await user.click(screen.getByPlaceholderText('Search doctor by name…'))
    const retryButton = await screen.findByRole('button', { name: /retry/i })
    await user.click(retryButton)

    expect(await screen.findByText(/Dr\. Priya Sharma/)).toBeInTheDocument()
    expect(doctorsService.nearestDoctors).toHaveBeenCalledTimes(2)
  })

  it('shows the truncation note only when the nearest result count equals the limit (20)', async () => {
    const { doctorsService } = await import('@/features/doctors/doctors.service')
    const twentyResults = Array.from({ length: 20 }, (_, i) => doctorFixture({ id: `doc-${i}`, pharmaCode: `DOC-${i}`, name: `Dr. Number ${i}` }))
    vi.mocked(doctorsService.nearestDoctors).mockResolvedValue({
      success: true, message: '', data: { items: twentyResults, count: 20 },
    })

    const user = userEvent.setup()
    renderPicker()
    await user.click(screen.getByPlaceholderText('Search doctor by name…'))

    expect(await screen.findByText(/some in-range doctors may not be listed/i)).toBeInTheDocument()
  })

  it('does not show the truncation note when the result count is below the limit', async () => {
    const user = userEvent.setup()
    renderPicker()
    await user.click(screen.getByPlaceholderText('Search doctor by name…'))
    await screen.findByText(/Dr\. Priya Sharma/)

    expect(screen.queryByText(/some in-range doctors may not be listed/i)).not.toBeInTheDocument()
  })

  it('selecting a doctor calls onChange with its id and label', async () => {
    const onChange = vi.fn()
    const user = userEvent.setup()
    renderPicker({ onChange })

    await user.click(screen.getByPlaceholderText('Search doctor by name…'))
    const option = await screen.findByText(/Dr\. Priya Sharma/)
    await user.click(option)

    expect(onChange).toHaveBeenCalledWith('doc-1', 'Dr. Priya Sharma (DOC-1)')
  })
})
