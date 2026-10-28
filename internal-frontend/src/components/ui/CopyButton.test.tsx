import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { toast } from '@/components/ui/sonner'
import CopyButton from './CopyButton'

vi.mock('@/components/ui/sonner', () => ({
  toast: { error: vi.fn(), success: vi.fn() },
}))

// jsdom exposes navigator.clipboard as a getter-only property — Object.assign
// can't overwrite it, so each test redefines it directly.
const setClipboard = (clipboard: { writeText: (v: string) => Promise<void> } | undefined) => {
  Object.defineProperty(navigator, 'clipboard', { value: clipboard, configurable: true })
}

describe('CopyButton', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('copies the value and shows a labeled success toast', async () => {
    const user = userEvent.setup()
    const writeText = vi.fn().mockResolvedValue(undefined)
    setClipboard({ writeText })

    render(<CopyButton value="cmp-000014" label="Code" />)
    await user.click(screen.getByRole('button', { name: 'Copy code' }))

    expect(writeText).toHaveBeenCalledWith('cmp-000014')
    await waitFor(() => expect(toast.success).toHaveBeenCalledWith('Code copied'))
    expect(toast.error).not.toHaveBeenCalled()
  })

  it('shows a generic "Copied" toast when no label is given', async () => {
    const user = userEvent.setup()
    const writeText = vi.fn().mockResolvedValue(undefined)
    setClipboard({ writeText })

    render(<CopyButton value="some-value" />)
    await user.click(screen.getByRole('button', { name: 'Copy' }))

    await waitFor(() => expect(toast.success).toHaveBeenCalledWith('Copied'))
  })

  it('shows an error toast instead of a false success when the clipboard write rejects', async () => {
    const user = userEvent.setup()
    const writeText = vi.fn().mockRejectedValue(new Error('denied'))
    setClipboard({ writeText })

    render(<CopyButton value="cmp-000014" label="Code" />)
    await user.click(screen.getByRole('button', { name: 'Copy code' }))

    await waitFor(() => expect(toast.error).toHaveBeenCalledWith("Couldn't copy code"))
    expect(toast.success).not.toHaveBeenCalled()
  })

  it('shows an error toast when the Clipboard API is unavailable', async () => {
    const user = userEvent.setup()
    setClipboard(undefined)

    render(<CopyButton value="cmp-000014" label="Code" />)
    await user.click(screen.getByRole('button', { name: 'Copy code' }))

    await waitFor(() => expect(toast.error).toHaveBeenCalledWith("Couldn't copy code"))
    expect(toast.success).not.toHaveBeenCalled()
  })

  it('stops click propagation so it never triggers a parent row click', async () => {
    const user = userEvent.setup()
    const writeText = vi.fn().mockResolvedValue(undefined)
    setClipboard({ writeText })
    const onRowClick = vi.fn()

    render(
      <div onClick={onRowClick}>
        <CopyButton value="cmp-000014" label="Code" />
      </div>,
    )
    await user.click(screen.getByRole('button', { name: 'Copy code' }))

    expect(onRowClick).not.toHaveBeenCalled()
  })
})
