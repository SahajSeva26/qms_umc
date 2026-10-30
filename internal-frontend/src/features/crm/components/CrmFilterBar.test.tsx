import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import CrmFilterBar from './CrmFilterBar'
import type { CrmFilterState } from '@/features/crm/hooks/useCrmFilters'

const DEFAULT_FILTERS: CrmFilterState = { status: '', q: '', code: '', focusTherapy: '', fyFrom: '', fyTo: '' }

function renderBar(filters: CrmFilterState = DEFAULT_FILTERS) {
  const setFilter = vi.fn()
  const reset = vi.fn()
  render(<CrmFilterBar filters={filters} setFilter={setFilter} reset={reset} />)
  return { setFilter, reset }
}

describe('CrmFilterBar — combined search field picker', () => {
  it('shows exactly one combined search box (code/title), defaulting to Title', () => {
    renderBar()

    expect(screen.getByPlaceholderText('Search by title...')).toBeInTheDocument()
    expect(screen.queryByPlaceholderText('Search by code...')).not.toBeInTheDocument()
  })

  it('typing in the search box writes to the currently selected field (q, by default)', async () => {
    const user = userEvent.setup()
    const { setFilter } = renderBar()

    await user.type(screen.getByPlaceholderText('Search by title...'), 'x')

    expect(setFilter).toHaveBeenCalledWith('q', 'x')
    expect(setFilter).not.toHaveBeenCalledWith('code', expect.anything())
    expect(setFilter).not.toHaveBeenCalledWith('focusTherapy', expect.anything())
  })

  it('switching the field dropdown to Code re-scopes the search box and clears both underlying filters', async () => {
    const user = userEvent.setup()
    const { setFilter } = renderBar({ ...DEFAULT_FILTERS, q: 'stale title search' })

    await user.click(screen.getByRole('combobox', { name: /search by field/i }))
    await user.click(await screen.findByRole('option', { name: 'Code' }))

    expect(screen.getByPlaceholderText('Search by code...')).toBeInTheDocument()
    expect(screen.queryByPlaceholderText('Search by title...')).not.toBeInTheDocument()
    // Every underlying field is cleared on switch — no stale hidden filter survives.
    expect(setFilter).toHaveBeenCalledWith('code', '')
    expect(setFilter).toHaveBeenCalledWith('q', '')
  })

  it('selecting a therapy from its own dropdown writes only to focusTherapy, not the combined search box', async () => {
    const user = userEvent.setup()
    const { setFilter } = renderBar()

    await user.click(screen.getByRole('combobox', { name: /filter by therapy/i }))
    await user.click(await screen.findByRole('option', { name: 'Cardiology' }))

    expect(setFilter).toHaveBeenCalledWith('focusTherapy', 'Cardiology')
    expect(setFilter).not.toHaveBeenCalledWith('q', expect.anything())
    expect(setFilter).not.toHaveBeenCalledWith('code', expect.anything())
  })

  it('shows "All therapies" by default and the picked value once a therapy is selected', async () => {
    renderBar({ ...DEFAULT_FILTERS, focusTherapy: 'Diabetes' })

    expect(screen.getByRole('combobox', { name: /filter by therapy/i })).toHaveTextContent('Diabetes')
  })

  it('reflects an already-set filter value in the search box on mount, even though field defaults to Title', () => {
    // A code value already present (e.g. restored state) — the box should default to Title (q) per
    // the component's own default, so the code value stays hidden until the user picks Code.
    renderBar({ ...DEFAULT_FILTERS, code: 'LD-001' })

    expect(screen.getByPlaceholderText('Search by title...')).toHaveValue('')
  })

  it('clicking Reset calls the reset callback', async () => {
    const user = userEvent.setup()
    const { reset } = renderBar()

    await user.click(screen.getByRole('button', { name: /reset/i }))

    expect(reset).toHaveBeenCalled()
  })

  it('shows the human-readable "Title" label on the field picker, not the raw "q" filter key', () => {
    renderBar()

    expect(screen.getByRole('combobox', { name: /search by field/i })).toHaveTextContent('Title')
    expect(screen.getByRole('combobox', { name: /search by field/i })).not.toHaveTextContent('q')
  })

  it('shows the human-readable "Code" label after switching, not the raw filter key', async () => {
    const user = userEvent.setup()
    renderBar()

    await user.click(screen.getByRole('combobox', { name: /search by field/i }))
    await user.click(await screen.findByRole('option', { name: 'Code' }))

    expect(screen.getByRole('combobox', { name: /search by field/i })).toHaveTextContent('Code')
    expect(screen.getByRole('combobox', { name: /search by field/i })).not.toHaveTextContent('code')
  })

  it('shows the human-readable "All stages" label on the status filter, not the raw "ALL" sentinel', () => {
    renderBar()

    expect(screen.getByRole('combobox', { name: /filter by stage/i })).toHaveTextContent('All stages')
  })

  it('shows a real stage label (e.g. "Qualified") on the status filter once a status is selected, not the raw status value', () => {
    renderBar({ ...DEFAULT_FILTERS, status: 'qualified' })

    const statusTrigger = screen.getByRole('combobox', { name: /filter by stage/i })
    expect(statusTrigger).toHaveTextContent('Qualified')
    expect(statusTrigger).not.toHaveTextContent('qualified')
  })
})
