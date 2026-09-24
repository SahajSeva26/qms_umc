import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import StartOverUploadDialog from './StartOverUploadDialog'

describe('StartOverUploadDialog', () => {
  it('renders the exact title and body copy when open', () => {
    render(<StartOverUploadDialog open onOpenChange={vi.fn()} onConfirm={vi.fn()} />)
    expect(screen.getByText('Start a new upload?')).toBeInTheDocument()
    expect(screen.getByText("We'll discard this failed attempt and create a fresh upload link.")).toBeInTheDocument()
  })

  it('renders nothing when not open', () => {
    render(<StartOverUploadDialog open={false} onOpenChange={vi.fn()} onConfirm={vi.fn()} />)
    expect(screen.queryByText('Start a new upload?')).not.toBeInTheDocument()
  })

  it('Cancel always calls onOpenChange(false), never onConfirm', async () => {
    const onOpenChange = vi.fn()
    const onConfirm = vi.fn()
    const user = userEvent.setup()
    render(<StartOverUploadDialog open onOpenChange={onOpenChange} onConfirm={onConfirm} />)

    await user.click(screen.getByRole('button', { name: /cancel/i }))
    expect(onOpenChange).toHaveBeenCalledWith(false)
    expect(onConfirm).not.toHaveBeenCalled()
  })

  it('the confirm button calls onConfirm exactly once', async () => {
    const onConfirm = vi.fn()
    const user = userEvent.setup()
    render(<StartOverUploadDialog open onOpenChange={vi.fn()} onConfirm={onConfirm} />)

    await user.click(screen.getByRole('button', { name: /start new upload/i }))
    expect(onConfirm).toHaveBeenCalledTimes(1)
  })

  it('isSubmitting disables the confirm button', () => {
    render(<StartOverUploadDialog open onOpenChange={vi.fn()} onConfirm={vi.fn()} isSubmitting />)
    expect(screen.getByRole('button', { name: /start new upload/i })).toBeDisabled()
  })
})
