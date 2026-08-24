import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import PasswordInput from '@/components/ui/PasswordInput'

describe('PasswordInput', () => {
  it('toggle is keyboard-reachable and reflects visibility via aria-pressed', async () => {
    const user = userEvent.setup()
    render(<PasswordInput aria-label="password" />)

    const input = screen.getByLabelText('password')
    expect(input).toHaveAttribute('type', 'password')

    const toggle = screen.getByRole('button', { name: /show password/i })
    expect(toggle).toHaveAttribute('aria-pressed', 'false')
    expect(toggle).not.toHaveAttribute('tabindex', '-1')

    // Tab from the input must reach the toggle next — proves it's in the
    // natural tab order, not skipped via tabIndex={-1}.
    await user.tab()
    expect(input).toHaveFocus()
    await user.tab()
    expect(toggle).toHaveFocus()

    // Activate via keyboard (Enter), not a mouse click.
    await user.keyboard('{Enter}')
    expect(input).toHaveAttribute('type', 'text')
    expect(screen.getByRole('button', { name: /hide password/i })).toHaveAttribute('aria-pressed', 'true')
  })
})
