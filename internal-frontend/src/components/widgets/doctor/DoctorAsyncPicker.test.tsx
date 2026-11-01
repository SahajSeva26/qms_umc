import { describe, it, expect, vi, beforeEach } from 'vitest'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import DoctorAsyncPicker from './DoctorAsyncPicker'

const searchDoctors = vi.fn<(query: unknown) => Promise<{ success: boolean; message: string; data: { items: unknown[]; count: number } }>>()

vi.mock('@/features/doctors/doctors.service', () => ({
  doctorsService: { searchDoctors: (query: unknown) => searchDoctors(query) },
}))

function makeQueryClient() {
  return new QueryClient({ defaultOptions: { queries: { retry: false } } })
}

describe('DoctorAsyncPicker', () => {
  beforeEach(() => {
    vi.resetAllMocks()
    searchDoctors.mockResolvedValue({ success: true, message: '', data: { items: [], count: 0 } })
  })

  it('does not fetch on open with an empty query, and shows a prompt to type instead', async () => {
    const user = userEvent.setup()
    render(
      <QueryClientProvider client={makeQueryClient()}>
        <DoctorAsyncPicker value="" label="" onChange={vi.fn()} />
      </QueryClientProvider>,
    )

    await user.click(screen.getByPlaceholderText(/search doctor by name/i))

    expect(await screen.findByText(/type a doctor name to search/i)).toBeInTheDocument()
    expect(searchDoctors).not.toHaveBeenCalled()
  })

  it('searches doctors by the typed name', async () => {
    const user = userEvent.setup()
    render(
      <QueryClientProvider client={makeQueryClient()}>
        <DoctorAsyncPicker value="" label="" onChange={vi.fn()} />
      </QueryClientProvider>,
    )

    await user.type(screen.getByPlaceholderText(/search doctor by name/i), 'Mehta')

    await vi.waitFor(() =>
      expect(searchDoctors).toHaveBeenCalledWith(expect.objectContaining({ name: 'Mehta' })),
    )
  })

  it('selecting a result calls onChange with the doctor id and label', async () => {
    searchDoctors.mockResolvedValue({
      success: true,
      message: '',
      data: { count: 1, items: [{ id: 'doc-1', name: 'Dr. Mehta', pharmaCode: 'PH-100' }] },
    })
    const user = userEvent.setup()
    const onChange = vi.fn()
    render(
      <QueryClientProvider client={makeQueryClient()}>
        <DoctorAsyncPicker value="" label="" onChange={onChange} />
      </QueryClientProvider>,
    )

    await user.type(screen.getByPlaceholderText(/search doctor by name/i), 'Mehta')
    const option = await screen.findByText('Dr. Mehta (PH-100)')
    await user.click(option)

    expect(onChange).toHaveBeenCalledWith('doc-1', 'Dr. Mehta (PH-100)')
  })

  it('shows "No matching doctors found" when the search comes back empty', async () => {
    const user = userEvent.setup()
    render(
      <QueryClientProvider client={makeQueryClient()}>
        <DoctorAsyncPicker value="" label="" onChange={vi.fn()} />
      </QueryClientProvider>,
    )

    await user.type(screen.getByPlaceholderText(/search doctor by name/i), 'Zzzz')

    expect(await screen.findByText(/no matching doctors found/i)).toBeInTheDocument()
  })

  it('shows an error state with a working Retry on a failed search, instead of silently reading as "no results"', async () => {
    searchDoctors.mockRejectedValue(new Error('network error'))
    const user = userEvent.setup()
    render(
      <QueryClientProvider client={makeQueryClient()}>
        <DoctorAsyncPicker value="" label="" onChange={vi.fn()} />
      </QueryClientProvider>,
    )

    await user.type(screen.getByPlaceholderText(/search doctor by name/i), 'Mehta')

    expect(await screen.findByText(/couldn't search doctors/i)).toBeInTheDocument()
    expect(screen.queryByText(/no matching doctors found/i)).not.toBeInTheDocument()

    searchDoctors.mockResolvedValue({
      success: true,
      message: '',
      data: { count: 1, items: [{ id: 'doc-1', name: 'Dr. Mehta', pharmaCode: 'PH-100' }] },
    })
    await user.click(screen.getByRole('button', { name: /retry/i }))

    expect(await screen.findByText('Dr. Mehta (PH-100)')).toBeInTheDocument()
  })
})
