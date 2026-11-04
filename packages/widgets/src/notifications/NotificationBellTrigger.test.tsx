import { createRef } from 'react'
import { describe, it, expect, vi, afterEach } from 'vitest'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen, waitFor } from '@testing-library/react'
import type { AxiosInstance } from 'axios'
import NotificationBellTrigger from './NotificationBellTrigger'

function makeQueryClient() {
  return new QueryClient({ defaultOptions: { queries: { retry: false } } })
}

function mockApi(count: number | 'error' = 0): AxiosInstance {
  return {
    get: vi.fn().mockImplementation(() =>
      count === 'error'
        ? Promise.reject(new Error('network error'))
        : Promise.resolve({ data: { success: true, message: '', data: { count, items: [] } } }),
    ),
  } as unknown as AxiosInstance
}

function renderTrigger(api: AxiosInstance, props?: { open?: boolean; onClick?: () => void }) {
  return render(
    <QueryClientProvider client={makeQueryClient()}>
      <NotificationBellTrigger
        ref={createRef()}
        api={api}
        open={props?.open ?? false}
        onClick={props?.onClick ?? vi.fn()}
      />
    </QueryClientProvider>,
  )
}

describe('NotificationBellTrigger — eager, lightweight (no @base-ui dependency)', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('renders immediately, before the count query resolves — never a missing bell', () => {
    const api = mockApi(0)
    renderTrigger(api)

    // Synchronous assertion, no await/findBy — the bell must be in the DOM the instant this
    // component mounts, independent of the network call's timing.
    expect(screen.getByRole('button', { name: /notifications/i })).toBeInTheDocument()
  })

  it('shows no badge when the unread count is zero', async () => {
    const api = mockApi(0)
    renderTrigger(api)

    await waitFor(() => expect(api.get).toHaveBeenCalled())
    expect(screen.queryByLabelText('Unread count unavailable')).not.toBeInTheDocument()
  })

  it('shows the unread badge once the count resolves positive', async () => {
    const api = mockApi(3)
    const { container } = renderTrigger(api)

    await waitFor(() => expect(api.get).toHaveBeenCalled())
    await waitFor(() => expect(container.querySelector('[style*="qms-role-super-admin"]')).toBeTruthy())
  })

  it('shows an "unavailable" badge (not a confirmed-zero state) when the count query fails', async () => {
    const api = mockApi('error')
    renderTrigger(api)

    expect(await screen.findByLabelText('Unread count unavailable')).toBeInTheDocument()
  })

  it('calls onClick and reflects open/expanded accessibility state', async () => {
    const onClick = vi.fn()
    const api = mockApi(0)
    const { rerender } = renderTrigger(api, { open: false, onClick })

    const button = screen.getByRole('button', { name: /notifications/i })
    expect(button).toHaveAttribute('aria-haspopup', 'dialog')
    expect(button).toHaveAttribute('aria-expanded', 'false')

    button.click()
    expect(onClick).toHaveBeenCalledTimes(1)

    rerender(
      <QueryClientProvider client={makeQueryClient()}>
        <NotificationBellTrigger ref={createRef()} api={api} open onClick={onClick} />
      </QueryClientProvider>,
    )
    expect(screen.getByRole('button', { name: /notifications/i })).toHaveAttribute('aria-expanded', 'true')
  })
})
