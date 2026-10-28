import { describe, it, expect, vi, beforeEach } from 'vitest'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import ScreeningDetail from './ScreeningDetail'
import type { ScreeningEntity } from '@/features/clinical/screening/screening.types'

vi.mock('@/features/clinical/screening/screening.service', () => ({
  screeningService: {
    updateScreening: vi.fn(async () => ({ success: true, message: '', data: {} })),
    requestConsentOtp: vi.fn(async () => ({ success: true, message: '', data: { code: '004213' } })),
    verifyConsent: vi.fn(async () => ({ success: true, message: '', data: {} })),
  },
}))

vi.mock('@/features/clinical/screening/components/ScreeningStageHistoryList', () => ({ default: () => null }))
vi.mock('@/features/clinical/screening/components/ScreeningMoveStagePanel', () => ({ default: () => null }))

function makeQueryClient() {
  return new QueryClient({ defaultOptions: { queries: { retry: false } } })
}

function screeningFixture(overrides: Partial<ScreeningEntity> = {}): ScreeningEntity {
  return {
    id: 'scr-1',
    tenant: null,
    patient: { code: 'pat-000001', firstName: 'Jane', middleName: null, lastName: 'Doe', mobile: '9999999999' } as never,
    camp: null,
    performedBy: null,
    symptoms: [],
    referral: false,
    consent: null,
    status: 'pending',
    stageHistory: [],
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    ...overrides,
  }
}

function renderDetail(overrides: Partial<ScreeningEntity> = {}) {
  const queryClient = makeQueryClient()
  const screening = screeningFixture(overrides)
  return render(
    <QueryClientProvider client={queryClient}>
      <ScreeningDetail screening={screening} canWrite canMoveStage={false} onClose={vi.fn()} />
    </QueryClientProvider>,
  )
}

describe('ScreeningDetail', () => {
  beforeEach(() => {
    vi.resetAllMocks()
  })

  it('regression (QUP-411 S2): messy comma input is both submitted AND displayed cleaned after save, not left showing the raw typed text', async () => {
    const { screeningService } = await import('@/features/clinical/screening/screening.service')
    vi.mocked(screeningService.updateScreening).mockResolvedValue({ success: true, message: '', data: {} } as never)
    const user = userEvent.setup()

    renderDetail()

    const textarea = screen.getByPlaceholderText(/comma-separated/i)
    await user.clear(textarea)
    await user.type(textarea, 'fever, , cough,,')
    await user.click(screen.getByRole('button', { name: /save changes/i }))

    // Submitted payload is cleaned.
    await vi.waitFor(() => {
      expect(screeningService.updateScreening).toHaveBeenCalledWith('scr-1', { symptoms: ['fever', 'cough'], referral: false })
    })
    // The textarea itself must also re-sync to the cleaned value — not keep showing the raw typed text.
    await vi.waitFor(() => expect(textarea).toHaveValue('fever, cough'))
  })

  it('initializes the textarea from the screening\'s existing symptoms, comma+space joined', () => {
    renderDetail({ symptoms: ['fatigue', 'frequent thirst'] })
    expect(screen.getByPlaceholderText(/comma-separated/i)).toHaveValue('fatigue, frequent thirst')
  })

  it('regression: a delayed save response does not clobber a newer, unsaved edit typed while the request was in flight', async () => {
    const { screeningService } = await import('@/features/clinical/screening/screening.service')
    let resolveUpdate: (v: unknown) => void = () => {}
    vi.mocked(screeningService.updateScreening).mockReturnValueOnce(
      new Promise((resolve) => { resolveUpdate = resolve }) as never,
    )
    const user = userEvent.setup()

    renderDetail()

    const textarea = screen.getByPlaceholderText(/comma-separated/i)
    await user.type(textarea, 'fever')
    await user.click(screen.getByRole('button', { name: /save changes/i }))

    // The textarea stays editable while the request is in flight — type a further, unsaved edit.
    await user.type(textarea, ', cough')
    expect(textarea).toHaveValue('fever, cough')

    // The stale response for the FIRST save now lands.
    resolveUpdate({ success: true, message: '', data: {} })
    // Give the mutation's own onSuccess a tick to run before asserting the textarea's final value.
    await vi.waitFor(() => expect(screen.getByRole('button', { name: /save changes/i })).toBeEnabled())

    // The newer, unsaved text must survive — not get overwritten back to the first save's snapshot.
    expect(textarea).toHaveValue('fever, cough')
  })

  describe('consent', () => {
    it('shows "Verified" and no OTP controls once consent.verified is true', () => {
      renderDetail({ consent: { verified: true } })

      expect(screen.getByText('Verified')).toBeInTheDocument()
      expect(screen.queryByRole('button', { name: /send otp/i })).not.toBeInTheDocument()
    })

    it('shows the Send OTP action when consent is unverified and canWrite', () => {
      renderDetail({ consent: { verified: false } })

      expect(screen.getByText('Not yet verified')).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /^send otp$/i })).toBeInTheDocument()
    })

    it('hides every consent action when canWrite is false, even while unverified', () => {
      const queryClient = makeQueryClient()
      const screening = screeningFixture({ consent: { verified: false } })
      render(
        <QueryClientProvider client={queryClient}>
          <ScreeningDetail screening={screening} canWrite={false} canMoveStage={false} onClose={vi.fn()} />
        </QueryClientProvider>,
      )

      expect(screen.getByText('Not yet verified')).toBeInTheDocument()
      expect(screen.queryByRole('button', { name: /send otp/i })).not.toBeInTheDocument()
    })

    it('requesting an OTP shows the TEMP code inline (no delivery sender exists yet) and relabels the button to Resend', async () => {
      const { screeningService } = await import('@/features/clinical/screening/screening.service')
      const user = userEvent.setup()
      renderDetail({ consent: { verified: false } })

      await user.click(screen.getByRole('button', { name: /^send otp$/i }))

      expect(screeningService.requestConsentOtp).toHaveBeenCalledWith('scr-1')
      expect(await screen.findByText('004213')).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /^resend otp$/i })).toBeInTheDocument()
    })

    it('Verify is disabled until a code is typed, then calls verifyConsent with it', async () => {
      const { screeningService } = await import('@/features/clinical/screening/screening.service')
      const user = userEvent.setup()
      renderDetail({ consent: { verified: false } })

      expect(screen.getByRole('button', { name: /^verify$/i })).toBeDisabled()

      await user.type(screen.getByPlaceholderText(/6-digit code/i), '004213')
      expect(screen.getByRole('button', { name: /^verify$/i })).toBeEnabled()

      await user.click(screen.getByRole('button', { name: /^verify$/i }))
      expect(screeningService.verifyConsent).toHaveBeenCalledWith('scr-1', { otp: '004213' })
    })

    it('clears the typed code after a successful verify', async () => {
      const user = userEvent.setup()
      renderDetail({ consent: { verified: false } })

      const otpInput = screen.getByPlaceholderText(/6-digit code/i)
      await user.type(otpInput, '004213')
      await user.click(screen.getByRole('button', { name: /^verify$/i }))

      await vi.waitFor(() => expect(otpInput).toHaveValue(''))
    })

    it('shows the backend\'s own error message on a failed verify (e.g. wrong code), not a generic one', async () => {
      const { screeningService } = await import('@/features/clinical/screening/screening.service')
      vi.mocked(screeningService.verifyConsent).mockRejectedValueOnce({
        response: { data: { message: "That code didn't match. Try again." } },
      })
      const user = userEvent.setup()
      renderDetail({ consent: { verified: false } })

      await user.type(screen.getByPlaceholderText(/6-digit code/i), '000000')
      await user.click(screen.getByRole('button', { name: /^verify$/i }))

      expect(await screen.findByText(/that code didn.t match/i)).toBeInTheDocument()
    })

    it('shows a visible error when requesting the OTP itself fails', async () => {
      const { screeningService } = await import('@/features/clinical/screening/screening.service')
      vi.mocked(screeningService.requestConsentOtp).mockRejectedValueOnce(new Error('network error'))
      const user = userEvent.setup()
      renderDetail({ consent: { verified: false } })

      await user.click(screen.getByRole('button', { name: /^send otp$/i }))

      expect(await screen.findByText(/couldn.t send the otp/i)).toBeInTheDocument()
    })
  })
})
