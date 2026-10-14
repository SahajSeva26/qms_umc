import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { useLogin } from '../hooks/useLogin'
import { useServerHealth } from '@/hooks/useServerHealth'
import { AUTH_ROUTES } from '@/features/auth/auth.paths'
import LoginForm from './LoginForm'

vi.mock('../hooks/useLogin')
vi.mock('@/hooks/useServerHealth')

const navigateMock = vi.fn()
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom')
  return { ...actual, useNavigate: () => navigateMock }
})

function mockLogin(loginImpl: (values: unknown, opts: { onSuccess?: () => void; onError?: (err: unknown) => void }) => void) {
  vi.mocked(useLogin).mockReturnValue({
    mutate: loginImpl,
    isPending: false,
    error: null,
    reset: vi.fn(),
  } as unknown as ReturnType<typeof useLogin>)
}

function renderForm() {
  return render(
    <MemoryRouter>
      <LoginForm />
    </MemoryRouter>,
  )
}

async function fillAndSubmit() {
  const user = userEvent.setup()
  await user.type(screen.getByPlaceholderText('you@qms.health'), 'a@example.com')
  await user.type(screen.getByPlaceholderText('••••••••'), 'password123')
  await user.click(screen.getByRole('button', { name: /sign in/i }))
  return user
}

describe('LoginForm — post-login destination', () => {
  beforeEach(() => {
    vi.resetAllMocks()
    vi.mocked(useServerHealth).mockReturnValue({ checkHealth: vi.fn(), isChecking: false } as unknown as ReturnType<typeof useServerHealth>)
  })

  it('navigates every successful login to the resolver route, not a hard-coded destination', async () => {
    mockLogin((_values, opts) => opts.onSuccess?.())
    renderForm()

    await fillAndSubmit()

    expect(navigateMock).toHaveBeenCalledWith(AUTH_ROUTES.CONTINUE, { replace: true })
    // No second session fetch from this component — AuthContinuePage owns resolving the destination.
  })

  it('shows the server-unavailable screen when login gets no HTTP response, without navigating', async () => {
    // isServerUnreachable requires axios.isAxiosError(err) true AND no `response` — a timeout/DNS/refused case.
    mockLogin((_values, opts) => opts.onError?.({ isAxiosError: true, message: 'Network Error', response: undefined }))
    renderForm()

    await fillAndSubmit()

    expect(navigateMock).not.toHaveBeenCalled()
    expect(screen.getByText(/couldn't reach|can't reach|unavailable/i)).toBeInTheDocument()
  })
})
