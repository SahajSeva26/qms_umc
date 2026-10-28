import { useRef, useState } from 'react'
import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import AsyncPicker from './AsyncPicker'

interface Item { id: string; name: string }

function Harness({ results, dropdownClassName, isResultDisabled }: { results: Item[]; dropdownClassName?: string; isResultDisabled?: (r: Item) => boolean }) {
  const [value, setValue] = useState('')
  const [label, setLabel] = useState('')
  const [query, setQuery] = useState('')
  const [open, setOpen] = useState(true)
  const containerRef = useRef<HTMLDivElement>(null)

  return (
    <AsyncPicker
      value={value}
      label={label}
      onChange={(id, l) => { setValue(id); setLabel(l) }}
      query={query}
      onQueryChange={setQuery}
      open={open}
      onOpenChange={setOpen}
      containerRef={containerRef}
      results={results}
      isFetching={false}
      getId={(r: Item) => r.id}
      getLabel={(r: Item) => r.name}
      renderResult={(r: Item) => r.name}
      searchPlaceholder="Search..."
      clearAriaLabel="Clear"
      noResultsText="No results"
      dropdownClassName={dropdownClassName}
      isResultDisabled={isResultDisabled}
    />
  )
}

describe('AsyncPicker — dropdown scroll bounds', () => {
  it('the default dropdown className caps height and scrolls, rather than growing unbounded', async () => {
    const results = Array.from({ length: 20 }, (_, i) => ({ id: `id-${i}`, name: `Result ${i}` }))
    render(<Harness results={results} />)

    await userEvent.click(screen.getByPlaceholderText('Search...'))
    const dropdown = (await screen.findByText('Result 0')).closest('div[class*="absolute"]')

    expect(dropdown).not.toBeNull()
    expect(dropdown?.className).toContain('max-h-64')
    expect(dropdown?.className).toContain('overflow-y-auto')
  })

  it('a caller-supplied dropdownClassName overrides the default entirely', async () => {
    const results = [{ id: 'id-1', name: 'Result 1' }]
    render(<Harness results={results} dropdownClassName="custom-dropdown-class" />)

    await userEvent.click(screen.getByPlaceholderText('Search...'))
    const dropdown = (await screen.findByText('Result 1')).closest('div.custom-dropdown-class')

    expect(dropdown).not.toBeNull()
    expect(dropdown?.className).not.toContain('max-h-64')
  })
})

describe('AsyncPicker — per-row isResultDisabled', () => {
  it('a row matching isResultDisabled still renders (for context) but is a disabled button that does not fire onChange', async () => {
    const results = [{ id: 'id-1', name: 'Enabled Result' }, { id: 'id-2', name: 'Disabled Result' }]
    render(<Harness results={results} isResultDisabled={(r) => r.id === 'id-2'} />)

    await userEvent.click(screen.getByPlaceholderText('Search...'))

    const enabledButton = (await screen.findByText('Enabled Result')).closest('button')!
    const disabledButton = (await screen.findByText('Disabled Result')).closest('button')!

    expect(enabledButton).not.toBeDisabled()
    expect(disabledButton).toBeDisabled()

    await userEvent.click(disabledButton)
    // A disabled button can't be clicked at all — still, assert no selection was made.
    expect(screen.queryByPlaceholderText('Search...')).toBeInTheDocument()
  })

  it('with no isResultDisabled supplied, every row stays enabled (existing pickers are unaffected)', async () => {
    const results = [{ id: 'id-1', name: 'Result 1' }]
    render(<Harness results={results} />)

    await userEvent.click(screen.getByPlaceholderText('Search...'))
    const button = (await screen.findByText('Result 1')).closest('button')!

    expect(button).not.toBeDisabled()
  })
})
