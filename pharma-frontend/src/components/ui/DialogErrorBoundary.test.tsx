import { describe, it, expect, vi, afterEach } from 'vitest'
import { Suspense, lazy, useState } from 'react'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import DialogErrorBoundary from './DialogErrorBoundary'

function Thrower({ shouldThrow }: { shouldThrow: boolean }) {
  if (shouldThrow) throw new Error('boom')
  return <div>Dialog content</div>
}

describe('DialogErrorBoundary', () => {
  const originalLocation = window.location

  afterEach(() => {
    Object.defineProperty(window, 'location', { value: originalLocation, writable: true, configurable: true })
  })

  it('renders children normally when nothing throws', () => {
    render(
      <DialogErrorBoundary onClose={vi.fn()}>
        <Thrower shouldThrow={false} />
      </DialogErrorBoundary>,
    )

    expect(screen.getByText('Dialog content')).toBeInTheDocument()
  })

  it('catches a render error and shows it in a real accessible dialog shell, not a bare div', () => {
    const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

    render(
      <DialogErrorBoundary onClose={vi.fn()}>
        <Thrower shouldThrow />
      </DialogErrorBoundary>,
    )

    expect(screen.getByRole('dialog')).toBeInTheDocument()
    expect(screen.getByText(/something went wrong/i)).toBeInTheDocument()
    expect(screen.getByText(/this dialog couldn't be displayed/i)).toBeInTheDocument()
    expect(screen.queryByText('Dialog content')).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: /try again/i })).toBeInTheDocument()

    consoleErrorSpy.mockRestore()
  })

  it('"Try again" re-mounts children so a since-fixed error state recovers', async () => {
    const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    const user = userEvent.setup()

    function FlakyOnce() {
      return <Thrower shouldThrow />
    }

    const { rerender } = render(
      <DialogErrorBoundary onClose={vi.fn()}>
        <FlakyOnce />
      </DialogErrorBoundary>,
    )
    expect(screen.getByText(/something went wrong/i)).toBeInTheDocument()

    // Swap in a non-throwing child before retrying — "Try again" clears the boundary's own
    // internal hasError state; it can't make the previously-thrown render magically succeed.
    rerender(
      <DialogErrorBoundary onClose={vi.fn()}>
        <Thrower shouldThrow={false} />
      </DialogErrorBoundary>,
    )
    await user.click(screen.getByRole('button', { name: /try again/i }))

    expect(screen.getByText('Dialog content')).toBeInTheDocument()
    consoleErrorSpy.mockRestore()
  })

  it('closing the fallback (via its Close button) calls onClose, so the parent is no longer stuck in "dialog open" state', async () => {
    const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    const onClose = vi.fn()
    const user = userEvent.setup()

    // Mirrors a real call site: the parent owns an `open` boolean and conditionally renders
    // DialogErrorBoundary on it (e.g. `{openCamp && <DialogErrorBoundary onClose={...}>}`).
    // Before this fix, a crash left the parent's own `open` state true forever since nothing
    // ever called back into it — this proves onClose is now that callback.
    function Parent() {
      const [open, setOpen] = useState(true)
      if (!open) return <div>Closed</div>
      return (
        <DialogErrorBoundary onClose={() => { onClose(); setOpen(false) }}>
          <Thrower shouldThrow />
        </DialogErrorBoundary>
      )
    }

    render(<Parent />)
    expect(screen.getByRole('dialog')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: /^close$/i }))

    expect(onClose).toHaveBeenCalledTimes(1)
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
    expect(screen.getByText('Closed')).toBeInTheDocument()
    consoleErrorSpy.mockRestore()
  })

  it('a failed lazy(() => import(...)) shows Reload application, not a no-op Try again — clearing boundary state cannot re-run a cached rejected import()', async () => {
    const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    const reloadSpy = vi.fn()
    Object.defineProperty(window, 'location', {
      value: { ...originalLocation, reload: reloadSpy },
      writable: true,
      configurable: true,
    })

    const BrokenChunk = lazy(() =>
      Promise.reject(new Error('Failed to fetch dynamically imported module: /assets/broken-DEADBEEF.js')),
    )
    const user = userEvent.setup()

    render(
      <DialogErrorBoundary onClose={vi.fn()}>
        <Suspense fallback={null}>
          <BrokenChunk />
        </Suspense>
      </DialogErrorBoundary>,
    )

    expect(await screen.findByText(/updated since you loaded this page/i)).toBeInTheDocument()
    const reloadButton = screen.getByRole('button', { name: /reload application/i })
    expect(screen.queryByRole('button', { name: /try again/i })).not.toBeInTheDocument()

    await user.click(reloadButton)
    expect(reloadSpy).toHaveBeenCalledTimes(1)

    consoleErrorSpy.mockRestore()
  })
})
