import { useRef, useState } from 'react'
import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import AsyncPicker from './AsyncPicker'

interface Item { id: string; name: string }

function Harness({ results, dropdownClassName }: { results: Item[]; dropdownClassName?: string }) {
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
