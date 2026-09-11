import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import ChipPicker from '@/components/ui/ChipPicker'

const OPTIONS = ['Alpha', 'Beta', 'Gamma']

describe('ChipPicker', () => {
  it('ArrowDown/ArrowUp move the highlight and Enter selects the highlighted option', async () => {
    const onChange = vi.fn()
    const user = userEvent.setup()

    render(<ChipPicker options={OPTIONS} selected={[]} onChange={onChange} />)

    await user.click(screen.getByRole('button', { name: /select to add/i }))
    const search = await screen.findByPlaceholderText('Search...')

    // Starts on the first option (Alpha); one ArrowDown moves to Beta.
    await user.type(search, '{ArrowDown}')
    await user.type(search, '{Enter}')

    expect(onChange).toHaveBeenCalledWith(['Beta'])
  })

  it('ArrowUp wraps from the first option to the last', async () => {
    const onChange = vi.fn()
    const user = userEvent.setup()

    render(<ChipPicker options={OPTIONS} selected={[]} onChange={onChange} />)

    await user.click(screen.getByRole('button', { name: /select to add/i }))
    const search = await screen.findByPlaceholderText('Search...')

    await user.type(search, '{ArrowUp}')
    await user.type(search, '{Enter}')

    expect(onChange).toHaveBeenCalledWith(['Gamma'])
  })

  it('typing to filter resets the highlight back to the first visible option', async () => {
    const onChange = vi.fn()
    const user = userEvent.setup()

    render(<ChipPicker options={OPTIONS} selected={[]} onChange={onChange} />)

    await user.click(screen.getByRole('button', { name: /select to add/i }))
    const search = await screen.findByPlaceholderText('Search...')

    // Move highlight to Beta, then filter to just "Gamma" — Enter should pick
    // Gamma (the new first/only visible item), not a stale index into Beta.
    await user.type(search, '{ArrowDown}')
    await user.type(search, 'Gamma')
    await user.type(search, '{Enter}')

    expect(onChange).toHaveBeenCalledWith(['Gamma'])
  })

  it('closing and reopening the popover resets the highlight to the first option', async () => {
    const onChange = vi.fn()
    const user = userEvent.setup()

    render(<ChipPicker options={OPTIONS} selected={[]} onChange={onChange} />)

    await user.click(screen.getByRole('button', { name: /select to add/i }))
    let search = await screen.findByPlaceholderText('Search...')

    // Move highlight to Gamma (no typing — `query` stays '' the whole time,
    // so a naive "reset highlight when query changes" effect never refires).
    await user.type(search, '{ArrowDown}{ArrowDown}')
    await user.keyboard('{Escape}')

    await user.click(screen.getByRole('button', { name: /select to add/i }))
    search = await screen.findByPlaceholderText('Search...')
    await user.type(search, '{Enter}')

    expect(onChange).toHaveBeenCalledWith(['Alpha'])
  })
})
